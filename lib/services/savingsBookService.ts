import { useApiClient, API_BASE_URL } from '@/lib/api';
import type {
  SavingsBookDto,
  CreateSavingsBookRequest,
  UpdateSavingsBookRequest,
  SettleSavingsBookRequest,
  DepositSavingsBookRequest,
  WithdrawSavingsBookRequest,
} from '@/lib/types/savingsBook';

export const useSavingsBookService = () => {
  const { get, post, put, delete: del } = useApiClient();

  const getSavingsBooks = async (): Promise<SavingsBookDto[]> => {
    return get<SavingsBookDto[]>(`${API_BASE_URL}/api/savings-books`);
  };

  const getSavingsBookById = async (id: string): Promise<SavingsBookDto> => {
    return get<SavingsBookDto>(`${API_BASE_URL}/api/savings-books/${id}`);
  };

  const createSavingsBook = async (data: CreateSavingsBookRequest): Promise<SavingsBookDto> => {
    return post<SavingsBookDto>(`${API_BASE_URL}/api/savings-books`, data);
  };

  const updateSavingsBook = async (id: string, data: UpdateSavingsBookRequest): Promise<SavingsBookDto> => {
    return put<SavingsBookDto>(`${API_BASE_URL}/api/savings-books/${id}`, data);
  };

  const deleteSavingsBook = async (id: string): Promise<void> => {
    await del(`${API_BASE_URL}/api/savings-books/${id}`);
  };

  const depositSavingsBook = async (id: string, data: DepositSavingsBookRequest): Promise<SavingsBookDto> => {
    return post<SavingsBookDto>(`${API_BASE_URL}/api/savings-books/${id}/deposit`, data);
  };

  const withdrawSavingsBook = async (id: string, data: WithdrawSavingsBookRequest): Promise<SavingsBookDto> => {
    return post<SavingsBookDto>(`${API_BASE_URL}/api/savings-books/${id}/withdraw`, data);
  };

  const settleSavingsBook = async (id: string, data: SettleSavingsBookRequest): Promise<SavingsBookDto> => {
    return post<SavingsBookDto>(`${API_BASE_URL}/api/savings-books/${id}/settle`, data);
  };

  return {
    getSavingsBooks,
    getSavingsBookById,
    createSavingsBook,
    updateSavingsBook,
    deleteSavingsBook,
    depositSavingsBook,
    withdrawSavingsBook,
    settleSavingsBook,
  };
};
