import { Colors } from '@/constants/theme';
import { useChatService, ChatMessage } from '@/lib/services/chatService';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionService } from '@/lib/services/transactionService';
import { useReportService } from '@/lib/services/reportService';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { buildUserContextForAI } from '@/lib/utils/buildUserContext';
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

   BILL THANH TOÁN NGÂN HÀNG VIỆT NAM (thành công):
   - Đọc được thông báo "Giao dịch thành công", "Thanh toán thành công", "Chuyển khoản thành công"
   - Tìm: "Số tiền", "Amount", "Tổng tiền", "Số dư còn lại", "Ngày GD", "Thời gian"
   - Áp dụng cho: Vietcombank, VietinBank, BIDV, Techcombank, VPBank, MB Bank, ACB, TPBank, Shinhan, HDBank, MSB, OCB, Sacombank... và các ngân hàng VN khác

   BILL CỬA HÀNG TIỆN LỢI (giấy + điện tử):
   - Circle K: bill giấy, email, app — tìm "Total", "Tổng", "Date", "Store"
   - Family Mart: bill giấy, điện tử — "合計", "Total", "Tổng", ngày giao dịch
   - Mini Stop: bill giấy, màn hình — "Total", "Tổng cộng", thời gian
   - GS25: bill giấy, app — "Total", "합계", "Tổng", ngày
   - Seven Eleven (7-Eleven): bill giấy, email, app — "Total", "Tổng", "Date", "Store"

   LUÔN LUÔN:
   - Trả lời NGAY số tiền và ngày, KHÔNG hỏi lại hay yêu cầu upload thêm
   - Format hiển thị:
     💰 Số tiền: [X] VND
     📅 Ngày: [DD/MM/YYYY hoặc ghi "không rõ"]
     🧾 Nội dung: [tóm tắt ngắn — tên cửa hàng / loại hàng]
   - Sau phần trả lời, BẮT BUỘC thêm 1 dòng để app tự điền form Nhập thủ công:
     [FINMATE_EXTRACT]{"amount":SỐ_NGUYÊN,"date":"DD/MM/YYYY","content":"chuỗi"}[/FINMATE_EXTRACT]
     amount=số tiền (VD 125000), date=DD/MM/YYYY (không rõ thì dùng hôm nay), content=tên cửa hàng/loại (max 200 ký tự)
   - Thiếu field: nếu không đọc được số tiền dùng amount:0; không rõ ngày dùng hôm nay; content để trống nếu không có

3. Lập lộ trình tiêu dùng: ví dụ user muốn mua iPhone 17 Pro Max 52 triệu, lương 18tr/tháng, mua trong 5 tháng → tính mỗi ngày cần để dành bao nhiêu
4. Giới thiệu app: FinMate là app quản lý tài chính cá nhân - theo dõi chi tiêu, tiết kiệm, báo cáo, gợi ý mục tiêu
5. Tư vấn tiết kiệm & tài chính: trả lời mọi câu hỏi về tiết kiệm tiền (50/30/20, quỹ khẩn cấp, đầu tư cơ bản...), quản lý thu chi, nợ, tài chính cá nhân

6. Khi được cung cấp DỮ LIỆU THU CHI (userContext) bên dưới, BẮT BUỘC dùng dữ liệu đó để phân tích, phát hiện chi tiêu bất hợp lý, khả nghi, đưa ra nhận xét và khuyến nghị cụ thể. KHÔNG nói "không có dữ liệu" nếu đã có userContext.

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

function parseReceiptExtract(text: string): { amount: number; date: string; content: string } | null {
  const m = text.match(FINMATE_EXTRACT_REGEX);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[1].trim());
    const amount = typeof obj.amount === 'number' ? obj.amount : parseInt(String(obj.amount || 0), 10);
    const date = String(obj.date || '').trim() || new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
    const content = String(obj.content || '').trim().slice(0, 200);
    return { amount, date, content };
  } catch {
    return null;
  }
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
  const { getTransactions } = useTransactionService();
  const { getOverview } = useReportService();
  const { getGroupedMoneySources } = useMoneySourceService();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      role: 'assistant',
      content:
        'Xin chào! Tôi là trợ lý AI tài chính FinMate. Bạn có thể hỏi về app, tư vấn tài chính, lập lộ trình tiêu dùng, hoặc nhấn 📷 để quét hóa đơn.',
    },
  ]);
  const [loading, setLoading] = useState(false);
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
          balanceRes?.totalBalance
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
      setMessages((prev) => [...prev, { role: 'assistant', content: stripAsterisks(reply) }]);

      if (options?.imageBase64) {
        const extracted = parseReceiptExtract(reply);
        if (extracted) {
          onClose();
          const missing: string[] = [];
          if (!extracted.amount || extracted.amount <= 0) missing.push('Số tiền');
          if (!extracted.date) missing.push('Ngày');
          if (missing.length > 0) {
            onMissingFieldsShown?.();
            Alert.alert(
              'Thiếu thông tin',
              `Không đọc được: ${missing.join(', ')}. Vui lòng mở Nhập thủ công để điền bổ sung.`,
              [{ text: 'Nhập thủ công', onPress: () => router.push({ pathname: '/(protected)/(tabs)/manual-input', params: { amount: String(extracted.amount || ''), date: extracted.date, description: extracted.content } }) }, { text: 'Đóng', style: 'cancel' }]
            );
          } else {
            onClose();
            router.push({
              pathname: '/(protected)/(tabs)/manual-input',
              params: { amount: String(extracted.amount), date: extracted.date, description: extracted.content },
            });
          }
          return;
        }
        onMissingFieldsShown?.();
        Alert.alert('Chưa trích xuất được', 'App sẽ mở form Nhập thủ công. Bạn cần chọn Tài khoản và Hạng mục rồi lưu.', [
          { text: 'Mở form', onPress: () => { onClose(); router.push({ pathname: '/(protected)/(tabs)/manual-input', params: { description: 'Từ ảnh hóa đơn' } }); } },
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
    if (!text || loading) return;
    const userMsg: DisplayMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
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

            {/* Input */}
            <View style={[styles.inputBar, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
              <TouchableOpacity
                style={[styles.scanBtn, { backgroundColor: themeColors.background }]}
                onPress={handleScanReceipt}
                disabled={loading}
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
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!message.trim() || loading) && styles.sendBtnDisabled]}
                onPress={handleSend}
                activeOpacity={0.7}
                disabled={!message.trim() || loading}>
                <LinearGradient
                  colors={message.trim() && !loading ? ['#16a34a', '#22c55e'] : ['#9ca3af', '#6b7280']}
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
