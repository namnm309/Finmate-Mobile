import { useApiClient, API_BASE_URL } from '@/lib/api';
import type { BankDto } from '@/lib/types/savingsBook';

export const useBankService = () => {
  const { get } = useApiClient();

  const getAll = async (): Promise<BankDto[]> => {
    return get<BankDto[]>(`${API_BASE_URL}/api/banks`);
  };

  const getById = async (id: string): Promise<BankDto> => {
    return get<BankDto>(`${API_BASE_URL}/api/banks/${id}`);
  };

  return {
    getAll,
    getById,
  };
};
