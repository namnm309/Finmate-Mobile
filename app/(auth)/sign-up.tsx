import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SignUpScreen() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to sign-in with signup mode
    router.replace('/(auth)/sign-in?mode=signup');
  }, []);

  return null;
}
