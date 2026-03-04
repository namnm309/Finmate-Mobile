import { Colors } from '@/constants/theme';
import { useChatService, ChatMessage } from '@/lib/services/chatService';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
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

const SYSTEM_PROMPT = `Bạn là trợ lý AI tài chính của FinMate. Bạn giúp người dùng:
1. Ghi chép chi tiêu, phân tích tài chính, đưa lời khuyên tiết kiệm
2. QUÉT HÓA ĐƠN (QUAN TRỌNG NHẤT): Khi người dùng gửi ảnh hóa đơn, BẮT BUỘC phải đọc ảnh và trích xuất:

   HOÁ ĐƠN ĐIỆN TỬ (từ app, email, ảnh màn hình):
   - Tìm các trường: "Tổng tiền", "Thành tiền", "Tổng cộng", "Số tiền", "Thanh toán", "Grand Total", "Total Amount", "Phải thu"
   - Lấy số tiền SAU CÙNG (sau giảm giá, sau thuế) — thường là số lớn nhất hoặc có gạch dưới
   - Tìm ngày: "Ngày tạo", "Ngày mua", "Ngày xuất HĐ", "Date", "Invoice Date"

   HOÁ ĐƠN GIẤY / BÁN LẺ (ảnh chụp hoá đơn in):
   - Tìm các trường: "Phải thu (VND)", "Tổng giá trị", "Tổng cộng", "TỔNG CỘNG", "TOTAL"
   - Lấy số tiền ở cuối hoá đơn (thường là dòng cuối cùng trước barcode)
   - Tìm ngày: dòng đầu hoá đơn hoặc gần tên cửa hàng

   LUÔN LUÔN:
   - Trả lời NGAY số tiền và ngày, KHÔNG hỏi lại hay yêu cầu upload thêm
   - Format bắt buộc:
     💰 Số tiền: [X] VND
     📅 Ngày: [DD/MM/YYYY hoặc ghi "không rõ"]
     🧾 Nội dung: [tóm tắt ngắn — tên cửa hàng / loại hàng]
   - Nếu có danh sách mặt hàng thì liệt kê thêm bên dưới

3. Lập lộ trình tiêu dùng: ví dụ user muốn mua iPhone 17 Pro Max 52 triệu, lương 18tr/tháng, mua trong 5 tháng → tính mỗi ngày cần để dành bao nhiêu
4. Giới thiệu app: FinMate là app quản lý tài chính cá nhân - theo dõi chi tiêu, tiết kiệm, báo cáo, gợi ý mục tiêu
5. Tư vấn tiết kiệm & tài chính: trả lời mọi câu hỏi về tiết kiệm tiền (50/30/20, quỹ khẩn cấp, đầu tư cơ bản...), quản lý thu chi, nợ, tài chính cá nhân

Trả lời rõ ràng, thân thiện bằng tiếng Việt.`;

interface AIChatbotModalProps {
  visible: boolean;
  onClose: () => void;
  /** Tin nhắn sẵn có khi mở (từ AI Assistant card, voice input...) */
  initialMessage?: string;
  /** Nếu true: tự động gửi initialMessage ngay khi mở (dùng cho "Tìm hiểu thêm") */
  autoSend?: boolean;
}

export function AIChatbotModal({ visible, onClose, initialMessage, autoSend }: AIChatbotModalProps) {
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const { sendMessage } = useChatService();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Xin chào! Tôi là trợ lý AI tài chính FinMate. Bạn có thể hỏi về app, tư vấn tài chính, lập lộ trình tiêu dùng, hoặc nhấn 📷 để quét hóa đơn.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [visible, messages]);

  useEffect(() => {
    if (visible && initialMessage?.trim()) {
      setMessage(initialMessage);
      if (autoSend && !autoSentRef.current) {
        autoSentRef.current = true;
        const userMsg: ChatMessage = { role: 'user', content: initialMessage.trim() };
        setMessages((prev) => [...prev, userMsg]);
        setMessage('');
        sendChat(userMsg);
      }
    }
    if (!visible) autoSentRef.current = false;
  }, [visible, initialMessage, autoSend]);

  const sendChat = async (userMsg: ChatMessage, options?: { imageBase64?: string }) => {
    setLoading(true);
    try {
      const chatHistory: ChatMessage[] = [
        ...messages.filter((m) => m.role !== 'system'),
        userMsg,
      ];
      const reply = await sendMessage(chatHistory, {
        systemPrompt: SYSTEM_PROMPT,
        imageBase64: options?.imageBase64,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
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
    const userMsg: ChatMessage = { role: 'user', content: text };
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

    // Resize & compress ảnh để giảm kích thước gửi lên (~800px, quality 0.5)
    // Giúp tránh lỗi request quá lớn khi gửi đến AI
    let base64: string | undefined | null = null;
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      base64 = manipulated.base64;
    } catch (_e) {
      // Fallback: thử đọc base64 gốc từ asset
      base64 = asset.base64;
    }

    if (!base64 || base64.length < 5000) {
      // Fallback cuối: đọc file trực tiếp
      try {
        if (asset.uri) {
          base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
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
    const userMsg: ChatMessage = {
      role: 'user',
      content: 'Đây là ảnh hóa đơn của tôi. Hãy đọc ảnh và cho biết ngay: số tiền thanh toán và ngày. Có thể là hóa đơn điện tử hoặc hóa đơn giấy.',
    };
    setMessages((prev) => [...prev, userMsg]);
    await sendChat(userMsg, { imageBase64: base64 });
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            {/* Header */}
            <LinearGradient
              colors={['#16a34a', '#22c55e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.header}>
              <View style={styles.headerInner}>
                <View style={styles.headerIconWrap}>
                  <MaterialIcons name="chat-bubble-outline" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.headerTextWrap}>
                  <Text style={styles.headerTitle}>AI Trợ lý tài chính</Text>
                  <Text style={styles.headerSubtitle}>FinMate • Luôn sẵn sàng hỗ trợ</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <MaterialIcons name="close" size={24} color="#FFFFFF" />
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
                    activeOpacity={0.7}>
                    <Text style={[styles.chipText, { color: themeColors.text }]}>FinMate là gì?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setMessage('Quy tắc 50/30/20 là gì?')}
                    style={[styles.chip, { backgroundColor: themeColors.background }]}
                    activeOpacity={0.7}>
                    <Text style={[styles.chipText, { color: themeColors.text }]}>50/30/20</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleScanReceipt}
                    style={[styles.chip, styles.chipPrimary]}
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
                    <Text
                      style={[
                        styles.bubbleText,
                        { color: m.role === 'user' ? '#FFFFFF' : themeColors.text },
                      ]}
                      selectable>
                      {m.content}
                    </Text>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    height: '66.67%',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActions: {
    paddingHorizontal: 20,
    paddingVertical: 14,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
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
