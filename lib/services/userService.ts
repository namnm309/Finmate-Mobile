import { useApiClient } from '@/lib/api';
import { API_BASE_URL } from '@/lib/api';
import { UserResponse, UpdateUserRequest, DeleteResponse } from '@/lib/types/user';

export const useUserService = () => {
  const { get, put, delete: del } = useApiClient();

  const getUserProfile = async (): Promise<UserResponse> => {
    return get<UserResponse>(`${API_BASE_URL}/api/users/me`);
  };

  const updateUserProfile = async (data: UpdateUserRequest): Promise<UserResponse> => {
    return put<UserResponse>(`${API_BASE_URL}/api/users/me`, data);
  };

  const deleteUserData = async (): Promise<DeleteResponse> => {
    return del<DeleteResponse>(`${API_BASE_URL}/api/users/me/data`);
  };

  const deleteUserAccount = async (): Promise<DeleteResponse> => {
    return del<DeleteResponse>(`${API_BASE_URL}/api/users/me`);
  };

  return {
    getUserProfile,
    updateUserProfile,
    deleteUserData,
    deleteUserAccount,
  };
};
