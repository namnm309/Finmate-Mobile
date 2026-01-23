import { useApiClient, API_BASE_URL } from '@/lib/api';
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
  const { get, post, put, delete: del } = useApiClient();

  // Lấy danh sách giao dịch (có filter và pagination)
  const getTransactions = async (params?: GetTransactionsParams): Promise<TransactionListResponseDto> => {
    const searchParams = new URLSearchParams();
    
    if (params?.transactionTypeId) searchParams.append('transactionTypeId', params.transactionTypeId);
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params?.moneySourceId) searchParams.append('moneySourceId', params.moneySourceId);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());

    const queryString = searchParams.toString();
    const url = queryString
      ? `${API_BASE_URL}/api/transactions?${queryString}`
      : `${API_BASE_URL}/api/transactions`;
    
    return get<TransactionListResponseDto>(url);
  };

  // Lấy chi tiết giao dịch
  const getTransactionById = async (id: string): Promise<TransactionDto> => {
    return get<TransactionDto>(`${API_BASE_URL}/api/transactions/${id}`);
  };

  // Tạo giao dịch mới
  const createTransaction = async (data: CreateTransactionRequest): Promise<TransactionDto> => {
    return post<TransactionDto>(`${API_BASE_URL}/api/transactions`, data);
  };

  // Cập nhật giao dịch
  const updateTransaction = async (id: string, data: UpdateTransactionRequest): Promise<TransactionDto> => {
    return put<TransactionDto>(`${API_BASE_URL}/api/transactions/${id}`, data);
  };

  // Xóa giao dịch
  const deleteTransaction = async (id: string): Promise<{ message: string }> => {
    return del<{ message: string }>(`${API_BASE_URL}/api/transactions/${id}`);
  };

  return {
    getTransactions,
    getTransactionById,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
};
