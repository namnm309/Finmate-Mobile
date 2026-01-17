export interface UserResponse {
  id: string;
  clerkUserId?: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  address?: string;
  occupation?: string;
  dateOfBirth?: string; // ISO date string
  isActive: boolean;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UpdateUserRequest {
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string; // ISO date string
  occupation?: string;
  avatarUrl?: string;
}

export interface DeleteResponse {
  message: string;
}
