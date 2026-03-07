// Goal types - matching Finmate-BE API

/** JSON lưu trong Goal.Description - các trường mobile-only */
export interface GoalExtraData {
  salary?: number;
  category?: string;
  daysToAchieve?: number;
  dailyEssential?: number;
  startDate?: string;
  contributions?: { date: string; amount: number }[];
}

export interface GoalDto {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  status: string;
  currency: string;
  icon: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  progressPercentage: number;
}

export interface CreateGoalRequest {
  title: string;
  description?: string | null;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string | null;
  currency?: string;
  icon?: string;
  color?: string;
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string | null;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string | null;
  status?: string;
  currency?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
}
