export interface MonthlyExpense {
  id: string;
  amount: number;
  moneySourceId: string;
  moneySourceName: string;
  description?: string;
  createdAt: string; // ISO
}

export interface MonthlyExpenseNotification {
  id: string;
  message: string;
  amount: number;
  moneySourceName: string;
  processedAt: string; // ISO
  read: boolean;
}
