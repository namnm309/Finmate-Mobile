/**
 * Savings Book Service — Offline-First
 * Reads/writes to local SQLite, sync engine handles server communication.
 * 
 * Note: deposit/withdraw/settle operations still use API directly
 * because they involve complex server-side balance calculations.
 */
import { useAuth } from '@/hooks/use-auth';
import { useApiClient, API_BASE_URL } from '@/lib/api';
import { isOnline } from '@/lib/sync/networkMonitor';
import * as savingsBookRepo from '@/lib/db/repositories/savingsBookRepository';
import type {
  SavingsBookDto,
  CreateSavingsBookRequest,
  UpdateSavingsBookRequest,
  SettleSavingsBookRequest,
  DepositSavingsBookRequest,
  WithdrawSavingsBookRequest,
} from '@/lib/types/savingsBook';

export const useSavingsBookService = () => {
  const { userId } = useAuth();
  const { post } = useApiClient();

  // Lấy danh sách sổ tiết kiệm — từ LOCAL
  const getSavingsBooks = async (): Promise<SavingsBookDto[]> => {
    return savingsBookRepo.getAllSavingsBooks();
  };

  // Lấy chi tiết — từ LOCAL
  const getSavingsBookById = async (id: string): Promise<SavingsBookDto> => {
    const result = await savingsBookRepo.getSavingsBookById(id);
    if (!result) throw new Error('Không tìm thấy sổ tiết kiệm');
    return result;
  };

  // Tạo — LOCAL first
  const createSavingsBook = async (data: CreateSavingsBookRequest): Promise<SavingsBookDto> => {
    if (!userId) throw new Error('Chưa đăng nhập');
    return savingsBookRepo.createSavingsBook(data, userId);
  };

  // Cập nhật — LOCAL first
  const updateSavingsBook = async (id: string, data: UpdateSavingsBookRequest): Promise<SavingsBookDto> => {
    const result = await savingsBookRepo.updateSavingsBook(id, data);
    if (!result) throw new Error('Không tìm thấy sổ tiết kiệm');
    return result;
  };

  // Xóa — LOCAL first
  const deleteSavingsBook = async (id: string): Promise<void> => {
    await savingsBookRepo.deleteSavingsBook(id);
  };

  // Deposit/Withdraw/Settle — Cần internet (server-side calculation)
  const depositSavingsBook = async (id: string, data: DepositSavingsBookRequest): Promise<SavingsBookDto> => {
    if (!isOnline()) throw new Error('Cần kết nối internet để nạp tiền vào sổ tiết kiệm');
    return post<SavingsBookDto>(`${API_BASE_URL}/api/savings-books/${id}/deposit`, data);
  };

  const withdrawSavingsBook = async (id: string, data: WithdrawSavingsBookRequest): Promise<SavingsBookDto> => {
    if (!isOnline()) throw new Error('Cần kết nối internet để rút tiền từ sổ tiết kiệm');
    return post<SavingsBookDto>(`${API_BASE_URL}/api/savings-books/${id}/withdraw`, data);
  };

  const settleSavingsBook = async (id: string, data: SettleSavingsBookRequest): Promise<SavingsBookDto> => {
    if (!isOnline()) throw new Error('Cần kết nối internet để tất toán sổ tiết kiệm');
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
