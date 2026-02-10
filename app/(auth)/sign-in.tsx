import { useSignIn, useSignUp, useSSO, useClerk } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUserService } from '@/lib/services/userService';

// Warm up the browser for OAuth - QUAN TRỌNG cho Android
WebBrowser.maybeCompleteAuthSession();

const logo = require('@/assets/images/logo finmate.png');

type AuthMode = 'login' | 'signup';

export default function SignInScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabLayoutWidth, setTabLayoutWidth] = useState(0);
  const tabSlideAnim = useRef(new Animated.Value(0)).current;

  const { signIn, isLoaded: signInLoaded } = useSignIn();

  useEffect(() => {
    if (tabLayoutWidth <= 0) return;
    const toValue = mode === 'signup' ? 1 : 0;
    Animated.spring(tabSlideAnim, {
      toValue,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [mode, tabLayoutWidth, tabSlideAnim]);
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();
  const { setActive } = useClerk();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getUserProfile } = useUserService();

  const syncUserProfile = useCallback(async () => {
    try {
      // Gọi API backend để đảm bảo user đã được tạo/sync trong DB
      await getUserProfile();
    } catch (err) {
      console.error('Error syncing user profile after sign-in:', err);
      // Không chặn flow đăng nhập nếu sync lỗi, chỉ log để debug
    }
  }, [getUserProfile]);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (mode === 'signup') {
      if (!confirmPassword) {
        setError('Vui lòng xác nhận mật khẩu');
        return;
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp');
        return;
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email không hợp lệ');
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        if (!signInLoaded || !signIn) {
          throw new Error('Đăng nhập chưa hoạt động');
        }

        // Create sign-in attempt
        const signInAttempt = await signIn.create({
          identifier: email,
        });

        // Attempt first factor with password
        const result = await signInAttempt.attemptFirstFactor({
          strategy: 'password',
          password,
        });

        if (result.status === 'complete') {
          // Sign in successful -> set active session, sync user với backend rồi chuyển sang khu vực protected
          if (signIn.createdSessionId && setActive) {
            await setActive({ session: signIn.createdSessionId });
          }
          await syncUserProfile();
          router.replace({
            pathname: '/(protected)/(tabs)',
            params: { __replace: 'push' },
          } as any);
        }
      } else {
        if (!signUpLoaded || !signUp) {
          throw new Error('Đăng ký chưa hoạt động');
        }

        // Create sign-up attempt
        const signUpAttempt = await signUp.create({
          emailAddress: email,
          password,
        });

        // Prepare email verification
        await signUpAttempt.prepareEmailAddressVerification({
          strategy: 'email_code',
        });

        // Chuyển sang màn hình verify-email để nhập OTP
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email },
        });
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.errors?.[0]?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Warm up browser khi component mount (giúp OAuth nhanh hơn trên Android)
  useEffect(() => {
    if (Platform.OS === 'android') {
      WebBrowser.warmUpAsync();
      return () => {
        WebBrowser.coolDownAsync();
      };
    }
  }, []);

  // Dùng chung cho Đăng nhập và Đăng ký: Clerk startSSOFlow tự quyết định
  // sign-in (user đã có) hay sign-up (user mới) theo tài khoản Google.
  const handleGoogleAuth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await startSSOFlow({ 
        strategy: "oauth_google",
      });
      
      const { createdSessionId, setActive, signIn, signUp } = result;

      // Trường hợp 1: Đã có session được tạo (thành công)
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        await syncUserProfile();
        // InitialLayout sẽ tự động redirect khi isSignedIn thay đổi
        return;
      }

      // Trường hợp 2: Sign-up flow - cần xử lý các status khác nhau
      if (signUp) {
        if (signUp.status === "complete") {
          // Sign-up đã hoàn tất nhưng không có createdSessionId
          // Điều này có thể xảy ra khi:
          // 1. User đã bị xóa nhưng Clerk vẫn nhớ OAuth connection
          // 2. Có vấn đề với cấu hình Clerk
          setError("Đăng ký thành công nhưng không thể tạo phiên đăng nhập.\n\nNguyên nhân có thể:\n- User đã bị xóa nhưng Clerk vẫn nhớ kết nối Google\n- Có vấn đề với cấu hình Clerk\n\nGiải pháp:\n1. Xóa quyền truy cập của Clerk trong Google Account Settings\n2. Đợi vài phút để Clerk cập nhật cache\n3. Thử đăng ký lại.");
          return;
        } else if (signUp.status === "missing_requirements") {
          // Trường hợp cần thêm thông tin (ví dụ: phone_number, username)
          Alert.alert(
            "Cần cấu hình Clerk",
            `Clerk đang yêu cầu thêm thông tin: ${signUp.missingFields?.join(", ")}.\n\nHãy vào Clerk Dashboard → Configure → Email, Phone, Username và tắt các field không cần thiết (chỉ giữ Email là required).`,
            [{ text: "OK" }]
          );
          return;
        } else if (signUp.status === "abandoned") {
          setError("Quá trình đăng ký đã bị hủy. Vui lòng thử lại.");
          return;
        } else {
          setError(`Trạng thái đăng ký: ${signUp.status}. Vui lòng thử lại.`);
          return;
        }
      }

      // Trường hợp 3: Sign-in flow
      if (signIn) {
        if (signIn.status === "complete") {
          // Sign-in đã hoàn tất nhưng không có createdSessionId
          // Điều này có thể xảy ra khi user đã bị xóa
          setError("Đăng nhập thành công nhưng không thể tạo phiên đăng nhập.\n\nNguyên nhân có thể:\n- User đã bị xóa khỏi Clerk Dashboard\n- Có vấn đề với cấu hình Clerk\n\nGiải pháp:\n1. Kiểm tra Clerk Dashboard xem user có tồn tại không\n2. Nếu user không tồn tại, hãy đăng ký lại\n3. Nếu user tồn tại, kiểm tra cấu hình Clerk.");
          return;
        } else if (signIn.firstFactorVerification?.error) {
          // Có lỗi từ Clerk (ví dụ: waitlist)
          const clerkError = signIn.firstFactorVerification.error;
          setError(clerkError.longMessage || clerkError.message);
          return;
        } else {
          setError(`Trạng thái đăng nhập: ${signIn.status}. Vui lòng thử lại.`);
          return;
        }
      }

      // Trường hợp 4: Không có signIn hoặc signUp - có thể user đã cancel
      setError("Quá trình đăng nhập đã bị hủy hoặc không hoàn tất. Vui lòng thử lại.");
      
    } catch (err: any) {
      console.error("OAuth error:", err);
      setError(err.errors?.[0]?.message || err.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [startSSOFlow, syncUserProfile]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#dcfce7', '#ffffff', '#dcfce7']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: 16, paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ height: insets.top }} />
          <View style={styles.content}>
            {/* Logo Section - trên nền pastel */}
            <View style={styles.logoContainer}>
              <View style={styles.logoWrapper}>
                <Image
                  source={logo}
                  style={styles.logo}
                  contentFit="contain"
                />
              </View>
              <Text style={styles.title}>FinMate</Text>
              <Text style={styles.subtitle}>Quản lý tài chính thông minh với AI</Text>
            </View>

            {/* Card trắng chứa form */}
            <View style={styles.card}>
              {/* Tab Toggle - pill sliding */}
              <View
                style={styles.tabContainer}
                onLayout={(e) => setTabLayoutWidth(e.nativeEvent.layout.width)}
              >
                {tabLayoutWidth > 0 && (
                  <Animated.View
                    style={[
                      styles.tabPill,
                      {
                        width: (tabLayoutWidth - 8) / 2,
                        transform: [
                          {
                            translateX: tabSlideAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, (tabLayoutWidth - 8) / 2],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={['#16a34a', '#22c55e']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.tabPillGradient}
                    />
                  </Animated.View>
                )}
                <TouchableOpacity
                  style={styles.tabTouchable}
                  onPress={() => {
                    setMode('login');
                    setConfirmPassword('');
                    setError(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                    Đăng nhập
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.tabTouchable}
                  onPress={() => {
                    setMode('signup');
                    setConfirmPassword('');
                    setError(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                    Đăng ký
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form */}
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color="#6b7280"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập email của bạn"
                      placeholderTextColor="#9ca3af"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mật khẩu</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#6b7280"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập mật khẩu"
                      placeholderTextColor="#9ca3af"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {mode === 'signup' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Xác nhận mật khẩu</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color="#6b7280"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Nhập lại mật khẩu"
                        placeholderTextColor="#9ca3af"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeIcon}
                      >
                        <Ionicons
                          name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                          size={20}
                          color="#6b7280"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {mode === 'login' && (
                  <TouchableOpacity style={styles.forgotPasswordContainer}>
                    <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
                  </TouchableOpacity>
                )}

                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleEmailAuth}
                  disabled={loading}
                  style={styles.submitButtonContainer}
                >
                  <LinearGradient
                    colors={['#16a34a', '#22c55e']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitButton}
                  >
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>hoặc</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  onPress={handleGoogleAuth}
                  disabled={loading}
                  style={styles.googleButton}
                >
                  <Ionicons name="logo-google" size={16} color="#1e2939" />
                  <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
                </TouchableOpacity>

                <View style={styles.footerContainer}>
                  <Text style={styles.footerText}>Bằng việc đăng nhập, bạn đồng ý với </Text>
                  <TouchableOpacity>
                    <Text style={styles.footerLink}>Điều khoản</Text>
                  </TouchableOpacity>
                  <Text style={styles.footerText}> và </Text>
                  <TouchableOpacity>
                    <Text style={styles.footerLink}>Chính sách bảo mật</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dcfce7',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    maxWidth: 448,
    width: '100%',
    alignSelf: 'center',
    minHeight: 0,
  },
  logoContainer: {
    alignItems: 'center',
    flexShrink: 0,
    marginBottom: 20,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    width: 88,
    height: 88,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#16a34a',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(243, 244, 246, 0.9)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 44,
  },
  tabPill: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  tabPillGradient: {
    flex: 1,
    width: '100%',
    borderRadius: 10,
  },
  tabTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    color: '#737373',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  formContainer: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
    flexShrink: 0,
  },
  label: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#1e2939',
    fontSize: 15,
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
  },
  submitButtonContainer: {
    marginTop: 4,
    flexShrink: 0,
  },
  submitButton: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(34, 197, 94, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 12,
    flexShrink: 0,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontSize: 13,
    color: '#6b7280',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  googleButtonText: {
    color: '#1e2939',
    fontSize: 13,
    fontWeight: '600',
  },
  footerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
    flexShrink: 0,
  },
  footerText: {
    fontSize: 11,
    color: '#6b7280',
  },
  footerLink: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
  },
});
