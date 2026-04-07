/**
 * Bank Service — Cached from local SQLite
 * Reference data fetched from server and cached locally.
 */
import { useApiClient, API_BASE_URL } from '@/lib/api';
import type { BankDto } from '@/lib/types/savingsBook';
import * as refDataRepo from '@/lib/db/repositories/referenceDataRepository';
import { isOnline } from '@/lib/sync/networkMonitor';

export const useBankService = () => {
  const { get } = useApiClient();

  const getAll = async (): Promise<BankDto[]> => {
    const local = await refDataRepo.getAllBanks();
    if (local.length > 0) return local;

    if (isOnline()) {
      const remote = await get<BankDto[]>(`${API_BASE_URL}/api/banks`);
      await refDataRepo.upsertBanks(remote);
      return remote;
    }

    return [];
  };

  const getById = async (id: string): Promise<BankDto> => {
    const local = await refDataRepo.getBankById(id);
    if (local) return local;

    if (isOnline()) {
      return get<BankDto>(`${API_BASE_URL}/api/banks/${id}`);
    }

    throw new Error('Không tìm thấy ngân hàng');
  };

  return {
    getAll,
    getById,
  };
};
