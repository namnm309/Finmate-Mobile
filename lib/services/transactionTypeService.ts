import { useApiClient, API_BASE_URL } from '@/lib/api';
import { TransactionTypeDto } from '@/lib/types/transaction';

export const useTransactionTypeService = () => {
  const { get } = useApiClient();

  // Lấy danh sách tất cả loại giao dịch (4 loại cố định: Chi tiêu, Thu tiền, Cho vay, Đi vay)
  const getTransactionTypes = async (): Promise<TransactionTypeDto[]> => {
    return get<TransactionTypeDto[]>(`${API_BASE_URL}/api/transaction-types`);
  };

  // Lấy chi tiết loại giao dịch
  const getTransactionTypeById = async (id: string): Promise<TransactionTypeDto> => {
    return get<TransactionTypeDto>(`${API_BASE_URL}/api/transaction-types/${id}`);
  };

  return {
    getTransactionTypes,
    getTransactionTypeById,
  };
};
