import { useSignIn, useSignUp, useSSO } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Warm up the browser for OAuth - QUAN TRỌNG cho Android
WebBrowser.maybeCompleteAuthSession();

const logo = require('@/assets/images/logo finmate.png');

type AuthMode = 'login' | 'signup';

export default function SignInScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();
  const router = useRouter();

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
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
          throw new Error('Sign in not ready');
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
          // Sign in successful, router will handle redirect
          router.replace('/(protected)/(tabs)');
        }
      } else {
        if (!signUpLoaded || !signUp) {
          throw new Error('Sign up not ready');
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

        // For now, we'll show an alert. In production, you might want a verification screen
        Alert.alert(
          'Xác thực email',
          'Chúng tôi đã gửi mã xác thực đến email của bạn. Vui lòng kiểm tra và xác thực tài khoản.',
          [{ text: 'OK' }]
        );
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
  }, [startSSOFlow, mode]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Logo Section */}
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

          {/* Tab Toggle */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => {
                setMode('login');
                setError(null);
              }}
            >
              {mode === 'login' ? (
                <LinearGradient
                  colors={['#155dfc', '#2b7fff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabGradient}
                >
                  <Text style={styles.tabTextActive}>Đăng nhập</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.tabText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
              onPress={() => {
                setMode('signup');
                setError(null);
              }}
            >
              {mode === 'signup' ? (
                <LinearGradient
                  colors={['#155dfc', '#2b7fff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabGradient}
                >
                  <Text style={styles.tabTextActive}>Đăng ký</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.tabText}>Đăng ký</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#d1d5dc"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập email của bạn"
                  placeholderTextColor="#6a7282"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#d1d5dc"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor="#6a7282"
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
                    color="#d1d5dc"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            {mode === 'login' && (
              <TouchableOpacity style={styles.forgotPasswordContainer}>
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            )}

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleEmailAuth}
              disabled={loading}
              style={styles.submitButtonContainer}
            >
              <LinearGradient
                colors={['#155dfc', '#2b7fff']}
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

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Button */}
            <TouchableOpacity
              onPress={handleGoogleAuth}
              disabled={loading}
              style={styles.googleButton}
            >
              <Ionicons name="logo-google" size={16} color="#1e2939" />
              <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
            </TouchableOpacity>

            {/* Footer Links */}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1729',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  content: {
    flex: 1,
    maxWidth: 448,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a2332',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: 'rgba(120, 91, 239, 0.36)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: 40,
    height: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '400',
    color: '#ffffff',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 15,
    color: '#99a1af',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a2332',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    // Gradient will be applied via LinearGradient component
  },
  tabGradient: {
    flex: 1,
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 15,
    color: '#99a1af',
  },
  tabTextActive: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
  formContainer: {
    gap: 24,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#d1d5dc',
    marginBottom: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2332',
    borderWidth: 1,
    borderColor: '#364153',
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -16,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#51a2ff',
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
    marginTop: 8,
  },
  submitButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(43, 127, 255, 0.3)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#364153',
  },
  dividerText: {
    fontSize: 13,
    color: '#6a7282',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
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
    marginTop: 16,
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: '#6a7282',
  },
  footerLink: {
    fontSize: 15,
    color: '#51a2ff',
    fontWeight: '600',
  },
});
