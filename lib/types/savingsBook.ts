// SavingsBook types - matching BE DTOs

export interface BankDto {
  id: string;
  name: string;
  code?: string;
  displayOrder: number;
}

export interface SavingsBookDto {
  id: string;
  userId: string;
  bankId: string;
  bankName: string;
  name: string;
  currency: string;
  depositDate: string;
  termMonths: number;
  interestRate: number;
  nonTermInterestRate: number;
  daysInYearForInterest: number;
  interestPaymentType: string;
  maturityOption: string;
  sourceMoneySourceId?: string;
  description?: string;
  excludeFromReports: boolean;
  initialBalance: number;
  currentBalance: number;
  maturityDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavingsBookRequest {
  name: string;
  bankId: string;
  currency?: string;
  depositDate: string;
  termMonths: number;
  interestRate?: number;
  nonTermInterestRate?: number;
  daysInYearForInterest?: number;
  interestPaymentType?: string;
  maturityOption?: string;
  sourceMoneySourceId?: string;
  description?: string;
  excludeFromReports?: boolean;
  initialBalance?: number;
}

export interface UpdateSavingsBookRequest {
  name?: string;
  bankId?: string;
  currency?: string;
  depositDate?: string;
  termMonths?: number;
  interestRate?: number;
  nonTermInterestRate?: number;
  daysInYearForInterest?: number;
  interestPaymentType?: string;
  maturityOption?: string;
  sourceMoneySourceId?: string;
  description?: string;
  excludeFromReports?: boolean;
}

export interface SettleSavingsBookRequest {
  amount?: number;
  settlementDate: string;
  destinationMoneySourceId: string;
}

export interface DepositSavingsBookRequest {
  amount: number;
  sourceMoneySourceId?: string;
  date?: string;
}

export interface WithdrawSavingsBookRequest {
  amount: number;
  destinationMoneySourceId: string;
  date?: string;
}
