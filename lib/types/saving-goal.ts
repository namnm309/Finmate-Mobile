// Shared types cho mục tiêu tiết kiệm (mobile)

export interface ContributionEntry {
  date: string; // YYYY-MM-DD
  amount: number;
}

export interface SavingGoalData {
  id: string;
  salary: number;
  title: string;
  category: string;
  targetAmount: number;
  daysToAchieve: number;
  dailyEssential: number;
  currentAmount: number;
  startDate: string;
  contributions: ContributionEntry[];
}
