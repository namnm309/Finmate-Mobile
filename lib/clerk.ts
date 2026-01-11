// Clerk configuration and utilities

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn(
    'Warning: EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. Please add it to your .env.local file'
  );
}
