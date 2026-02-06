// Clerk configuration and utilities

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn(
    'Warning: EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY chưa được setup. Điền key vào file .env.local . Vào API Keys trong Clerk dashboard để lấy key này.'
  );
}
