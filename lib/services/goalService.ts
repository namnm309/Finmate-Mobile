import { useApiClient, API_BASE_URL } from '@/lib/api';
import type {
  GoalDto,
  CreateGoalRequest,
  UpdateGoalRequest,
} from '@/lib/types/goal';

export const useGoalService = () => {
  const { get, post, put, delete: del } = useApiClient();

  const getAll = async (): Promise<GoalDto[]> => {
    if (!API_BASE_URL) {
      throw new Error('Chưa cấu hình API. Kiểm tra EXPO_PUBLIC_API_BASE_URL trong .env.local');
    }
    const data = await get<GoalDto[]>(`${API_BASE_URL}/api/goals`);
    if (__DEV__) console.log('[Goals] API trả về', data?.length ?? 0, 'mục tiêu');
    return data ?? [];
  };

  const getById = async (id: string): Promise<GoalDto> => {
    return get<GoalDto>(`${API_BASE_URL}/api/goals/${id}`);
  };

  const create = async (data: CreateGoalRequest): Promise<GoalDto> => {
    if (!API_BASE_URL) throw new Error('Chưa cấu hình API. Kiểm tra EXPO_PUBLIC_API_BASE_URL trong .env.local');
    return post<GoalDto>(`${API_BASE_URL}/api/goals`, data);
  };

  const update = async (
    id: string,
    data: UpdateGoalRequest
  ): Promise<GoalDto> => {
    return put<GoalDto>(`${API_BASE_URL}/api/goals/${id}`, data);
  };

  const remove = async (id: string): Promise<void> => {
    await del(`${API_BASE_URL}/api/goals/${id}`);
  };

  return {
    getAll,
    getById,
    create,
    update,
    remove,
  };
};
