/**
 * Transaction Service — Offline-First
 * Reads/writes to local SQLite, sync engine handles server communication.
 */
import { useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import * as transactionRepo from '@/lib/db/repositories/transactionRepository';
import { getPendingChangesCount } from '@/lib/sync/syncEngine';
import {
  TransactionDto,
  TransactionListResponseDto,
  CreateTransactionRequest,
} from '@/lib/types/transaction';

export interface UpdateTransactionRequest {
  transactionTypeId?: string;
  moneySourceId?: string;
  categoryId?: string;
  contactId?: string;
  amount?: number;
  transactionDate?: string;
  description?: string;
  isBorrowingForThis?: boolean;
  isFee?: boolean;
  excludeFromReport?: boolean;
}

export interface GetTransactionsParams {
  transactionTypeId?: string;
  categoryId?: string;
  moneySourceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export const useTransactionService = () => {
  const { userId } = useAuth();

  // Lấy danh sách giao dịch từ LOCAL SQLite
  const getTransactions = useCallback(
    async (params?: GetTransactionsParams): Promise<TransactionListResponseDto> => {
      return transactionRepo.getTransactions(params);
    },
    [],
  );

  // Lấy chi tiết giao dịch từ LOCAL
  const getTransactionById = useCallback(
    async (id: string): Promise<TransactionDto> => {
      const result = await transactionRepo.getTransactionById(id);
      if (!result) throw new Error('Không tìm thấy giao dịch');
      return result;
    },
    [],
  );

  // Tạo giao dịch — lưu LOCAL, sync engine sẽ đẩy lên server
  const createTransaction = useCallback(
    async (data: CreateTransactionRequest): Promise<TransactionDto> => {
      if (!userId) throw new Error('Chưa đăng nhập');
      return transactionRepo.createTransaction(data, userId);
    },
    [userId],
  );

  // Cập nhật giao dịch LOCAL
  const updateTransaction = useCallback(
    async (id: string, data: UpdateTransactionRequest): Promise<TransactionDto> => {
      const result = await transactionRepo.updateTransaction(id, data);
      if (!result) throw new Error('Không tìm thấy giao dịch');
      return result;
    },
    [],
  );

  // Xóa giao dịch LOCAL (soft-delete, sync engine xóa trên server)
  const deleteTransaction = useCallback(
    async (id: string): Promise<{ message: string }> => {
      await transactionRepo.deleteTransaction(id);
      return { message: 'Đã xóa giao dịch' };
    },
    [],
  );

  return {
    getTransactions,
    getTransactionById,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
};
