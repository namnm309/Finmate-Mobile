/**
 * Goal Service — Offline-First
 * Reads/writes to local SQLite, sync engine handles server communication.
 */
import { useAuth } from '@/hooks/use-auth';
import * as goalRepo from '@/lib/db/repositories/goalRepository';
import type {
  GoalDto,
  CreateGoalRequest,
  UpdateGoalRequest,
} from '@/lib/types/goal';

export const useGoalService = () => {
  const { userId } = useAuth();

  const getAll = async (): Promise<GoalDto[]> => {
    return goalRepo.getAllGoals();
  };

  const getById = async (id: string): Promise<GoalDto> => {
    const result = await goalRepo.getGoalById(id);
    if (!result) throw new Error('Không tìm thấy mục tiêu');
    return result;
  };

  const create = async (data: CreateGoalRequest): Promise<GoalDto> => {
    if (!userId) throw new Error('Chưa đăng nhập');
    return goalRepo.createGoal(data, userId);
  };

  const update = async (id: string, data: UpdateGoalRequest): Promise<GoalDto> => {
    const result = await goalRepo.updateGoal(id, data);
    if (!result) throw new Error('Không tìm thấy mục tiêu');
    return result;
  };

  const remove = async (id: string): Promise<void> => {
    await goalRepo.deleteGoal(id);
  };

  return {
    getAll,
    getById,
    create,
    update,
    remove,
  };
};
