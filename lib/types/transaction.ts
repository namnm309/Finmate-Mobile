// Transaction types - matching BE DTOs

export interface TransactionTypeDto {
  id: string;
  name: string;
  color: string;
  isIncome: boolean;
  displayOrder: number;
}

export interface CategoryDto {
  id: string;
  userId: string;
  transactionTypeId: string;
  transactionTypeName: string;
  name: string;
  icon: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionDto {
  id: string;
  userId: string;
  transactionTypeId: string;
  transactionTypeName: string;
  transactionTypeColor: string;
  isIncome: boolean;
  moneySourceId: string;
  moneySourceName: string;
  moneySourceIcon: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  contactId?: string;
  contactName?: string;
  amount: number;
  transactionDate: string;
  description?: string;
  isBorrowingForThis: boolean;
  isFee: boolean;
  excludeFromReport: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionListResponseDto {
  totalCount: number;
  page: number;
  pageSize: number;
  transactions: TransactionDto[];
}

export interface CreateTransactionRequest {
  transactionTypeId: string;
  moneySourceId: string;
  categoryId: string;
  contactId?: string;
  amount: number;
  transactionDate: string; // ISO date string
  description?: string;
  isBorrowingForThis?: boolean;
  isFee?: boolean;
  excludeFromReport?: boolean;
}
