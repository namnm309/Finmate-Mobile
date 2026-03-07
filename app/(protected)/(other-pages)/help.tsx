import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { styles } from '@/styles/index.styles';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SUPPORT_EMAIL = 'support@finmate.website';
const WEBSITE_URL = 'https://finmate.website';
const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61581320641242';
const TIKTOK_URL = 'https://www.tiktok.com/@finmate0';

export default function HelpScreen() {
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const bg = themeColors.background;
  const text = themeColors.text;
  const textSecondary = themeColors.textSecondary;
  const card = themeColors.card;
  const border = themeColors.border;

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      <View style={styles.statusBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.statusIconButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialIcons name="arrow-back" size={24} color={text} />
        </TouchableOpacity>
        <Text style={[styles.otherTitle, { color: text }]}>Trợ giúp</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 8, paddingBottom: 32 }]}
        showsVerticalScrollIndicator={false}>
        {/* Giới thiệu FinMate */}
        <View style={[styles.otherSection, { marginBottom: 24 }]}>
          <Text style={[styles.otherSectionTitle, { color: themeColors.tint, fontWeight: '600', marginBottom: 8 }]}>
            Về FinMate
          </Text>
          <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
            <Text style={{ color: text, fontSize: 15, lineHeight: 24 }}>
              FinMate là ứng dụng quản lý tài chính cá nhân được thiết kế theo tiêu chuẩn quốc tế, giúp người dùng theo dõi thu chi, đặt mục tiêu tiết kiệm, phân tích thói quen chi tiêu và đưa ra lời khuyên tài chính thông minh. Với giao diện thân thiện, FinMate phù hợp với mọi đối tượng từ sinh viên đến người đi làm, gia đình và cá nhân có nhu cầu quản lý tài chính hiệu quả.
            </Text>
            <Text style={{ color: text, fontSize: 15, lineHeight: 24, marginTop: 12 }}>
              Ứng dụng tích hợp công nghệ AI để phân tích dữ liệu thu chi, quét hóa đơn, gợi ý mục tiêu tiết kiệm và trả lời câu hỏi tài chính. FinMate cam kết bảo vệ quyền riêng tư và dữ liệu của người dùng theo các tiêu chuẩn bảo mật phổ biến.
            </Text>
          </View>
        </View>

        {/* Dự án Startup */}
        <View style={[styles.otherSection, { marginBottom: 24 }]}>
          <Text style={[styles.otherSectionTitle, { color: themeColors.tint, fontWeight: '600', marginBottom: 8 }]}>
            Dự án Startup
          </Text>
          <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
            <Text style={{ color: text, fontSize: 15, lineHeight: 24 }}>
              FinMate là dự án khởi nghiệp (startup) trong lĩnh vực fintech. Chúng tôi đang trong quá trình phát triển và cải tiến liên tục để mang đến trải nghiệm tốt nhất cho người dùng. Mọi phản hồi và góp ý từ bạn đều rất quan trọng để FinMate trở thành trợ lý tài chính đáng tin cậy hàng ngày.
            </Text>
          </View>
        </View>

        {/* Chính sách quyền riêng tư */}
        <View style={[styles.otherSection, { marginBottom: 24 }]}>
          <Text style={[styles.otherSectionTitle, { color: themeColors.tint, fontWeight: '600', marginBottom: 8 }]}>
            Chính sách quyền riêng tư
          </Text>
          <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
            <Text style={{ color: text, fontSize: 15, lineHeight: 24 }}>
              FinMate cam kết bảo vệ thông tin cá nhân và dữ liệu tài chính của bạn. Chúng tôi thu thập và xử lý dữ liệu chỉ nhằm cung cấp dịch vụ quản lý tài chính, không bán hoặc chia sẻ dữ liệu cho bên thứ ba vì mục đích quảng cáo. Dữ liệu được mã hóa và lưu trữ an toàn theo các tiêu chuẩn bảo mật phổ biến.
            </Text>
            <Text style={{ color: text, fontSize: 15, lineHeight: 24, marginTop: 12 }}>
              Bạn có quyền truy cập, chỉnh sửa hoặc yêu cầu xóa dữ liệu cá nhân của mình bất cứ lúc nào. Chi tiết đầy đủ về chính sách quyền riêng tư có tại website chính thức của FinMate.
            </Text>
          </View>
        </View>

        {/* Liên hệ hỗ trợ */}
        <View style={[styles.otherSection, { marginBottom: 24 }]}>
          <Text style={[styles.otherSectionTitle, { color: themeColors.tint, fontWeight: '600', marginBottom: 8 }]}>
            Liên hệ hỗ trợ
          </Text>
          <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
            <Text style={{ color: textSecondary, fontSize: 14, marginBottom: 12 }}>
              Bạn cần hỗ trợ? Hãy liên hệ với chúng tôi qua email hoặc các kênh mạng xã hội dưới đây:
            </Text>
            <TouchableOpacity
              onPress={() => openUrl(`mailto:${SUPPORT_EMAIL}`)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: border }}>
              <View style={[styles.otherMenuItemIcon, { backgroundColor: '#FBBF24' }]}>
                <MaterialIcons name="email" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: textSecondary, fontSize: 13 }}>Email hỗ trợ</Text>
                <Text style={{ color: text, fontSize: 16, fontWeight: '500' }}>{SUPPORT_EMAIL}</Text>
              </View>
              <MaterialIcons name="open-in-new" size={20} color={textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openUrl(WEBSITE_URL)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: border }}>
              <View style={[styles.otherMenuItemIcon, { backgroundColor: '#16a34a' }]}>
                <MaterialIcons name="language" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: textSecondary, fontSize: 13 }}>Website</Text>
                <Text style={{ color: text, fontSize: 16, fontWeight: '500' }}>finmate.website</Text>
              </View>
              <MaterialIcons name="open-in-new" size={20} color={textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openUrl(FACEBOOK_URL)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: border }}>
              <View style={[styles.otherMenuItemIcon, { backgroundColor: '#1877F2' }]}>
                <MaterialIcons name="facebook" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: textSecondary, fontSize: 13 }}>Facebook</Text>
                <Text style={{ color: text, fontSize: 16, fontWeight: '500' }}>FinMate Official</Text>
              </View>
              <MaterialIcons name="open-in-new" size={20} color={textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openUrl(TIKTOK_URL)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
              <View style={[styles.otherMenuItemIcon, { backgroundColor: '#000000' }]}>
                <MaterialIcons name="movie-creation" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: textSecondary, fontSize: 13 }}>TikTok</Text>
                <Text style={{ color: text, fontSize: 16, fontWeight: '500' }}>@finmate0</Text>
              </View>
              <MaterialIcons name="open-in-new" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <Text style={{ color: textSecondary, fontSize: 13 }}>FinMate - Trợ lý tài chính thông minh</Text>
          <Text style={{ color: textSecondary, fontSize: 12, marginTop: 4 }}>Phiên bản ứng dụng</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
