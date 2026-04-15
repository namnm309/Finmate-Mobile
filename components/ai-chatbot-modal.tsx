import { Colors } from '@/constants/theme';
import { useChatService, ChatMessage } from '@/lib/services/chatService';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionService } from '@/lib/services/transactionService';
import { useReportService } from '@/lib/services/reportService';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { useCategoryService } from '@/lib/services/categoryService';
import { useTransactionTypeService } from '@/lib/services/transactionTypeService';
import { useAppAlert } from '@/contexts/app-alert-context';
import { useSavingGoal } from '@/contexts/saving-goal-context';
import { useTransactionRefresh } from '@/contexts/transaction-refresh-context';
import { buildUserContextForAI } from '@/lib/utils/buildUserContext';
import type { CategoryDto, TransactionTypeDto } from '@/lib/types/transaction';
import { MaterialIcons } from '@expo/vector-icons';
import { File, Directory, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  Dimensions,
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
import type { FabPosition } from '@/contexts/ai-chatbot-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const POPOVER_WIDTH = Math.min(SCREEN_W - 24, 380);
const POPOVER_MAX_HEIGHT = Math.min(SCREEN_H * 0.68, 480);
const FAB_SIZE = 58;

const POPOVER_DARK = {
  bg: 'rgba(21, 25, 32, 0.92)',
  gridOverlay: 'rgba(34, 197, 94, 0.03)',
  card: 'rgba(30, 35, 46, 0.95)',
  header: 'rgba(26, 31, 42, 0.95)',
  text: '#f0f2f5',
  textSecondary: '#94a3b8',
  chipBg: '#1e232e',
  chipBorder: 'rgba(34, 197, 94, 0.45)',
  inputBg: '#1e232e',
  inputBorder: 'rgba(34, 197, 94, 0.4)',
  closeBtnBg: '#2d3548',
  closeBtnRing: '#22c55e',
  accent: '#22c55e',
  sparkleTint: '#f59e0b',
  border: 'rgba(255,255,255,0.06)',
};

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
  quickReplies?: string[];
}

const SYSTEM_PROMPT_BASE = `Bạn là trợ lý AI tài chính của FinMate. Bạn giúp người dùng:
1. Ghi chép chi tiêu, phân tích tài chính, đưa lời khuyên tiết kiệm
2. QUÉT HÓA ĐƠN: CHỈ khi user gửi KÈM ẢNH — mới đọc ảnh và trích xuất. Khi user CHỈ gửi chữ (text thuần) và KHÔNG phải mô tả thu/chi nhanh (xem mục 3): KHÔNG output [FINMATE_EXTRACT]; trả lời bình thường. Tin nhắn ngắn/khó hiểu (vd: "t", "a"): hỏi "Bạn muốn hỏi gì ạ?" hoặc gợi ý nhẹ.
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

   BILL CHUYỂN KHOẢN MOMO (Chi Tiết Giao Dịch / màn hình app MoMo):
   - Nhận diện: "Chi Tiết Giao Dịch", "MoMo", "Ví MoMo", "CHUYỂN TIỀN", "NHẬN TIỀN", "THANH TOÁN"
   - Loại giao dịch: "CHUYỂN TIỀN" / "THANH TOÁN" = chi tiêu; "NHẬN TIỀN" = thu nhập
   - Số tiền: tìm số có dấu trừ (vd: -2.939.000₫) hoặc số to trong card đầu. Bỏ dấu âm, output số dương
   - Thời gian: dạng "16:30 - 09/03/2026" → date lấy "09/03/2026" (DD/MM/YYYY), bỏ giờ
   - DANH MỤC (quan trọng): tìm trường "Danh mục" — VD: "Nhà cửa", "Ăn uống", "Di chuyển", "Mua sắm"... → đưa vào categoryName để app điền hạng mục thu/chi
   - Lời nhắn: nội dung "Lời nhắn" (vd: "all tiền tháng 3") có thể dùng cho content
   - Tên người nhận/chuyển: "Tên Ví MoMo", "Tên danh bạ" — dùng bổ sung cho content nếu cần
   - Tài khoản: "Sacombank", "Tài khoản/thẻ" — nguồn tiền
   - Bỏ qua: "Mã giao dịch", "Mã đơn hàng", "Số dư ví", "Phí", "Tổng phí", "Miễn phí"
   - content: kết hợp "Chuyển khoản MoMo" + lời nhắn hoặc tên người nhận (max 200 ký tự)

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
   - Sau khi đọc xong ảnh và đã có amount + date, hỏi: "Bạn có muốn lưu số tiền này vào mục chi không?" Thêm [FINMATE_QUICK_REPLY]Có|Không|Chỉnh sửa[/FINMATE_QUICK_REPLY]
   - CHỈ hỏi xác nhận lưu, KHÔNG nói đã lưu thành công trước khi user xác nhận
   - Format hiển thị:
     💰 Số tiền: [X] VND
     📅 Ngày: [DD/MM/YYYY hoặc ghi "không rõ"]
     📂 Danh mục: [nếu có — VD: Nhà cửa, Ăn uống]
     🧾 Nội dung: [tóm tắt ngắn — tên cửa hàng / loại giao dịch / lời nhắn]
   - Sau phần trả lời, BẮT BUỘC thêm 1 dòng để app tự điền form Nhập thủ công:
     [FINMATE_EXTRACT]{"amount":SỐ_NGUYÊN,"date":"DD/MM/YYYY","content":"chuỗi","categoryName":"chuỗi"}[/FINMATE_EXTRACT]
     amount=số tiền (VD 125000), date=DD/MM/YYYY (không rõ thì dùng hôm nay), content=tên cửa hàng/loại/lời nhắn (max 200 ký tự), categoryName=danh mục trong bill (VD: "Nhà cửa", "Ăn uống") — dùng để điền hạng mục thu/chi, để trống nếu không có
   - Thiếu field: amount:0 nếu không đọc được; date=hôm nay nếu không rõ; content=""; categoryName="" nếu không có

3. GHI CHÉP TỪ CHAT (text thuần, KHÔNG có ảnh):
   - Khi user nói các câu như: "nay ăn cơm hết 30k", "nay mua túi hết 2 triệu", "hôm nay đi xem phim 150k", "chi tiền cafe 50k"...
   - "nay", "hôm nay", "hom nay" = NGÀY HÔM NAY (local date, DD/MM/YYYY)
   - Chi tiêu cho bản thân (ăn, uống, mua sắm, giải trí...) → mục CHI (expense). Thu nhập (lương, nhận tiền...) → mục THU.
   - Parse số tiền: 30k=30000, 2tr=2000000, 2 triệu=2000000, 150k=150000, 50.000đ=50000
   - Trả lời gọn: tóm tắt số tiền + nội dung (VD: "Đã ghi nhận 30.000đ - ăn cơm, ngày hôm nay.")
   - Hỏi ngắn: "Bạn có muốn lưu vào mục Chi không?" (nếu chi) hoặc "Bạn có muốn lưu vào mục Thu không?" (nếu thu)
   - Output [FINMATE_EXTRACT] ngay sau câu hỏi. Thêm [FINMATE_QUICK_REPLY]Có|Không|Chỉnh sửa[/FINMATE_QUICK_REPLY] để app hiện nút chọn (user không cần gõ).
   - Ưu tiên câu trả lời NGẮN, dùng NÚT thay vì bắt user gõ.

4. Lập lộ trình tiêu dùng: ví dụ user muốn mua iPhone 17 Pro Max 52 triệu, lương 18tr/tháng, mua trong 5 tháng → tính mỗi ngày cần để dành bao nhiêu
5. Giới thiệu app: FinMate là app quản lý tài chính cá nhân - theo dõi chi tiêu, tiết kiệm, báo cáo, gợi ý mục tiêu
6. Tư vấn tiết kiệm & tài chính: trả lời mọi câu hỏi về tiết kiệm tiền (50/30/20, quỹ khẩn cấp, đầu tư cơ bản...), quản lý thu chi, nợ, tài chính cá nhân

7. Khi được cung cấp DỮ LIỆU THU CHI VÀ MỤC TIÊU TIẾT KIỆM (userContext) bên dưới, BẮT BUỘC dùng dữ liệu đó để:
   - Phân tích, phát hiện chi tiêu bất hợp lý, đưa ra nhận xét và khuyến nghị cụ thể
   - Trả lời chính xác câu hỏi về mục tiêu: VD "tôi đã hoàn thành mấy mục tiêu?" → trả số từ userContext (Đã hoàn thành: X). "có bao nhiêu mục tiêu đang theo đuổi?" → trả số từ userContext
   KHÔNG nói "không có dữ liệu" nếu đã có userContext.

8. TẠO MỤC TIÊU TIẾT KIỆM TỪ HỘI THOẠI:
   - Khi user mô tả ý định tiết kiệm → AI tóm tắt lại và hỏi: "Bạn có muốn lập mục tiêu này không?" Thêm [FINMATE_QUICK_REPLY]Có|Không[/FINMATE_QUICK_REPLY] để app hiện nút.
   - Khi user xác nhận (Có, Đồng ý...) → AI trả lời chúc mừng và THÊM (ẩn khỏi hiển thị):
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
- Trả lời gọn, rõ ràng, thân thiện bằng tiếng Việt

QUICK REPLY (giống Shopee - ưu tiên nút thay vì gõ):
- Mọi câu hỏi Có/Không: thêm [FINMATE_QUICK_REPLY]Có|Không[/FINMATE_QUICK_REPLY] hoặc [FINMATE_QUICK_REPLY]Có|Không|Chỉnh sửa[/FINMATE_QUICK_REPLY] để app hiện nút chọn.
- User ưu tiên ấn nút, hạn chế gõ.`;


const FINMATE_EXTRACT_REGEX = /\[FINMATE_EXTRACT\]([\s\S]*?)\[\/FINMATE_EXTRACT\]/;
const FINMATE_CREATE_GOAL_REGEX = /\[FINMATE_CREATE_GOAL\]([\s\S]*?)\[\/FINMATE_CREATE_GOAL\]/;
const FINMATE_QUICK_REPLY_REGEX = /\[FINMATE_QUICK_REPLY\]([^\[]*?)\[\/FINMATE_QUICK_REPLY\]/;

function stripCreateGoalTag(text: string): string {
  return text.replace(FINMATE_CREATE_GOAL_REGEX, '').replace(/\s*\n\s*\n/g, '\n\n').trim();
}

function stripExtractTag(text: string): string {
  return text.replace(FINMATE_EXTRACT_REGEX, '').replace(/\s*\n\s*\n/g, '\n\n').trim();
}

function parseQuickReplies(text: string): string[] {
  const match = text.match(FINMATE_QUICK_REPLY_REGEX);
  if (!match) return [];
  const inner = (match[1] || '').trim();
  return inner.split('|').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

function stripQuickReplyTag(text: string): string {
  return text.replace(FINMATE_QUICK_REPLY_REGEX, '').replace(/\s*\n\s*\n/g, '\n\n').trim();
}

function stripAllInternalTags(text: string): string {
  return stripQuickReplyTag(stripExtractTag(stripCreateGoalTag(text)));
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
  /** Danh mục từ bill (VD: Nhà cửa, Ăn uống) — dùng để chọn hạng mục thu/chi */
  categoryName?: string;
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
    const categoryName = String(obj.categoryName || '').trim().slice(0, 100) || undefined;
    return { amount, date, content, categoryName: categoryName || undefined };
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

function pickReceiptCategory(categories: CategoryDto[], content: string, billCategoryName?: string): CategoryDto | null {
  if (!categories.length) return null;

  const categoryNorm = (c: CategoryDto) => normalizeText(c.name);
  const normalizedContent = normalizeText(content);
  const includesAny = (text: string, keywords: string[]) => keywords.some((k) => text.includes(k));

  if (billCategoryName && billCategoryName.trim()) {
    const n = normalizeText(billCategoryName.trim());
    const exact = categories.find((c) => categoryNorm(c) === n);
    if (exact) return exact;
    const contains = categories.find((c) => categoryNorm(c).includes(n) || n.includes(categoryNorm(c)));
    if (contains) return contains;
  }

  const pickByKeywords = (contentKeywords: string[], categoryKeywords: string[]) => {
    if (!includesAny(normalizedContent, contentKeywords)) return null;
    return categories.find((c) => includesAny(categoryNorm(c), categoryKeywords)) || null;
  };

  return pickByKeywords(['an', 'uong', 'tra sua', 'ca phe', 'com', 'bun', 'pho'], ['an uong', 'do an', 'thuc an', 'do uong'])
    || pickByKeywords(['grab', 'be', 'xang', 'xe', 'di chuyen'], ['di chuyen', 'xang xe', 'giao thong'])
    || pickByKeywords(['nha cua', 'nha', 'cua'], ['nha cua', 'nha cửa'])
    || pickByKeywords(['dien', 'nuoc', 'internet', 'wifi', 'dien thoai'], ['hoa don', 'dien nuoc', 'dien', 'nuoc', 'internet'])
    || pickByKeywords(['shopee', 'lazada', 'tiki', 'mua', 'shopping'], ['mua sam', 'shopping'])
    || pickByKeywords(['chuyen khoan', 'momo', 'vnpay', 'zalo'], ['chuyen tien', 'khac', 'chi khac'])
    || categories.find((c) => ['chi khac', 'khac', 'other'].includes(categoryNorm(c)))
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
  /** Chế độ popover: cửa sổ nổi bật lên từ FAB, vị trí tự động theo FAB */
  popoverMode?: boolean;
  /** Vị trí FAB (dùng khi popoverMode) */
  fabPosition?: FabPosition;
  /** Gọi khi quét hóa đơn nhưng thiếu field / chưa trích xuất được (để hiện chấm đỏ nút chat) */
  onMissingFieldsShown?: () => void;
}

const GAP = 10;

/**
 * Ô chat sát bên FAB, di chuyển theo FAB khi kéo.
 * Đặt popover cạnh FAB: ưu tiên bên trái-trên nếu FAB ở phải-dưới.
 */
function getPopoverPosition(fab: FabPosition, insets: { top: number; bottom: number }) {
  const pad = 8;
  const fabCenterX = fab.x + FAB_SIZE / 2;
  const fabCenterY = fab.y + FAB_SIZE / 2;

  let top: number;
  let left: number;

  if (fabCenterY > SCREEN_H / 2) {
    top = fab.y - POPOVER_MAX_HEIGHT - GAP;
  } else {
    top = fab.y + FAB_SIZE + GAP;
  }
  if (fabCenterX > SCREEN_W / 2) {
    left = fab.x - POPOVER_WIDTH - GAP;
  } else {
    left = fab.x + FAB_SIZE + GAP;
  }

  top = Math.max(pad + insets.top, Math.min(SCREEN_H - POPOVER_MAX_HEIGHT - pad - insets.bottom - 60, top));
  left = Math.max(pad, Math.min(SCREEN_W - POPOVER_WIDTH - pad, left));

  return { top, left };
}

export function AIChatbotModal({ visible, onClose, initialMessage, autoSend, embedded, popoverMode, fabPosition, onMissingFieldsShown }: AIChatbotModalProps) {
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
  const { refreshTransactions } = useTransactionRefresh();
  const { showAlert } = useAppAlert();
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
  const [receiptWalletOptions, setReceiptWalletOptions] = useState<{ id: string; name: string }[]>([]);
  const [receiptSaveStep, setReceiptSaveStep] = useState<'confirm' | 'selectWallet'>('confirm');
  const [lastExtractedFromChat, setLastExtractedFromChat] = useState<ReceiptExtractPayload | null>(null);
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

  const buildPendingReceiptDraft = async (extracted: ReceiptExtractPayload): Promise<{ draft: PendingReceiptDraft; wallets: { id: string; name: string }[] } | null> => {
    const [transactionTypes, moneySources] = await Promise.all([
      getTransactionTypes(),
      getMoneySources(),
    ]);
    const transactionType = pickExpenseType(transactionTypes);
    const moneySource = moneySources[0] || null;
    if (!transactionType || !moneySource) return null;

    const categories = await getCategories(transactionType.id);
    const category = pickReceiptCategory(categories, extracted.content, extracted.categoryName);
    if (!category) return null;

    const wallets = moneySources.filter((m) => m.isActive).map((m) => ({ id: m.id, name: m.name }));
    const draft: PendingReceiptDraft = {
      ...extracted,
      transactionTypeId: transactionType.id,
      transactionTypeName: transactionType.name,
      moneySourceId: moneySource.id,
      moneySourceName: moneySource.name,
      categoryId: category.id,
      categoryName: category.name,
      transactionDateIso: parseReceiptDateToIso(extracted.date),
    };
    return { draft, wallets };
  };

  const openManualInputForReceipt = (draft: ReceiptExtractPayload | PendingReceiptDraft) => {
    setPendingReceipt(null);
    setReceiptWalletOptions([]);
    setReceiptSaveStep('confirm');
    if (!embedded) onClose();
    const params: Record<string, string> = {
      amount: String(draft.amount),
      date: draft.date,
      description: draft.content,
    };
    const catName = 'categoryName' in draft ? draft.categoryName : undefined;
    if (catName && typeof catName === 'string') params.categoryName = catName;
    router.push({
      pathname: '/(protected)/(tabs)/manual-input',
      params,
    });
  };

  const confirmSavePendingReceipt = async (moneySourceId?: string) => {
    if (!pendingReceipt || savingReceipt) return;
    const sourceId = moneySourceId ?? pendingReceipt.moneySourceId;
    try {
      setSavingReceipt(true);
      await createTransaction({
        transactionTypeId: pendingReceipt.transactionTypeId,
        moneySourceId: sourceId,
        categoryId: pendingReceipt.categoryId,
        amount: pendingReceipt.amount,
        transactionDate: pendingReceipt.transactionDateIso,
        description: pendingReceipt.content || undefined,
        isBorrowingForThis: false,
        isFee: false,
        excludeFromReport: false,
      });
      refreshTransactions();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Đã lưu thành công.',
        },
      ]);
      setPendingReceipt(null);
      setReceiptWalletOptions([]);
      setReceiptSaveStep('confirm');
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
    setReceiptWalletOptions([]);
    setReceiptSaveStep('confirm');
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
      const displayContent = stripAllInternalTags(stripAsterisks(reply));
      const qrFromReply = parseQuickReplies(reply);
      setMessages((prev) => [...prev, { role: 'assistant', content: displayContent, quickReplies: qrFromReply.length > 0 ? qrFromReply : undefined }]);

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
          showAlert({ title: 'Thành công', message: `Đã thêm mục tiêu "${createGoalPayload.title}" vào danh sách của bạn.`, icon: 'check-circle' });
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Không thể tạo mục tiêu';
          showAlert({ title: 'Lỗi', message: msg, icon: 'error' });
        }
      }

      const extracted = parseReceiptExtract(reply);
      if (options?.imageBase64) {
        if (extracted) {
          const missing: string[] = [];
          if (!extracted.amount || extracted.amount <= 0) missing.push('Số tiền');
          if (!extracted.date) missing.push('Ngày');
          if (missing.length > 0) {
            setPendingReceipt(null);
            setReceiptWalletOptions([]);
            setReceiptSaveStep('confirm');
            onMissingFieldsShown?.();
            showAlert({
              title: 'Thiếu thông tin',
              message: `Không đọc được: ${missing.join(', ')}. Vui lòng mở Nhập thủ công để điền bổ sung.`,
              icon: 'warning',
              buttons: [
                { text: 'Nhập thủ công', style: 'confirm', onPress: () => openManualInputForReceipt(extracted) },
                { text: 'Đóng', style: 'cancel' },
              ],
            });
          } else {
            const result = await buildPendingReceiptDraft(extracted);
            if (result) {
              setPendingReceipt(result.draft);
              setReceiptWalletOptions(result.wallets);
              setReceiptSaveStep('confirm');
              if (!normalizeText(displayContent).includes('luu')) {
                setMessages((prev) => [
                  ...prev,
                  { role: 'assistant', content: 'Bạn có muốn lưu số tiền này vào mục chi không?', quickReplies: ['Có', 'Không', 'Chỉnh sửa'] },
                ]);
              } else {
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === 'assistant') next[next.length - 1] = { ...last, quickReplies: ['Có', 'Không', 'Chỉnh sửa'] };
                  return next;
                });
              }
            } else {
              onMissingFieldsShown?.();
              showAlert({
                title: 'Cần bổ sung thông tin',
                message: 'Chưa xác định được tài khoản hoặc hạng mục mặc định để lưu tự động. App sẽ mở form đã điền sẵn để bạn kiểm tra lại.',
                icon: 'info',
                buttons: [
                  { text: 'Mở form', style: 'confirm', onPress: () => openManualInputForReceipt(extracted) },
                  { text: 'Đóng', style: 'cancel' },
                ],
              });
            }
          }
          return;
        }
        setPendingReceipt(null);
        setReceiptWalletOptions([]);
        setReceiptSaveStep('confirm');
        onMissingFieldsShown?.();
        showAlert({
          title: 'Chưa trích xuất được',
          message: 'App sẽ mở form Nhập thủ công. Bạn cần chọn Tài khoản và Hạng mục rồi lưu.',
          icon: 'info',
          buttons: [
            { text: 'Mở form', style: 'confirm', onPress: () => openManualInputForReceipt({ amount: 0, date: normalizeReceiptDate(''), content: 'Từ ảnh hóa đơn' }) },
            { text: 'Ở lại', style: 'cancel' },
          ],
        });
      } else if (extracted && extracted.amount > 0) {
        const result = await buildPendingReceiptDraft(extracted);
        if (result) {
          setLastExtractedFromChat(null);
          setPendingReceipt(result.draft);
          setReceiptWalletOptions(result.wallets);
          setReceiptSaveStep('confirm');
          if (!normalizeText(displayContent).includes('luu')) {
            const txt = normalizeText(displayContent);
            const isThu = txt.includes('thu') && !txt.includes('chi');
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: isThu ? 'Bạn có muốn lưu vào mục Thu không?' : 'Bạn có muốn lưu vào mục Chi không?', quickReplies: ['Có', 'Không', 'Chỉnh sửa'] },
            ]);
          } else {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') next[next.length - 1] = { ...last, quickReplies: ['Có', 'Không', 'Chỉnh sửa'] };
              return next;
            });
          }
        } else {
          setLastExtractedFromChat(extracted);
        }
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

  const handleQuickReply = useCallback(async (label: string) => {
    if (loading || savingReceipt) return;
    const text = label.trim();
    if (!text) return;
    const userMsg: DisplayMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    if (pendingReceipt && receiptSaveStep === 'confirm' && isReceiptSaveConfirmation(text)) {
      setReceiptSaveStep('selectWallet');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Bạn muốn lưu vào ví nào?' },
      ]);
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
    if (lastExtractedFromChat && !pendingReceipt) {
      if (isReceiptSaveConfirmation(text)) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Cần chọn tài khoản và hạng mục. Mở form Nhập thủ công.' }]);
        openManualInputForReceipt(lastExtractedFromChat);
        setLastExtractedFromChat(null);
        return;
      }
      if (isReceiptEditIntent(text)) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Mình sẽ mở form để bạn điền và lưu.' }]);
        openManualInputForReceipt(lastExtractedFromChat);
        setLastExtractedFromChat(null);
        return;
      }
      if (isReceiptCancelIntent(text)) {
        setLastExtractedFromChat(null);
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Đã hủy lưu.' }]);
        return;
      }
    }
    await sendChat(userMsg);
  }, [loading, savingReceipt, pendingReceipt, receiptSaveStep, lastExtractedFromChat, declinePendingReceipt, openManualInputForReceipt, sendChat]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || loading || savingReceipt) return;
    setMessage('');
    await handleQuickReply(text);
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
    showAlert({
      title: 'Quét hóa đơn',
      message: 'Chọn cách lấy ảnh hóa đơn. Chụp trực tiếp thường rõ hơn và tránh lỗi ảnh iCloud.',
      icon: 'info',
      buttons: [
        { text: 'Chụp ảnh', style: 'confirm', onPress: () => pickImageFromSource('camera') },
        { text: 'Chọn từ thư viện', style: 'confirm', onPress: () => pickImageFromSource('library') },
        { text: 'Hủy', style: 'cancel' },
      ],
    });
  };

  const popoverPos = useMemo(
    () => (popoverMode && fabPosition ? getPopoverPosition(fabPosition, insets) : { top: 0, left: 0 }),
    [popoverMode, fabPosition, insets.top, insets.bottom]
  );

  const popoverAnim = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (popoverMode && visible) {
      isClosingRef.current = false;
      popoverAnim.setValue(0);
      Animated.spring(popoverAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [popoverMode, visible]);

  const handlePopoverClose = useCallback(() => {
    if (!popoverMode || isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.timing(popoverAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [popoverMode, onClose]);

  const renderContent = () => {
    const isPopover = popoverMode;
    const bgColor = isPopover ? POPOVER_DARK.bg : themeColors.background;
    const cardColor = isPopover ? POPOVER_DARK.card : themeColors.card;
    const textColor = isPopover ? POPOVER_DARK.text : themeColors.text;
    const textSecColor = isPopover ? POPOVER_DARK.textSecondary : themeColors.textSecondary;

    return (
    <>
    <View style={[
      styles.modalOverlay,
      embedded && styles.embeddedOverlay,
      isPopover && { position: 'absolute', top: popoverPos.top, left: popoverPos.left, width: POPOVER_WIDTH, maxHeight: POPOVER_MAX_HEIGHT, flex: 0, backgroundColor: 'transparent' },
    ]}>
      <Animated.View
        style={[
          { flex: 1 },
          isPopover && {
            opacity: popoverAnim,
            transform: [{ scale: popoverAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
          },
        ]}>
      {isPopover && (
        <TouchableOpacity
          onPress={handlePopoverClose}
          style={[styles.popoverCloseBtn, { backgroundColor: POPOVER_DARK.closeBtnBg, borderColor: POPOVER_DARK.closeBtnRing }]}
          activeOpacity={0.85}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}
      <KeyboardAvoidingView
          style={[
            styles.keyboardView,
            embedded && styles.keyboardViewEmbedded,
            isPopover && { height: POPOVER_MAX_HEIGHT, borderRadius: 16, overflow: 'hidden' },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <View style={[
            styles.modalContent,
            { backgroundColor: bgColor },
            isPopover && styles.popoverContent,
          ]}>
            {/* Header: popover = form mẫu | normal = gradient */}
            {isPopover ? (
              <View style={[styles.header, styles.popoverHeader, { backgroundColor: POPOVER_DARK.header, paddingTop: 14, paddingBottom: 14 }]}>
                <View style={styles.headerInner}>
                  <View style={[styles.popoverHeaderIcon]}>
                    <LinearGradient colors={['#22c55e', '#16a34a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
                      <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                  <View style={styles.headerTextWrap}>
                    <Text style={[styles.popoverHeaderTitle]} numberOfLines={1}>Finmate AI</Text>
                    <Text style={[styles.popoverHeaderSubtitle]} numberOfLines={1}>• Trợ lý tài chính</Text>
                  </View>
                </View>
              </View>
            ) : (
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
            )}

            {/* Popover empty state: sparkle + welcome + chips (giống form mẫu) */}
            {isPopover && messages.filter((m) => m.role === 'user').length === 0 && (
              <View style={styles.popoverWelcome}>
                <View style={styles.popoverSparkleWrap}>
                  <MaterialIcons name="auto-awesome" size={56} color={POPOVER_DARK.sparkleTint} />
                </View>
                <Text style={styles.popoverWelcomeTitle}>Xin chào! Tôi là Finmate AI</Text>
                <Text style={styles.popoverWelcomeSub}>Hỏi tôi bất cứ điều gì về tài chính cá nhân!</Text>
                <View style={styles.popoverChipsColumn}>
                  <TouchableOpacity onPress={() => setMessage('Làm sao tiết kiệm hiệu quả?')} style={styles.popoverChipBtn} activeOpacity={0.8}>
                    <Text style={styles.popoverChipText}>Tiết kiệm hiệu quả</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMessage('Tôi nên đầu tư gì?')} style={styles.popoverChipBtn} activeOpacity={0.8}>
                    <Text style={styles.popoverChipText}>Nên đầu tư gì?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMessage('Cách lập ngân sách 50/30/20?')} style={styles.popoverChipBtn} activeOpacity={0.8}>
                    <Text style={styles.popoverChipText}>Ngân sách 50/30/20</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Quick actions (chỉ khi không phải popover empty) */}
            {!isPopover && messages.filter((m) => m.role === 'user').length === 0 && (
              <View style={[styles.quickActions, { backgroundColor: cardColor, borderColor: themeColors.border }]}>
                <Text style={[styles.quickLabel, { color: textSecColor }]}>Gợi ý nhanh</Text>
                <View style={styles.quickChips}>
                  <TouchableOpacity onPress={() => setMessage('Cách lập ngân sách 50/30/20?')} style={[styles.chip, { backgroundColor: themeColors.background }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
                    <Text style={[styles.chipText, { color: themeColors.text }]}>Cách lập ngân sách 50/30/20?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMessage('Làm sao tiết kiệm hiệu quả?')} style={[styles.chip, { backgroundColor: themeColors.background }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
                    <Text style={[styles.chipText, { color: themeColors.text }]}>Làm sao tiết kiệm hiệu quả?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleScanReceipt} style={[styles.chip, styles.chipPrimary]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
                    <MaterialIcons name="receipt-long" size={16} color="#FFFFFF" />
                    <Text style={styles.chipTextPrimary}>Quét hóa đơn</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Chat (popover: chỉ hiện khi đã có tin nhắn) */}
            {!(isPopover && messages.filter((m) => m.role === 'user').length === 0) && (
            <ScrollView
              ref={scrollRef}
              style={[styles.chatArea, { backgroundColor: bgColor }]}
              contentContainerStyle={[styles.chatContent, isPopover && { padding: 14, paddingBottom: 16 }]}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
              {messages.map((m, i) => {
                const dm = m as DisplayMessage;
                const quickReplies = dm.quickReplies?.length ? dm.quickReplies : undefined;
                return (
                <View
                  key={i}
                  style={[
                    styles.messageRow,
                    m.role === 'user' ? styles.userRow : styles.assistantRow,
                  ]}>
                  {m.role === 'assistant' && !isPopover && (
                    <View style={[styles.avatarSmall, { backgroundColor: 'rgba(22, 163, 74, 0.15)' }]}>
                      <MaterialIcons name="chat-bubble-outline" size={18} color="#16a34a" />
                    </View>
                  )}
                  <View style={[styles.assistantBubbleWrap, m.role === 'user' && { alignItems: 'flex-end' }]}>
                    <View
                      style={[
                        styles.bubble,
                        m.role === 'user'
                          ? [styles.userBubble, styles.bubbleShadow]
                          : [styles.assistantBubble, { backgroundColor: isPopover ? POPOVER_DARK.card : themeColors.card }],
                        isPopover && { maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10 },
                      ]}>
                      {dm.imageUri ? (
                        <>
                          <TouchableOpacity
                            style={styles.receiptImageWrap}
                            onPress={() => setFullscreenImageUri(dm.imageUri!)}
                            activeOpacity={0.9}>
                            <Image
                              source={{ uri: dm.imageUri }}
                              style={styles.receiptImage}
                              contentFit="cover"
                            />
                          </TouchableOpacity>
                          <Text
                            style={[
                              styles.bubbleText,
                              styles.receiptCaption,
                              { color: m.role === 'user' ? 'rgba(255,255,255,0.9)' : textSecColor },
                            ]}
                            selectable>
                            {m.role === 'assistant' ? stripAllInternalTags(stripAsterisks(m.content)) : m.content}
                          </Text>
                        </>
                      ) : (
                        <Text
                          style={[
                            styles.bubbleText,
                            { color: m.role === 'user' ? '#FFFFFF' : textColor, fontSize: isPopover ? 14 : 15 },
                          ]}
                          selectable>
                          {m.role === 'assistant' ? stripAllInternalTags(stripAsterisks(m.content)) : m.content}
                        </Text>
                      )}
                    </View>
                    {m.role === 'assistant' && ((quickReplies && quickReplies.length > 0) || (i === messages.length - 1 && pendingReceipt && receiptSaveStep === 'selectWallet')) && (() => {
                      const isLastAndPending = i === messages.length - 1 && pendingReceipt;
                      const isLastWithExtracted = i === messages.length - 1 && lastExtractedFromChat;
                      const isSelectWalletStep = isLastAndPending && receiptSaveStep === 'selectWallet';
                      const isConfirmStep = (isLastAndPending && receiptSaveStep === 'confirm') || isLastWithExtracted;
                      if (isSelectWalletStep) {
                        if (receiptWalletOptions.length > 1) {
                          return (
                            <View style={{ marginTop: 8, gap: 6 }}>
                              <View style={[styles.quickReplyRow, { flexWrap: 'wrap' }]}>
                                {receiptWalletOptions.map((w) => (
                                  <TouchableOpacity
                                    key={w.id}
                                    style={[styles.quickReplyChip, { backgroundColor: '#16a34a', borderColor: '#22c55e' }]}
                                    onPress={() => confirmSavePendingReceipt(w.id)}
                                    activeOpacity={0.8}
                                    disabled={loading || savingReceipt}>
                                    {savingReceipt ? (
                                      <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                      <Text style={[styles.quickReplyChipText, { color: '#FFFFFF' }]}>{w.name}</Text>
                                    )}
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          );
                        }
                        if (receiptWalletOptions.length === 1) {
                          const w = receiptWalletOptions[0];
                          return (
                            <View style={[styles.quickReplyRow, { marginTop: 8 }]}>
                              <TouchableOpacity
                                style={[styles.quickReplyChip, { backgroundColor: '#16a34a', borderColor: '#22c55e' }]}
                                onPress={() => confirmSavePendingReceipt(w.id)}
                                activeOpacity={0.8}
                                disabled={loading || savingReceipt}>
                                {savingReceipt ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <Text style={[styles.quickReplyChipText, { color: '#FFFFFF' }]}>Lưu vào {w.name}</Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          );
                        }
                      }
                      if (isConfirmStep && quickReplies && quickReplies.length > 0) {
                        return (
                          <View style={[styles.quickReplyRow, { marginTop: 8 }]}>
                            {quickReplies.map((label, j) => (
                              <TouchableOpacity
                                key={j}
                                style={[
                                  styles.quickReplyChip,
                                  {
                                    backgroundColor: label === 'Có' ? '#16a34a' : (isPopover ? POPOVER_DARK.chipBg : themeColors.background),
                                    borderColor: label === 'Có' ? '#22c55e' : (isPopover ? POPOVER_DARK.chipBorder : themeColors.border),
                                  },
                                ]}
                                onPress={() => handleQuickReply(label)}
                                activeOpacity={0.8}
                                disabled={loading || savingReceipt}>
                                {label === 'Có' && savingReceipt ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <Text style={[styles.quickReplyChipText, { color: label === 'Có' ? '#FFFFFF' : textColor }]}>{label}</Text>
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        );
                      }
                      return null;
                    })()}
                  </View>
                </View>
              );})}
              {loading && (
                <View style={[styles.messageRow, styles.assistantRow]}>
                  {!isPopover && (
                    <View style={[styles.avatarSmall, { backgroundColor: 'rgba(22, 163, 74, 0.15)' }]}>
                      <MaterialIcons name="chat-bubble-outline" size={18} color="#16a34a" />
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      styles.assistantBubble,
                      styles.loadingBubble,
                      { backgroundColor: isPopover ? POPOVER_DARK.card : themeColors.card },
                    ]}>
                    <ActivityIndicator size="small" color="#16a34a" />
                    <Text style={[styles.bubbleText, { color: textSecColor, marginLeft: 10 }]}>
                      Đang xử lý...
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
            )}

            {/* Input */}
            <View style={[styles.inputBar, { backgroundColor: isPopover ? POPOVER_DARK.card : themeColors.card, borderTopColor: isPopover ? POPOVER_DARK.border : themeColors.border }]}>
              <TouchableOpacity
                style={[styles.scanBtn, { backgroundColor: isPopover ? POPOVER_DARK.inputBg : themeColors.background }]}
                onPress={handleScanReceipt}
                disabled={loading || savingReceipt}
                activeOpacity={0.7}>
                <MaterialIcons name="receipt-long" size={22} color="#16a34a" />
              </TouchableOpacity>
              <TextInput
                style={[styles.textInput, { backgroundColor: isPopover ? POPOVER_DARK.inputBg : themeColors.background, color: textColor }, isPopover && { borderWidth: 1, borderColor: POPOVER_DARK.inputBorder }]}
                placeholder={isPopover ? "Nhập câu hỏi..." : "Nhập tin nhắn..."}
                placeholderTextColor={textSecColor}
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
      </Animated.View>
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
  };

  if (embedded) return renderContent();
  if (popoverMode) {
    if (!visible) return null;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View style={[styles.popoverBackdrop, styles.popoverBackdropOverlay, { opacity: popoverAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handlePopoverClose} />
        </Animated.View>
        {renderContent()}
      </View>
    );
  }
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
  popoverBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  popoverBackdropOverlay: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  popoverContent: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 16,
  },
  popoverHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  popoverHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f0f2f5',
  },
  popoverHeaderSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  popoverChip: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    paddingVertical: 10,
  },
  popoverCloseBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  popoverHeaderIcon: {
    marginRight: 12,
  },
  popoverWelcome: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  popoverSparkleWrap: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  popoverWelcomeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f0f2f5',
    textAlign: 'center',
    marginBottom: 6,
  },
  popoverWelcomeSub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
  },
  popoverChipsColumn: {
    gap: 8,
  },
  popoverChipBtn: {
    backgroundColor: 'rgba(30, 35, 46, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  popoverChipText: {
    fontSize: 13,
    color: '#f0f2f5',
    textAlign: 'center',
    fontWeight: '500',
  },
  inlineConfirmRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    minHeight: 44,
  },
  inlineConfirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineConfirmBtnNo: {
    backgroundColor: 'rgba(30, 35, 46, 0.6)',
  },
  inlineConfirmBtnYes: {
    backgroundColor: '#16a34a',
    borderColor: '#22c55e',
  },
  inlineConfirmText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inlineConfirmTextYes: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
    marginTop: 4,
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
  assistantBubbleWrap: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    maxWidth: '80%',
  },
  quickReplyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignSelf: 'flex-start',
  },
  quickReplyChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  quickReplyChipText: {
    fontSize: 14,
    fontWeight: '600',
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
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
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
