import type { GoalDto } from '@/lib/types/goal';
import type { SavingGoalData } from '@/lib/types/saving-goal';

export function goalDtoToSavingGoal(dto: GoalDto): SavingGoalData {
  let extra = { salary: 0, category: 'Khác', daysToAchieve: 90, dailyEssential: 0, startDate: new Date().toISOString(), contributions: [] as { date: string; amount: number }[] };
  if (dto.description) {
    try {
      const parsed = JSON.parse(dto.description) as Record<string, unknown>;
      extra = {
        salary: (parsed.salary as number) ?? 0,
        category: (parsed.category as string) ?? 'Khác',
        daysToAchieve: (parsed.daysToAchieve as number) ?? 90,
        dailyEssential: (parsed.dailyEssential as number) ?? 0,
        startDate: (parsed.startDate as string) ?? new Date().toISOString(),
        contributions: Array.isArray(parsed.contributions) ? (parsed.contributions as { date: string; amount: number }[]) : [],
      };
    } catch {
      // keep defaults
    }
  }
  return {
    id: dto.id,
    salary: extra.salary,
    title: dto.title,
    category: extra.category,
    targetAmount: dto.targetAmount,
    daysToAchieve: extra.daysToAchieve,
    dailyEssential: extra.dailyEssential,
    currentAmount: dto.currentAmount,
    startDate: extra.startDate,
    contributions: extra.contributions,
  };
}
