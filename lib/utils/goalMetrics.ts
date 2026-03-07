import type { SavingGoalData } from '@/lib/types/saving-goal';

/**
 * Tính toán số tiền cần tiết kiệm mỗi ngày và số ngày còn lại,
 * đảm bảo không vượt quá khả năng chi trả (lương - chi tiêu thiết yếu).
 */
export function computeGoalMetrics(goal: SavingGoalData) {
  const remaining = goal.targetAmount - goal.currentAmount;
  const salaryPerDay = goal.salary / 30;
  const maxAffordableDaily = Math.max(0, salaryPerDay - goal.dailyEssential);
  const originalDailyNeeded = goal.daysToAchieve > 0 ? goal.targetAmount / goal.daysToAchieve : 0;

  let daysRemaining: number;
  let dailyAmount: number;

  if (remaining <= 0) {
    daysRemaining = 0;
    dailyAmount = 0;
  } else if (maxAffordableDaily <= 0) {
    daysRemaining = 999;
    dailyAmount = 0;
  } else {
    const idealDaysRemaining =
      originalDailyNeeded > 0 ? Math.max(1, Math.ceil(remaining / originalDailyNeeded)) : 999;
    const idealDailyAmount = idealDaysRemaining > 0 ? Math.ceil(remaining / idealDaysRemaining) : 0;

    if (idealDailyAmount <= maxAffordableDaily) {
      daysRemaining = idealDaysRemaining;
      dailyAmount = idealDailyAmount;
    } else {
      daysRemaining = Math.max(1, Math.ceil(remaining / maxAffordableDaily));
      dailyAmount = Math.ceil(remaining / daysRemaining);
    }
  }

  const todaySuggestion = Math.max(0, goal.dailyEssential);
  return { dailyAmount, daysRemaining, todaySuggestion, remaining };
}
