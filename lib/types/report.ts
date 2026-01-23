export interface CategoryStatDto {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface OverviewReportDto {
  totalIncome: number;
  totalExpense: number;
  difference: number;
  categoryStats: CategoryStatDto[];
}
