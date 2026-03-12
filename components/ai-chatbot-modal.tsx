import { Colors } from '@/constants/theme';
import { useChatService, ChatMessage } from '@/lib/services/chatService';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionService } from '@/lib/services/transactionService';
import { useReportService } from '@/lib/services/reportService';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { useCategoryService } from '@/lib/services/categoryService';
import { useTransactionTypeService } from '@/lib/services/transactionTypeService';
import { useSavingGoal } from '@/contexts/saving-goal-context';
import { buildUserContextForAI } from '@/lib/utils/buildUserContext';
import type { CategoryDto, TransactionTypeDto } from '@/lib/types/transaction';
import { MaterialIcons } from '@expo/vector-icons';
import { File, Directory, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  AppState,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

const getReceiptsCacheDir = () => new Directory(Paths.cache, 'FinMate_receipts');

function stripAsterisks(text: string): string {
  return text.replace(/\*+/g, '');
}

const clearReceiptsCache = () => {
  try {
    const dir = getReceiptsCacheDir();
    if (dir.exists) dir.delete();
  } catch (_e) { /* ignore */ }
};

interface DisplayMessage extends ChatMessage {
  imageUri?: string;
}

const SYSTEM_PROMPT_BASE = `Bạn là trợ lý AI tài chính của FinMate. Bạn giúp người dùng:
1. Ghi chép chi tiêu, phân tích tài chính, đưa lời khuyên tiết kiệm
2. QUÉT HÓA ĐƠN: CHỈ khi user gửi KÈM ẢNH (có đính kèm hình) — mới đọc ảnh và trích xuất. Khi user CHỈ gửi chữ (text thuần, không có ảnh): KHÔNG BAO GIỜ trả format trích xuất, KHÔNG output [FINMATE_EXTRACT]; trả lời bình thường. Tin nhắn ngắn/khó hiểu (vd: "t", "a"): hỏi "Bạn muốn hỏi gì ạ?" hoặc gợi ý nhẹ.
   Khi CÓ ẢNH hóa đơn — trích xuất:

   HOÁ ĐƠN ĐIỆN TỬ (từ app, email, ảnh màn hình):
   - Tìm các trường: "Tổng tiền", "Thành tiền", "Tổng cộng", "Số tiền", "Thanh toán", "Grand Total", "Total Amount", "Phải thu"
   - Lấy số tiền SAU CÙNG (sau giảm giá, sau thuế) — thường là số lớn nhất hoặc có gạch dưới
   - Tìm ngày: "Ngày tạo", "Ngày mua", "Ngày xuất HĐ", "Date", "Invoice Date"

   HOÁ ĐƠN GIẤY / BÁN LẺ (ảnh chụp hoá đơn in):
   - Tìm các trường: "Phải thu (VND)", "Tổng giá trị", "Tổng cộng", "TỔNG CỘNG", "TOTAL"
   - Lấy số tiền ở cuối hoá đơn (thường là dòng cuối cùng trước barcode)
   - Tìm ngày: dòng đầu hoá đơn hoặc gần tên cửa hàng

   BILL CHUYỂN KHOẢN / BIẾN ĐỘNG SỐ DƯ NGÂN HÀNG VIỆT NAM:
   - Nhận diện các app/ngân hàng phổ biến: Vietcombank, VietinBank, BIDV, Agribank, Techcombank, VPBank, MB Bank, ACB, TPBank, Sacombank, HDBank, OCB, MSB, VIB, SHB, Shinhan, SeABank... và các ngân hàng VN khác
   - Dấu hiệu thành công thường gặp: "Giao dịch thành công", "Chuyển khoản thành công", "Thanh toán thành công", "Transfer successful", "Success"
   - ƯU TIÊN tìm số tiền đi cùng các nhãn: "Số tiền", "Số tiền giao dịch", "Số tiền chuyển", "Số tiền thanh toán", "Giá trị giao dịch", "Amount", "Transfer amount", "Payment amount", "Tổng tiền"
   - Nếu KHÔNG có nhãn rõ cho amount, ưu tiên lấy con số tiền lớn, nổi bật, nằm ngay dưới tiêu đề giao dịch hoặc dưới trạng thái thành công ở phần đầu màn hình
   - Tìm ngày giờ ở các nhãn: "Ngày GD", "Ngày giao dịch", "Thời gian", "Thời gian giao dịch", "Transaction time", "Transaction date", "Ngày tạo lệnh"
   - KHÔNG lấy nhầm các số sau làm amount: "Số dư", "Số dư còn lại", "Available balance", "Số tài khoản", "Mã giao dịch", "Mã tham chiếu", "Reference", "Phí", "Fee"
   - Nếu ảnh có nhiều số tiền, chọn số gắn trực tiếp với giao dịch vừa thành công, không chọn số dư còn lại
   - Với ảnh kiểu app banking, amount thường là số to nhất ở card đầu hoặc ở giữa màn hình; ưu tiên số đó hơn các số trong phần chi tiết bên dưới

   BILL CHUYỂN KHOẢN MOMO:
   - Nhận diện các cụm: "MoMo", "Ví MoMo", "Chuyển tiền thành công", "Giao dịch thành công", "Thanh toán thành công"
   - ƯU TIÊN amount ở các nhãn: "Số tiền", "Số tiền chuyển", "Tổng tiền", "Giá trị giao dịch"
   - Nếu không có nhãn "Số tiền", ưu tiên số tiền lớn hiển thị trong card đầu tiên ngay dưới tiêu đề như "CHUYỂN TIỀN", "THANH TOÁN", "NHẬN TIỀN"
   - Tìm ngày giờ ở các nhãn: "Thời gian", "Thời gian giao dịch", "Ngày giao dịch"
   - Bỏ qua: "Mã giao dịch", "Mã đơn hàng", "Số dư ví", "Phí", "Nguồn tiền"
   - Với MoMo, nếu thấy dạng "16:30 - 09/03/2026" thì date phải lấy phần ngày "09/03/2026", bỏ phần giờ

   BILL CHUYỂN KHOẢN VNPAY / VNPAY QR:
   - Nhận diện các cụm: "VNPAY", "VNPay", "VNPAY QR", "Thanh toán thành công", "Giao dịch thành công", "Chuyển tiền thành công"
   - ƯU TIÊN amount ở các nhãn: "Số tiền", "Số tiền thanh toán", "Giá trị giao dịch", "Amount", "Tổng tiền"
   - Tìm ngày giờ ở các nhãn: "Thời gian giao dịch", "Ngày giao dịch", "Transaction time", "Transaction date"
   - Bỏ qua: "Mã giao dịch", "Mã tham chiếu", "Mã đơn hàng", "Order ID", "Phí", "Số dư"

   BILL CỬA HÀNG TIỆN LỢI (giấy + điện tử):
   - Circle K: bill giấy, email, app — tìm "Total", "Tổng", "Date", "Store"
   - Family Mart: bill giấy, điện tử — "合計", "Total", "Tổng", ngày giao dịch
   - Mini Stop: bill giấy, màn hình — "Total", "Tổng cộng", thời gian
   - GS25: bill giấy, app — "Total", "합계", "Tổng", ngày
   - Seven Eleven (7-Eleven): bill giấy, email, app — "Total", "Tổng", "Date", "Store"

   LUÔN LUÔN:
   - Trả lời NGAY số tiền và ngày, KHÔNG hỏi lại hay yêu cầu upload thêm
   - Mục tiêu quan trọng nhất khi scan bill chuyển khoản là lấy đúng 2 field: amount và date
   - amount phải là số nguyên VND: bỏ dấu chấm, dấu phẩy, ký hiệu "đ", "VND", không lấy số tài khoản, số dư, mã giao dịch, phí
   - Nếu amount hiển thị có dấu âm như "-70,000đ" hoặc "-2.939.000đ", hiểu đó là giao dịch tiền ra nhưng output amount vẫn là số dương: 70000, 2939000
   - Nếu ảnh có cả ngày và giờ, output date dạng DD/MM/YYYY; bỏ phần giờ khỏi field date
   - Nếu thấy các biến thể OCR gần giống như "So tien", "S0 tien", "S6 tien", "Ngay GD", "Thdi gian" thì vẫn hiểu là "Số tiền", "Ngày GD", "Thời gian"
   - Nếu ảnh là màn hình app và amount nằm ở phần header/card đầu còn phần dưới là danh sách chi tiết, luôn ưu tiên amount ở phần header/card đầu
   - Với bill chuyển khoản, content ưu tiên ghi ngắn gọn dạng: "Chuyển khoản", "Chuyển khoản MoMo", "Thanh toán VNPAY", hoặc tên cửa hàng/người nhận nếu đọc rõ
   - Sau khi đọc xong ảnh và đã có amount + date, hãy hỏi thêm đúng 1 câu xác nhận: "Bạn có muốn lưu số tiền này vào mục chi không?"
   - CHỈ hỏi xác nhận lưu, KHÔNG nói đã lưu thành công trước khi user xác nhận
   - Format hiển thị:
     💰 Số tiền: [X] VND
     📅 Ngày: [DD/MM/YYYY hoặc ghi "không rõ"]
     🧾 Nội dung: [tóm tắt ngắn — tên cửa hàng / loại giao dịch]
   - Sau phần trả lời, BẮT BUỘC thêm 1 dòng để app tự điền form Nhập thủ công:
     [FINMATE_EXTRACT]{"amount":SỐ_NGUYÊN,"date":"DD/MM/YYYY","content":"chuỗi"}[/FINMATE_EXTRACT]
     amount=số tiền (VD 125000), date=DD/MM/YYYY (không rõ thì dùng hôm nay), content=tên cửa hàng/loại (max 200 ký tự)
   - Thiếu field: nếu không đọc được số tiền dùng amount:0; không rõ ngày dùng hôm nay; content để trống nếu không có

3. Lập lộ trình tiêu dùng: ví dụ user muốn mua iPhone 17 Pro Max 52 triệu, lương 18tr/tháng, mua trong 5 tháng → tính mỗi ngày cần để dành bao nhiêu
4. Giới thiệu app: FinMate là app quản lý tài chính cá nhân - theo dõi chi tiêu, tiết kiệm, báo cáo, gợi ý mục tiêu
5. Tư vấn tiết kiệm & tài chính: trả lời mọi câu hỏi về tiết kiệm tiền (50/30/20, quỹ khẩn cấp, đầu tư cơ bản...), quản lý thu chi, nợ, tài chính cá nhân

6. Khi được cung cấp DỮ LIỆU THU CHI VÀ MỤC TIÊU TIẾT KIỆM (userContext) bên dưới, BẮT BUỘC dùng dữ liệu đó để:
   - Phân tích, phát hiện chi tiêu bất hợp lý, đưa ra nhận xét và khuyến nghị cụ thể
   - Trả lời chính xác câu hỏi về mục tiêu: VD "tôi đã hoàn thành mấy mục tiêu?" → trả số từ userContext (Đã hoàn thành: X). "có bao nhiêu mục tiêu đang theo đuổi?" → trả số từ userContext
   KHÔNG nói "không có dữ liệu" nếu đã có userContext.

7. TẠO MỤC TIÊU TIẾT KIỆM TỪ HỘI THOẠI:
   - Khi user mô tả ý định tiết kiệm (VD: "lương 18tr, muốn mua iPhone 52 triệu trong 5 tháng", "tôi lương 15 triệu muốn mua laptop 25 triệu") → AI tóm tắt lại (tên mục tiêu, số tiền, lương, thời gian) và hỏi: "Bạn có muốn lập mục tiêu này không?"
   - Khi user xác nhận (Yes, Có, Đồng ý, Ok, Lập đi...) → AI trả lời ngắn gọn chúc mừng và THÊM dòng sau (ẩn khỏi nội dung hiển thị):
     [FINMATE_CREATE_GOAL]{"title":"tên mục tiêu","targetAmount":SỐ_NGUYÊN,"salary":SỐ_NGUYÊN,"daysToAchieve":SỐ_NGUYÊN,"dailyEssential":SỐ_NGUYÊN,"category":"Mua sắm"}[/FINMATE_CREATE_GOAL]
     title=ngắn gọn (VD "iPhone 17 Pro Max"), targetAmount=số tiền mục tiêu, salary=thu nhập/tháng, daysToAchieve=số ngày, dailyEssential=chi thiết yếu/ngày (mặc định 50000 nếu không rõ), category="Mua sắm"|"Du lịch"|"Khác"

QUY TẮC CẤM (KHÔNG VI PHẠM):
- CẤM sử dụng dấu * (sao) trong mọi trường hợp: không *, không **, không ***. App sẽ tự xóa nếu vi phạm.
- CẤM bảng markdown, dấu --- dài

ĐỊNH DẠNG TRẢ LỜI (BẮT BUỘC):
- CHỈ được dùng dấu "-" để liệt kê (vd: - Mục 1)
- CHỈ dùng chữ cái alphabet, số, dấu câu thông thường
- Có thể dùng vài icon minh họa nhẹ (💰 📅 📊 ✅ ⚠️) nhưng không lạm dụng
- Phân tách: xuống dòng hoặc "——" ngắn
- Trả lời gọn, rõ ràng, thân thiện bằng tiếng Việt`;


const FINMATE_EXTRACT_REGEX = /\[FINMATE_EXTRACT\]([\s\S]*?)\[\/FINMATE_EXTRACT\]/;
const FINMATE_CREATE_GOAL_REGEX = /\[FINMATE_CREATE_GOAL\]([\s\S]*?)\[\/FINMATE_CREATE_GOAL\]/;

function stripCreateGoalTag(text: string): string {
  return text.replace(FINMATE_CREATE_GOAL_REGEX, '').replace(/\s*\n\s*\n/g, '\n\n').trim();
}

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeReceiptDate(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) {
    return new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  const ddmmyyyy = value.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${day}/${month}/${year}`;
  }

  const yyyymmdd = value.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (yyyymmdd) {
    const year = yyyymmdd[1];
    const month = yyyymmdd[2].padStart(2, '0');
    const day = yyyymmdd[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  return new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function parseReceiptDateToIso(dateStr: string): string {
  const normalized = normalizeReceiptDate(dateStr);
  const [day, month, year] = normalized.split('/');
  const d = parseInt(day, 10);
  const m = parseInt(month, 10) - 1;
  const y = parseInt(year, 10);
  const date = new Date(y, m, d, 12, 0, 0, 0);
  return date.toISOString();
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

function isReceiptSaveConfirmation(text: string): boolean {
  const value = normalizeText(text);
  return [
    'co',
    'ok',
    'yes',
    'y',
    'luu',
    'luu di',
    'luu nhe',
    'luu ngay',
    'dong y',
    'xac nhan',
    'them di',
    'save',
    'save it',
  ].includes(value);
}

function isReceiptEditIntent(text: string): boolean {
  const value = normalizeText(text);
  return value.includes('chinh') || value.includes('sua') || value.includes('thu cong') || value.includes('manual');
}

function isReceiptCancelIntent(text: string): boolean {
  const value = normalizeText(text);
  return ['khong', 'ko', 'khong luu', 'huy', 'thoi', 'no', 'cancel'].includes(value);
}

interface CreateGoalPayload {
  title: string;
  targetAmount: number;
  salary: number;
  daysToAchieve: number;
  dailyEssential: number;
  category: string;
}

interface ReceiptExtractPayload {
  amount: number;
  date: string;
  content: string;
}

interface PendingReceiptDraft extends ReceiptExtractPayload {
  transactionTypeId: string;
  transactionTypeName: string;
  moneySourceId: string;
  moneySourceName: string;
  categoryId: string;
  categoryName: string;
  transactionDateIso: string;
}

function parseCreateGoal(text: string): CreateGoalPayload | null {
  const m = text.match(FINMATE_CREATE_GOAL_REGEX);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[1].trim());
    const targetAmount = typeof obj.targetAmount === 'number' ? obj.targetAmount : parseInt(String(obj.targetAmount || 0), 10);
    const salary = typeof obj.salary === 'number' ? obj.salary : parseInt(String(obj.salary || 0), 10);
    const daysToAchieve = typeof obj.daysToAchieve === 'number' ? obj.daysToAchieve : parseInt(String(obj.daysToAchieve || 90), 10);
    const dailyEssential = typeof obj.dailyEssential === 'number' ? obj.dailyEssential : parseInt(String(obj.dailyEssential || 50000), 10);
    const title = String(obj.title || '').trim() || 'Mục tiêu mới';
    const category = String(obj.category || 'Khác').trim() || 'Khác';
    if (!targetAmount || targetAmount <= 0 || !title) return null;
    return { title, targetAmount, salary, daysToAchieve, dailyEssential, category };
  } catch {
    return null;
  }
}

function parseReceiptExtract(text: string): ReceiptExtractPayload | null {
  const m = text.match(FINMATE_EXTRACT_REGEX);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[1].trim());
    const rawAmount = typeof obj.amount === 'number' ? obj.amount : parseInt(String(obj.amount || 0), 10);
    const amount = Math.abs(Number.isFinite(rawAmount) ? rawAmount : 0);
    const date = normalizeReceiptDate(String(obj.date || '').trim());
    const content = String(obj.content || '').trim().slice(0, 200);
    return { amount, date, content };
  } catch {
    return null;
  }
}

function pickExpenseType(types: TransactionTypeDto[]): TransactionTypeDto | null {
  return types.find((t) => normalizeText(t.name) === 'chi tieu')
    || types.find((t) => !t.isIncome && !normalizeText(t.name).includes('vay'))
    || types[0]
    || null;
}

function pickReceiptCategory(categories: CategoryDto[], content: string): CategoryDto | null {
  if (!categories.length) return null;

  const normalizedContent = normalizeText(content);
  const categoryName = (c: CategoryDto) => normalizeText(c.name);
  const includesAny = (text: string, keywords: string[]) => keywords.some((k) => text.includes(k));

  const pickByKeywords = (contentKeywords: string[], categoryKeywords: string[]) => {
    if (!includesAny(normalizedContent, contentKeywords)) return null;
    return categories.find((c) => includesAny(categoryName(c), categoryKeywords)) || null;
  };

  return pickByKeywords(['an', 'uong', 'tra sua', 'ca phe', 'com', 'bun', 'pho'], ['an uong', 'do an', 'thuc an', 'do uong'])
    || pickByKeywords(['grab', 'be', 'xang', 'xe', 'di chuyen'], ['di chuyen', 'xang xe', 'giao thong'])
    || pickByKeywords(['dien', 'nuoc', 'internet', 'wifi', 'dien thoai'], ['hoa don', 'dien nuoc', 'dien', 'nuoc', 'internet'])
    || pickByKeywords(['shopee', 'lazada', 'tiki', 'mua', 'shopping'], ['mua sam', 'shopping'])
    || pickByKeywords(['chuyen khoan', 'momo', 'vnpay', 'zalo'], ['chuyen tien', 'khac', 'chi khac'])
    || categories.find((c) => ['chi khac', 'khac', 'other'].includes(categoryName(c)))
    || categories[0];
}

interface AIChatbotModalProps {
  visible: boolean;
  onClose: () => void;
  /** Tin nhắn sẵn có khi mở (từ AI Assistant card, voice input...) */
  initialMessage?: string;
  /** Nếu true: tự động gửi initialMessage ngay khi mở (dùng cho "Tìm hiểu thêm") */
  autoSend?: boolean;
  /** Nhúng trực tiếp vào màn hình (không dùng modal). Dùng cho tab AI Assistant */
  embedded?: boolean;
  /** Gọi khi quét hóa đơn nhưng thiếu field / chưa trích xuất được (để hiện chấm đỏ nút chat) */
  onMissingFieldsShown?: () => void;
}

export function AIChatbotModal({ visible, onClose, initialMessage, autoSend, embedded, onMissingFieldsShown }: AIChatbotModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const { sendMessage } = useChatService();
  const { getTransactions, createTransaction } = useTransactionService();
  const { getOverview } = useReportService();
  const { getGroupedMoneySources, getMoneySources } = useMoneySourceService();
  const { getCategories } = useCategoryService();
  const { getTransactionTypes } = useTransactionTypeService();
  const { goals, addGoal } = useSavingGoal();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      role: 'assistant',
      content:
        'Xin chào! Tôi là trợ lý AI tài chính FinMate. Bạn có thể hỏi về app, tư vấn tài chính, lập lộ trình tiêu dùng, hoặc nhấn 📷 để quét hóa đơn.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [pendingReceipt, setPendingReceipt] = useState<PendingReceiptDraft | null>(null);
  const [fullscreenImageUri, setFullscreenImageUri] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const autoSentRef = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') clearReceiptsCache();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if ((visible || embedded) && messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [visible, embedded, messages]);

  useEffect(() => {
    if (pendingReceipt) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [pendingReceipt]);

  useEffect(() => {
    if ((visible || embedded) && initialMessage?.trim()) {
      setMessage(initialMessage);
      if (autoSend && !autoSentRef.current) {
        autoSentRef.current = true;
        const userMsg: DisplayMessage = { role: 'user', content: initialMessage.trim() };
        setMessages((prev) => [...prev, userMsg]);
        setMessage('');
        sendChat(userMsg);
      }
    }
    if (!visible) autoSentRef.current = false;
  }, [visible, initialMessage, autoSend]);

  const buildPendingReceiptDraft = async (extracted: ReceiptExtractPayload): Promise<PendingReceiptDraft | null> => {
    const [transactionTypes, moneySources] = await Promise.all([
      getTransactionTypes(),
      getMoneySources(),
    ]);
    const transactionType = pickExpenseType(transactionTypes);
    const moneySource = moneySources[0] || null;
    if (!transactionType || !moneySource) return null;

    const categories = await getCategories(transactionType.id);
    const category = pickReceiptCategory(categories, extracted.content);
    if (!category) return null;

    return {
      ...extracted,
      transactionTypeId: transactionType.id,
      transactionTypeName: transactionType.name,
      moneySourceId: moneySource.id,
      moneySourceName: moneySource.name,
      categoryId: category.id,
      categoryName: category.name,
      transactionDateIso: parseReceiptDateToIso(extracted.date),
    };
  };

  const openManualInputForReceipt = (draft: ReceiptExtractPayload | PendingReceiptDraft) => {
    setPendingReceipt(null);
    if (!embedded) onClose();
    router.push({
      pathname: '/(protected)/(tabs)/manual-input',
      params: {
        amount: String(draft.amount),
        date: draft.date,
        description: draft.content,
      },
    });
  };

  const confirmSavePendingReceipt = async () => {
    if (!pendingReceipt || savingReceipt) return;
    try {
      setSavingReceipt(true);
      await createTransaction({
        transactionTypeId: pendingReceipt.transactionTypeId,
        moneySourceId: pendingReceipt.moneySourceId,
        categoryId: pendingReceipt.categoryId,
        amount: pendingReceipt.amount,
        transactionDate: pendingReceipt.transactionDateIso,
        description: pendingReceipt.content || undefined,
        isBorrowingForThis: false,
        isFee: false,
        excludeFromReport: false,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Đã lưu thành công.',
        },
      ]);
      setPendingReceipt(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu giao dịch';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ Không thể lưu tự động. ${msg}` },
      ]);
    } finally {
      setSavingReceipt(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    }
  };

  const declinePendingReceipt = () => {
    if (!pendingReceipt) return;
    setPendingReceipt(null);
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: 'Bạn có cần mình giúp gì nữa không?' },
    ]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const sendChat = async (userMsg: DisplayMessage, options?: { imageBase64?: string; imageFormat?: 'png' | 'jpeg' }) => {
    setLoading(true);
    try {
      let userContext = '';
      try {
        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const [txRes, overviewRes, balanceRes] = await Promise.all([
          getTransactions({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            page: 1,
            pageSize: 100,
          }),
          getOverview(monthStart, endDate),
          getGroupedMoneySources().catch(() => ({ totalBalance: 0 })),
        ]);
        userContext = buildUserContextForAI(
          txRes?.transactions ?? [],
          overviewRes ?? null,
          balanceRes?.totalBalance,
          goals ?? []
        );
      } catch (_e) {
        userContext = '';
      }

      const chatHistory: ChatMessage[] = [
        ...messages.filter((m) => m.role !== 'system'),
        userMsg,
      ];
      const fullSystemPrompt = userContext
        ? `${SYSTEM_PROMPT_BASE}

=== DỮ LIỆU THU CHI CỦA USER (dùng để phân tích, phát hiện bất hợp lý) ===
${userContext}
`
        : SYSTEM_PROMPT_BASE;

      const reply = await sendMessage(chatHistory, {
        systemPrompt: fullSystemPrompt,
        imageBase64: options?.imageBase64,
        imageFormat: options?.imageFormat,
      });
      const displayContent = stripCreateGoalTag(stripAsterisks(reply));
      setMessages((prev) => [...prev, { role: 'assistant', content: displayContent }]);

      const createGoalPayload = parseCreateGoal(reply);
      if (createGoalPayload) {
        try {
          await addGoal({
            title: createGoalPayload.title,
            targetAmount: createGoalPayload.targetAmount,
            salary: createGoalPayload.salary,
            daysToAchieve: createGoalPayload.daysToAchieve,
            dailyEssential: createGoalPayload.dailyEssential,
            category: createGoalPayload.category,
          });
          Alert.alert('Thành công', `Đã thêm mục tiêu "${createGoalPayload.title}" vào danh sách của bạn.`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Không thể tạo mục tiêu';
          Alert.alert('Lỗi', msg);
        }
      }

      if (options?.imageBase64) {
        const extracted = parseReceiptExtract(reply);
        if (extracted) {
          const missing: string[] = [];
          if (!extracted.amount || extracted.amount <= 0) missing.push('Số tiền');
          if (!extracted.date) missing.push('Ngày');
          if (missing.length > 0) {
            setPendingReceipt(null);
            onMissingFieldsShown?.();
            Alert.alert(
              'Thiếu thông tin',
              `Không đọc được: ${missing.join(', ')}. Vui lòng mở Nhập thủ công để điền bổ sung.`,
              [{ text: 'Nhập thủ công', onPress: () => openManualInputForReceipt(extracted) }, { text: 'Đóng', style: 'cancel' }]
            );
          } else {
            const draft = await buildPendingReceiptDraft(extracted);
            if (draft) {
              setPendingReceipt(draft);
              if (!normalizeText(displayContent).includes('luu')) {
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: 'Bạn có muốn lưu số tiền này vào mục chi không?',
                  },
                ]);
              }
            } else {
              onMissingFieldsShown?.();
              Alert.alert(
                'Cần bổ sung thông tin',
                'Chưa xác định được tài khoản hoặc hạng mục mặc định để lưu tự động. App sẽ mở form đã điền sẵn để bạn kiểm tra lại.',
                [{ text: 'Mở form', onPress: () => openManualInputForReceipt(extracted) }, { text: 'Đóng', style: 'cancel' }]
              );
            }
          }
          return;
        }
        setPendingReceipt(null);
        onMissingFieldsShown?.();
        Alert.alert('Chưa trích xuất được', 'App sẽ mở form Nhập thủ công. Bạn cần chọn Tài khoản và Hạng mục rồi lưu.', [
          { text: 'Mở form', onPress: () => openManualInputForReceipt({ amount: 0, date: normalizeReceiptDate(''), content: 'Từ ảnh hóa đơn' }) },
          { text: 'Ở lại', style: 'cancel' },
        ]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối. Kiểm tra API và MEGALLM_API_KEY trên Finmate-BE.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${msg}` },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!text || loading || savingReceipt) return;
    const userMsg: DisplayMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    if (pendingReceipt && isReceiptSaveConfirmation(text)) {
      await confirmSavePendingReceipt();
      return;
    }
    if (pendingReceipt && isReceiptEditIntent(text)) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Mình sẽ mở form đã điền sẵn để bạn chỉnh lại trước khi lưu.' },
      ]);
      openManualInputForReceipt(pendingReceipt);
      return;
    }
    if (pendingReceipt && isReceiptCancelIntent(text)) {
      declinePendingReceipt();
      return;
    }
    await sendChat(userMsg);
  };

  const pickImageFromSource = async (source: 'camera' | 'library') => {
    if (loading) return;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '⚠️ Cần quyền truy cập camera để chụp hóa đơn.' },
        ]);
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '⚠️ Cần quyền truy cập thư viện ảnh để quét hóa đơn.' },
        ]);
        return;
      }
    }
    const launcher = source === 'camera'
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
      base64: true,
      exif: false,
    };
    if (source === 'library') {
      // allowsMultipleSelection=true bỏ qua allowsEditing → không có khung cắt
      pickerOptions.allowsMultipleSelection = true;
      pickerOptions.selectionLimit = 1;
    }
    const result = await launcher(pickerOptions);
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    // Resize & compress ảnh để giảm kích thước gửi lên
    // Hỗ trợ PNG và JPEG
    const uriLower = (asset.uri ?? '').toLowerCase();
    const isPng = uriLower.endsWith('.png') || (asset.fileName ?? '').toLowerCase().endsWith('.png');
    const outputFormat = isPng ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG;
    const imageFormat: 'png' | 'jpeg' = isPng ? 'png' : 'jpeg';

    let base64: string | undefined | null = null;
    let cacheUri: string | undefined;
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.5, format: outputFormat, base64: true }
      );
      base64 = manipulated.base64;
      if (manipulated.uri) {
        const cacheDir = getReceiptsCacheDir();
        cacheDir.create({ intermediates: true, idempotent: true });
        const ext = isPng ? 'png' : 'jpg';
        const destFile = new File(cacheDir, `receipt_${Date.now()}.${ext}`);
        new File(manipulated.uri).copy(destFile);
        cacheUri = destFile.uri;
      }
    } catch (_e) {
      base64 = asset.base64;
    }

    if (!base64 || base64.length < 5000) {
      try {
        if (asset.uri) {
          base64 = await new File(asset.uri).base64();
        }
      } catch (_e) {
        /* fallback failed */
      }
    }

    if (!base64 || base64.length < 5000) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Không đọc được ảnh (có thể ảnh đang tải từ iCloud). Hãy thử chụp ảnh trực tiếp bằng camera hoặc đợi ảnh tải xong rồi chọn lại.' },
      ]);
      return;
    }
    const userMsg: DisplayMessage = {
      role: 'user',
      content: 'Đây là ảnh hóa đơn của tôi. Hãy đọc ảnh và cho biết ngay: số tiền thanh toán và ngày. Có thể là hóa đơn điện tử hoặc hóa đơn giấy.',
      imageUri: cacheUri,
    };
    setMessages((prev) => [...prev, userMsg]);
    await sendChat(userMsg, { imageBase64: base64, imageFormat });
  };

  const handleScanReceipt = () => {
    if (loading) return;
    Alert.alert(
      'Quét hóa đơn',
      'Chọn cách lấy ảnh hóa đơn. Chụp trực tiếp thường rõ hơn và tránh lỗi ảnh iCloud.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Chụp ảnh', onPress: () => pickImageFromSource('camera') },
        { text: 'Chọn từ thư viện', onPress: () => pickImageFromSource('library') },
      ]
    );
  };

  const renderContent = () => (
    <>
    <View style={[styles.modalOverlay, embedded && styles.embeddedOverlay]}>
      <KeyboardAvoidingView
          style={[styles.keyboardView, embedded && styles.keyboardViewEmbedded]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            {/* Header */}
            <LinearGradient
              colors={['#16a34a', '#22c55e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.header, { paddingTop: insets.top + 8 }]}>
              <View style={styles.headerInner}>
                <View style={styles.headerIconWrap}>
                  <MaterialIcons name="chat-bubble-outline" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.headerTextWrap}>
                  <Text style={styles.headerTitle}>AI Trợ lý tài chính</Text>
                  <Text style={styles.headerSubtitle}>FinMate • Luôn sẵn sàng hỗ trợ</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.7}>
                  <MaterialIcons name={embedded ? 'arrow-back' : 'close'} size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Quick actions (chỉ hiện khi chưa có tin nhắn user) */}
            {messages.filter((m) => m.role === 'user').length === 0 && (
              <View style={[styles.quickActions, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.quickLabel, { color: themeColors.textSecondary }]}>Gợi ý nhanh</Text>
                <View style={styles.quickChips}>
                  <TouchableOpacity
                    onPress={() => setMessage('FinMate là gì?')}
                    style={[styles.chip, { backgroundColor: themeColors.background }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}>
                    <Text style={[styles.chipText, { color: themeColors.text }]}>FinMate là gì?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setMessage('Quy tắc 50/30/20 là gì?')}
                    style={[styles.chip, { backgroundColor: themeColors.background }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}>
                    <Text style={[styles.chipText, { color: themeColors.text }]}>50/30/20</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleScanReceipt}
                    style={[styles.chip, styles.chipPrimary]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}>
                    <MaterialIcons name="receipt-long" size={16} color="#FFFFFF" />
                    <Text style={styles.chipTextPrimary}>Quét hóa đơn</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Chat */}
            <ScrollView
              ref={scrollRef}
              style={[styles.chatArea, { backgroundColor: themeColors.background }]}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
              {messages.map((m, i) => (
                <View
                  key={i}
                  style={[
                    styles.messageRow,
                    m.role === 'user' ? styles.userRow : styles.assistantRow,
                  ]}>
                  {m.role === 'assistant' && (
                    <View style={[styles.avatarSmall, { backgroundColor: 'rgba(22, 163, 74, 0.15)' }]}>
                      <MaterialIcons name="chat-bubble-outline" size={18} color="#16a34a" />
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      m.role === 'user'
                        ? [styles.userBubble, styles.bubbleShadow]
                        : [styles.assistantBubble, { backgroundColor: themeColors.card }],
                    ]}>
                    {(m as DisplayMessage).imageUri ? (
                      <>
                        <TouchableOpacity
                          style={styles.receiptImageWrap}
                          onPress={() => setFullscreenImageUri((m as DisplayMessage).imageUri!)}
                          activeOpacity={0.9}>
                          <Image
                            source={{ uri: (m as DisplayMessage).imageUri }}
                            style={styles.receiptImage}
                            contentFit="cover"
                          />
                        </TouchableOpacity>
                        <Text
                          style={[
                            styles.bubbleText,
                            styles.receiptCaption,
                            { color: m.role === 'user' ? 'rgba(255,255,255,0.9)' : themeColors.textSecondary },
                          ]}
                          selectable>
                          {m.role === 'assistant' ? stripAsterisks(m.content) : m.content}
                        </Text>
                      </>
                    ) : (
                      <Text
                        style={[
                          styles.bubbleText,
                          { color: m.role === 'user' ? '#FFFFFF' : themeColors.text },
                        ]}
                        selectable>
                        {m.role === 'assistant' ? stripAsterisks(m.content) : m.content}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              {loading && (
                <View style={[styles.messageRow, styles.assistantRow]}>
                  <View style={[styles.avatarSmall, { backgroundColor: 'rgba(22, 163, 74, 0.15)' }]}>
                    <MaterialIcons name="chat-bubble-outline" size={18} color="#16a34a" />
                  </View>
                  <View
                    style={[
                      styles.bubble,
                      styles.assistantBubble,
                      styles.loadingBubble,
                      { backgroundColor: themeColors.card },
                    ]}>
                    <ActivityIndicator size="small" color="#16a34a" />
                    <Text style={[styles.bubbleText, { color: themeColors.textSecondary, marginLeft: 10 }]}>
                      Đang xử lý...
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {pendingReceipt && (
              <View style={[styles.receiptConfirmWrap, { borderTopColor: themeColors.border, backgroundColor: themeColors.card }]}>
                <View style={styles.receiptConfirmHeader}>
                  <View style={styles.receiptConfirmIcon}>
                    <MaterialIcons name="receipt-long" size={18} color="#16a34a" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.receiptConfirmTitle, { color: themeColors.text }]}>Sẵn sàng lưu giao dịch</Text>
                    <Text style={[styles.receiptConfirmSubtitle, { color: themeColors.textSecondary }]}>
                      FinMate sẽ lưu nhanh bằng cấu hình mặc định. Bạn chỉ cần chọn Có hoặc Không ngay trong chat.
                    </Text>
                  </View>
                </View>

                <View style={[styles.receiptSummaryCard, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                  <Text style={styles.receiptAmount}>{formatCurrency(pendingReceipt.amount)}</Text>
                  <Text style={[styles.receiptSummaryText, { color: themeColors.text }]}>Lưu vào mục chi ngày {pendingReceipt.date}</Text>
                  <Text style={[styles.receiptSummaryText, { color: themeColors.textSecondary }]}>
                    Nội dung: {pendingReceipt.content || 'Từ ảnh hóa đơn'}
                  </Text>
                  <Text style={[styles.receiptSummaryMeta, { color: themeColors.textSecondary }]}>
                    Tài khoản mặc định: {pendingReceipt.moneySourceName}
                  </Text>
                  <Text style={[styles.receiptSummaryMeta, { color: themeColors.textSecondary }]}>
                    Hạng mục mặc định: {pendingReceipt.categoryName}
                  </Text>
                </View>

                <View style={styles.receiptActionRow}>
                  <TouchableOpacity
                    style={[styles.receiptSecondaryBtn, { borderColor: themeColors.border, backgroundColor: themeColors.background }]}
                    onPress={() => {
                      setMessages((prev) => [...prev, { role: 'user', content: 'Không' }]);
                      declinePendingReceipt();
                    }}
                    activeOpacity={0.7}
                    disabled={savingReceipt}>
                    <Text style={[styles.receiptSecondaryBtnText, { color: themeColors.text }]}>Không</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.receiptPrimaryBtn, savingReceipt && { opacity: 0.7 }]}
                    onPress={async () => {
                      setMessages((prev) => [...prev, { role: 'user', content: 'Có' }]);
                      await confirmSavePendingReceipt();
                    }}
                    activeOpacity={0.85}
                    disabled={savingReceipt}>
                    <LinearGradient
                      colors={['#16a34a', '#22c55e']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.receiptPrimaryBtnGradient}>
                      {savingReceipt ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <MaterialIcons name="check-circle-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.receiptPrimaryBtnText}>Có</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Input */}
            <View style={[styles.inputBar, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
              <TouchableOpacity
                style={[styles.scanBtn, { backgroundColor: themeColors.background }]}
                onPress={handleScanReceipt}
                disabled={loading || savingReceipt}
                activeOpacity={0.7}>
                <MaterialIcons name="receipt-long" size={22} color="#16a34a" />
              </TouchableOpacity>
              <TextInput
                style={[styles.textInput, { backgroundColor: themeColors.background, color: themeColors.text }]}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor={themeColors.textSecondary}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
                editable={!loading && !savingReceipt}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!message.trim() || loading || savingReceipt) && styles.sendBtnDisabled]}
                onPress={handleSend}
                activeOpacity={0.7}
                disabled={!message.trim() || loading || savingReceipt}>
                <LinearGradient
                  colors={message.trim() && !loading && !savingReceipt ? ['#16a34a', '#22c55e'] : ['#9ca3af', '#6b7280']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendBtnGradient}>
                  <MaterialIcons name="send" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Fullscreen xem ảnh hóa đơn */}
      <Modal
        visible={!!fullscreenImageUri}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImageUri(null)}>
        <TouchableOpacity
          style={styles.fullscreenOverlay}
          activeOpacity={1}
          onPress={() => setFullscreenImageUri(null)}>
          {fullscreenImageUri ? (
            <Image
              source={{ uri: fullscreenImageUri }}
              style={styles.fullscreenImage}
              contentFit="contain"
            />
          ) : null}
        </TouchableOpacity>
      </Modal>
    </>
  );

  if (embedded) return renderContent();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      {renderContent()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  embeddedOverlay: {
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
  },
  keyboardView: {
    height: '66.67%',
  },
  keyboardViewEmbedded: {
    height: undefined,
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActions: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 6,
    minHeight: 44,
  },
  chipPrimary: {
    backgroundColor: '#16a34a',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#16a34a',
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    borderBottomLeftRadius: 6,
  },
  bubbleShadow: {
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  receiptImageWrap: {
    width: 160,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  receiptCaption: {
    fontSize: 14,
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '95%',
    height: '80%',
  },
  receiptConfirmWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  receiptConfirmHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  receiptConfirmIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  receiptConfirmTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  receiptConfirmSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  receiptSummaryCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  receiptAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#16a34a',
    marginBottom: 6,
  },
  receiptSummaryText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  receiptSummaryMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  receiptActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  receiptSecondaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  receiptSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  receiptPrimaryBtn: {
    flex: 1.25,
    minHeight: 46,
    borderRadius: 16,
    overflow: 'hidden',
  },
  receiptPrimaryBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  receiptPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  scanBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 23,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    maxHeight: 110,
    marginRight: 10,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
  },
  sendBtnGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
});
