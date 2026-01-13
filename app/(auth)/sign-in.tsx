import { useAuth, useOAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// Hoàn tất OAuth flow trong WebBrowser
WebBrowser.maybeCompleteAuthSession();

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SignInScreen() {
  const params = useLocalSearchParams();
  const isSignUpParam = params.mode === 'signup';
  
  const { signIn, setActive: setActiveSignIn, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: isSignUpLoaded } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const { isSignedIn } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState(isSignUpParam ? 1 : 0);
  const [tabAnimation] = useState(new Animated.Value(isSignUpParam ? 1 : 0));
  
  const screenWidth = Dimensions.get('window').width;
  const tabContainerWidth = screenWidth - 48;
  const tabWidth = (tabContainerWidth - 8) / 2;

  useEffect(() => {
    const targetValue = isSignUpParam ? 1 : 0;
    if (targetValue !== activeTab) {
      setActiveTab(targetValue);
      Animated.spring(tabAnimation, {
        toValue: targetValue,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [isSignUpParam]);

  // Tự động redirect khi đăng nhập thành công
  useEffect(() => {
    if (isSignedIn) {
      router.replace('/(protected)/(tabs)');
    }
  }, [isSignedIn, router]);

  const handleTabChange = (tabIndex: number) => {
    if (tabIndex === activeTab) return;
    
    setActiveTab(tabIndex);
    Animated.spring(tabAnimation, {
      toValue: tabIndex,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
    
    // Clear form when switching tabs for better UX
    if (tabIndex === 0) {
      setConfirmPassword('');
    }
  };

  const handleSignIn = async () => {
    if (!isSignInLoaded) return;

    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActiveSignIn({ session: result.createdSessionId });
        router.replace('/(protected)/(tabs)');
      } else {
        Alert.alert('Lỗi', 'Đăng nhập không thành công. Vui lòng thử lại.');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.errors?.[0]?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!isSignUpLoaded) return;

    if (!email || !password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu không khớp');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      if (result.status === 'complete') {
        await setActiveSignUp({ session: result.createdSessionId });
        router.replace('/(protected)/(tabs)');
      } else {
        Alert.alert(
          'Yêu cầu xác thực',
          'Vui lòng kiểm tra email để lấy mã xác thực. Bạn có thể xác thực sau.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/(protected)/(tabs)');
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.errors?.[0]?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/(protected)/(tabs)'),
      });

      if (createdSessionId) {
        await setActive({ session: createdSessionId });
        // Đợi một chút để đảm bảo session được set
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // Navigate - ProtectedLayout sẽ tự động xử lý nếu đã signed in
        router.replace('/(protected)/(tabs)');
      } else {
        // Nếu không có sessionId, có thể cần thêm bước xác thực
        Alert.alert('Thông báo', 'Vui lòng hoàn tất quá trình đăng nhập');
      }
    } catch (error: any) {
      // Người dùng có thể đã hủy OAuth flow
      if (error.errors?.[0]?.code !== 'oauth_cancelled') {
        console.error('OAuth error:', error);
        Alert.alert('Lỗi', error.errors?.[0]?.message || 'Đăng nhập với Google thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/FinmateIconOnly_Transparent_NoBuffer.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <ThemedText style={styles.appName}>FinMate</ThemedText>
            <ThemedText style={styles.tagline}>Quản lý tài chính thông minh với AI</ThemedText>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <Animated.View
              style={[
                styles.tabIndicator,
                {
                  transform: [
                    {
                      translateX: tabAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, tabWidth],
                      }),
                    },
                  ],
                },
              ]}
            />
            <TouchableOpacity
              style={[styles.tab, activeTab === 0 && styles.tabActive]}
              onPress={() => handleTabChange(0)}>
              <ThemedText style={activeTab === 0 ? styles.tabTextActive : styles.tabTextInactive}>
                Đăng nhập
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 1 && styles.tabActive]}
              onPress={() => handleTabChange(1)}>
              <ThemedText style={activeTab === 1 ? styles.tabTextActive : styles.tabTextInactive}>
                Đăng ký
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="email" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="youremail@gmail.com"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              {activeTab === 0 && (
                <View style={styles.passwordLabelContainer}>
                  <ThemedText style={styles.label}>Mật khẩu</ThemedText>
                  <TouchableOpacity onPress={() => {}}>
                    <ThemedText style={styles.forgotPassword}>Quên mật khẩu?</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
              {activeTab === 1 && <ThemedText style={styles.label}>Mật khẩu</ThemedText>}
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete={activeTab === 0 ? 'password' : 'password-new'}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}>
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input - Only for Sign Up */}
            {activeTab === 1 && (
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Xác nhận mật khẩu</ThemedText>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập lại mật khẩu"
                    placeholderTextColor="#999"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="password-new"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}>
                    <MaterialIcons
                      name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color="#999"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={activeTab === 0 ? handleSignIn : handleSignUp}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.loginButtonText}>
                  {activeTab === 0 ? 'Đăng nhập' : 'Đăng ký'}
                </ThemedText>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <ThemedText style={styles.dividerText}>hoặc</ThemedText>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login Buttons */}
            <TouchableOpacity 
              style={[styles.googleButton, loading && styles.buttonDisabled]} 
              onPress={handleGoogleSignIn}
              disabled={loading}>
              <View style={styles.googleIconContainer}>
                <ThemedText style={styles.googleIconText}>G</ThemedText>
              </View>
              <ThemedText style={styles.googleButtonText}>Tiếp tục với Google</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.facebookButton} onPress={() => {}}>
              <View style={styles.facebookIconContainer}>
                <ThemedText style={styles.facebookIconText}>f</ThemedText>
              </View>
              <ThemedText style={styles.facebookButtonText}>Tiếp tục với Facebook</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Bằng việc {activeTab === 0 ? 'đăng nhập' : 'đăng ký'}, bạn đồng ý với{' '}
              <ThemedText style={styles.footerLink}>Điều khoản</ThemedText> và{' '}
              <ThemedText style={styles.footerLink}>Chính sách bảo mật</ThemedText>
            </ThemedText>
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#2A2A3E',
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: '50%',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    zIndex: 0,
    minHeight: 44,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 1,
  },
  tabActive: {
    backgroundColor: 'transparent',
  },
  tabInactive: {
    backgroundColor: 'transparent',
  },
  tabTextActive: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabTextInactive: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '500',
  },
  passwordLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPassword: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A3E',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#CCCCCC',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  facebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1877F2',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  facebookIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1877F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  facebookIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  facebookButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    fontSize: 12,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});
