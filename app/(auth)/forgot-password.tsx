import { useSignIn, useClerk } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

import { useUserService } from '@/lib/services/userService';

type Step = 'email' | 'reset';

export default function ForgotPasswordScreen() {
  const { signIn, isLoaded } = useSignIn();
  const { setActive } = useClerk();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getUserProfile } = useUserService();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
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
      console.error('Error syncing user profile after password reset:', err);
    }
  }, [getUserProfile]);

  // Bước 1: Gửi mã OTP tới email
  const handleSendCode = async () => {
    if (!email) {
      setError('Vui lòng nhập email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email không hợp lệ');
      return;
    }

    if (!isLoaded || !signIn) {
      setError('Hệ thống chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Tạo sign-in attempt với email
      const signInAttempt = await signIn.create({
        identifier: email,
      });

      // Tìm email address ID để gửi reset code
      const emailFactor = signInAttempt.supportedFirstFactors?.find(
        (factor: any) => factor.strategy === 'reset_password_email_code'
      ) as any;

      if (!emailFactor) {
        setError(
          'Tài khoản này không hỗ trợ đặt lại mật khẩu qua email. Có thể tài khoản được đăng ký bằng Google.'
        );
        return;
      }

      // Gửi OTP reset password
      await signIn.prepareFirstFactor({
        strategy: 'reset_password_email_code',
        emailAddressId: emailFactor.emailAddressId,
      });

      setSuccessMsg(`Mã xác thực đã được gửi tới ${email}`);
      setStep('reset');
      setResendCooldown(60);
    } catch (err: any) {
      console.error('Send reset code error:', err);
      const clerkError = err.errors?.[0];
      if (clerkError?.code === 'form_identifier_not_found') {
        setError('Không tìm thấy tài khoản với email này');
      } else {
        setError(
          clerkError?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendCode = async () => {
    if (resendCooldown > 0 || !isLoaded || !signIn) return;

    setResendLoading(true);
    setError(null);

    try {
      const signInAttempt = await signIn.create({
        identifier: email,
      });

      const emailFactor = signInAttempt.supportedFirstFactors?.find(
        (factor: any) => factor.strategy === 'reset_password_email_code'
      ) as any;

      if (emailFactor) {
        await signIn.prepareFirstFactor({
          strategy: 'reset_password_email_code',
          emailAddressId: emailFactor.emailAddressId,
        });
        setResendCooldown(60);
        setSuccessMsg('Mã xác thực mới đã được gửi');
      }
    } catch (err: any) {
      console.error('Resend code error:', err);
      setError(
        err.errors?.[0]?.message || 'Không thể gửi lại mã. Vui lòng thử lại.'
      );
    } finally {
      setResendLoading(false);
    }
  };

  // Bước 2: Xác thực OTP + đặt mật khẩu mới
  const handleResetPassword = async () => {
    if (!otp || otp.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số');
      return;
    }

    if (!newPassword) {
      setError('Vui lòng nhập mật khẩu mới');
      return;
    }

    if (newPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!isLoaded || !signIn) {
      setError('Hệ thống chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: otp,
        password: newPassword,
      });

      if (result.status === 'complete') {
        // Đặt lại mật khẩu thành công → tạo session → đăng nhập tự động
        const sessionId = result.createdSessionId || signIn.createdSessionId;

        if (sessionId && setActive) {
          await setActive({ session: sessionId });
          await syncUserProfile();
          router.replace({
            pathname: '/(protected)/(tabs)',
            params: { __replace: 'push' },
          } as any);
        } else {
          setError(
            'Đặt lại mật khẩu thành công nhưng không thể tạo phiên đăng nhập. Vui lòng đăng nhập lại.'
          );
        }
      } else if (result.status === 'needs_second_factor') {
        setError(
          'Tài khoản có bảo mật 2 lớp. Vui lòng liên hệ hỗ trợ.'
        );
      } else {
        setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      const clerkError = err.errors?.[0];
      if (clerkError?.code === 'form_code_incorrect') {
        setError('Mã xác thực không đúng. Vui lòng kiểm tra lại.');
      } else if (clerkError?.code === 'form_password_pwned') {
        setError(
          'Mật khẩu này đã bị lộ trong các vụ rò rỉ dữ liệu. Vui lòng chọn mật khẩu khác.'
        );
      } else if (clerkError?.code === 'form_password_length_too_short') {
        setError('Mật khẩu quá ngắn. Vui lòng chọn mật khẩu ít nhất 8 ký tự.');
      } else {
        setError(
          clerkError?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'reset') {
      setStep('email');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccessMsg(null);
    } else {
      router.back();
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────

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
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Nút Back */}
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>

            {/* Header Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={step === 'email' ? 'lock-open-outline' : 'shield-checkmark-outline'}
                  size={48}
                  color="#ffffff"
                />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {step === 'email' ? 'Quên mật khẩu' : 'Đặt lại mật khẩu'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? 'Nhập email bạn đã đăng ký để nhận mã xác thực'
                : `Nhập mã xác thực đã gửi đến\n`}
              {step === 'reset' && (
                <Text style={styles.emailHighlight}>{email}</Text>
              )}
            </Text>

            {/* Card Form */}
            <View style={styles.card}>
              <View style={styles.formContainer}>
                {/* ─── BƯỚC 1: NHẬP EMAIL ─── */}
                {step === 'email' && (
                  <>
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
                          onChangeText={(text) => {
                            setEmail(text);
                            setError(null);
                          }}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          autoFocus
                        />
                      </View>
                    </View>

                    {error && (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={handleSendCode}
                      disabled={loading || !email}
                      style={styles.submitButtonContainer}
                    >
                      <LinearGradient
                        colors={
                          email && !loading
                            ? ['#16a34a', '#22c55e']
                            : ['#9ca3af', '#9ca3af']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitButton}
                      >
                        {loading ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text style={styles.submitButtonText}>
                            Gửi mã xác thực
                          </Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}

                {/* ─── BƯỚC 2: NHẬP OTP + MẬT KHẨU MỚI ─── */}
                {step === 'reset' && (
                  <>
                    {/* Success message */}
                    {successMsg && (
                      <View style={styles.successContainer}>
                        <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                        <Text style={styles.successText}>{successMsg}</Text>
                      </View>
                    )}

                    {/* OTP Input */}
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
                          style={styles.otpInput}
                          placeholder="Nhập mã 6 chữ số"
                          placeholderTextColor="#9ca3af"
                          value={otp}
                          onChangeText={(text) => {
                            const numericText = text
                              .replace(/[^0-9]/g, '')
                              .slice(0, 6);
                            setOtp(numericText);
                            setError(null);
                            setSuccessMsg(null);
                          }}
                          keyboardType="number-pad"
                          maxLength={6}
                          autoFocus
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </View>

                    {/* New Password */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Mật khẩu mới</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons
                          name="lock-closed-outline"
                          size={20}
                          color="#6b7280"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Tối thiểu 8 ký tự"
                          placeholderTextColor="#9ca3af"
                          value={newPassword}
                          onChangeText={(text) => {
                            setNewPassword(text);
                            setError(null);
                          }}
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

                    {/* Confirm Password */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons
                          name="lock-closed-outline"
                          size={20}
                          color="#6b7280"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Nhập lại mật khẩu mới"
                          placeholderTextColor="#9ca3af"
                          value={confirmPassword}
                          onChangeText={(text) => {
                            setConfirmPassword(text);
                            setError(null);
                          }}
                          secureTextEntry={!showConfirmPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <TouchableOpacity
                          onPress={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          style={styles.eyeIcon}
                        >
                          <Ionicons
                            name={
                              showConfirmPassword
                                ? 'eye-outline'
                                : 'eye-off-outline'
                            }
                            size={20}
                            color="#6b7280"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Error */}
                    {error && (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                      onPress={handleResetPassword}
                      disabled={loading}
                      style={styles.submitButtonContainer}
                    >
                      <LinearGradient
                        colors={
                          otp.length === 6 && newPassword && !loading
                            ? ['#16a34a', '#22c55e']
                            : ['#9ca3af', '#9ca3af']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitButton}
                      >
                        {loading ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text style={styles.submitButtonText}>
                            Đặt lại mật khẩu
                          </Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Resend Code */}
                    <View style={styles.resendContainer}>
                      <Text style={styles.resendText}>
                        Không nhận được mã?{' '}
                      </Text>
                      <TouchableOpacity
                        onPress={handleResendCode}
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
                  </>
                )}

                {/* Back to login link */}
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.backToLoginContainer}
                >
                  <Ionicons name="arrow-back" size={14} color="#22c55e" />
                  <Text style={styles.backToLoginText}>
                    Quay lại đăng nhập
                  </Text>
                </TouchableOpacity>
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
  },
  backButton: {
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
    shadowColor: 'rgba(34, 197, 94, 0.4)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
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
  emailHighlight: {
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
    gap: 14,
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
  otpInput: {
    flex: 1,
    color: '#1e2939',
    fontSize: 20,
    letterSpacing: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  eyeIcon: {
    padding: 4,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  successText: {
    color: '#16a34a',
    fontSize: 13,
    flex: 1,
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
    marginTop: 4,
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
    marginTop: 4,
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
  backToLoginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  backToLoginText: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '500',
  },
});
