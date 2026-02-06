import { useSignUp, useClerk } from '@clerk/clerk-expo';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserService } from '@/lib/services/userService';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { setActive } = useClerk();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getUserProfile } = useUserService();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer cho resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const syncUserProfile = useCallback(async () => {
    try {
      await getUserProfile();
    } catch (err) {
      console.error('Error syncing user profile after sign-up:', err);
    }
  }, [getUserProfile]);

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số');
      return;
    }

    if (!signUpLoaded || !signUp) {
      setError('Hệ thống chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verify OTP với Clerk
      const result = await signUp.attemptEmailAddressVerification({
        code: otp,
      });

      if (result.status === 'complete') {
        // Sign-up hoàn tất, tạo session và đăng nhập
        // Lấy sessionId từ result hoặc signUp
        const sessionId = result.createdSessionId || signUp.createdSessionId;
        
        if (sessionId && setActive) {
          // Set active session
          await setActive({ session: sessionId });
          
          // Sync user với backend
          await syncUserProfile();
          
          // Redirect vào app
          router.replace('/(protected)/(tabs)');
        } else {
          setError('Đăng ký thành công nhưng không thể tạo phiên đăng nhập. Vui lòng thử đăng nhập lại.');
        }
      } else {
        setError('Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error('OTP verification error:', err);
      const errorMessage = err.errors?.[0]?.message || err.message || 'Mã xác thực không hợp lệ. Vui lòng thử lại.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) {
      return;
    }

    if (!signUpLoaded || !signUp) {
      setError('Hệ thống chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }

    setResendLoading(true);
    setError(null);

    try {
      // Prepare email verification lại để gửi OTP mới
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });

      // Set cooldown 60 giây
      setResendCooldown(60);
    } catch (err: any) {
      console.error('Resend OTP error:', err);
      setError(err.errors?.[0]?.message || 'Không thể gửi lại mã. Vui lòng thử lại.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Kiểm tra signUp state khi component mount
  useEffect(() => {
    // Clerk SDK sẽ tự động persist signUp state qua navigation
    // Nếu không có signUp object hoặc signUp đã complete (đã verify xong), quay lại màn hình đăng ký
    // Nhưng chỉ check khi chưa có session (chưa verify thành công)
    if (signUpLoaded && (!signUp || (signUp.status === 'complete' && !signUp.createdSessionId))) {
      router.replace('/(auth)/sign-in');
    }
  }, [signUpLoaded, signUp, router]);

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
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>

            <View style={styles.iconContainer}>
              <View style={styles.iconWrapper}>
                <Ionicons name="mail-outline" size={48} color="#ffffff" />
              </View>
            </View>

            <Text style={styles.title}>Xác thực email</Text>
            <Text style={styles.subtitle}>
              Chúng tôi đã gửi mã xác thực đến{'\n'}
              <Text style={styles.emailText}>{email || 'email của bạn'}</Text>
            </Text>

            <View style={styles.card}>
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mã xác thực (6 chữ số)</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="key-outline"
                      size={20}
                      color="#6b7280"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập mã 6 chữ số"
                      placeholderTextColor="#9ca3af"
                      value={otp}
                      onChangeText={(text) => {
                        const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
                        setOtp(numericText);
                        setError(null);
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
              </View>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Verify Button */}
            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              style={styles.submitButtonContainer}
            >
              <LinearGradient
                colors={otp.length === 6 && !loading ? ['#16a34a', '#22c55e'] : ['#9ca3af', '#9ca3af']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButton}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Xác thực</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Resend Section */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Không nhận được mã? </Text>
              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={resendLoading || resendCooldown > 0}
              >
                {resendLoading ? (
                  <ActivityIndicator size="small" color="#22c55e" />
                ) : (
                  <Text style={styles.resendButtonText}>
                    {resendCooldown > 0
                      ? `Gửi lại (${resendCooldown}s)`
                      : 'Gửi lại mã'}
                  </Text>
                )}
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
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    maxWidth: 448,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    marginTop: 0,
    marginBottom: 16,
    padding: 8,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#16a34a',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emailText: {
    color: '#22c55e',
    fontWeight: '600',
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
  formContainer: {
    gap: 24,
  },
  inputGroup: {
    gap: 6,
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
    height: 56,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: '#1e2939',
    fontSize: 20,
    letterSpacing: 6,
    fontWeight: '600',
    textAlign: 'center',
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
    textAlign: 'center',
  },
  submitButtonContainer: {
    marginTop: 8,
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
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  resendText: {
    fontSize: 13,
    color: '#6b7280',
  },
  resendButtonText: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '600',
  },
});
