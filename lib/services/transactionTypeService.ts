/**
 * Transaction Type Service — Cached from local SQLite
 * Reference data fetched from server and cached locally.
 */
import { useApiClient, API_BASE_URL } from '@/lib/api';
import { TransactionTypeDto } from '@/lib/types/transaction';
import * as refDataRepo from '@/lib/db/repositories/referenceDataRepository';
import { isOnline } from '@/lib/sync/networkMonitor';

export const useTransactionTypeService = () => {
  const { get } = useApiClient();

  // Lấy danh sách loại giao dịch — local cache first, fallback API
  const getTransactionTypes = async (): Promise<TransactionTypeDto[]> => {
    const local = await refDataRepo.getAllTransactionTypes();
    if (local.length > 0) return local;

    // Not cached yet — fetch from API
    if (isOnline()) {
      const remote = await get<TransactionTypeDto[]>(`${API_BASE_URL}/api/transaction-types`);
      await refDataRepo.upsertTransactionTypes(remote);
      return remote;
    }

    return [];
  };

  // Lấy chi tiết loại giao dịch
  const getTransactionTypeById = async (id: string): Promise<TransactionTypeDto> => {
    const local = await refDataRepo.getTransactionTypeById(id);
    if (local) return local;

    if (isOnline()) {
      const remote = await get<TransactionTypeDto>(`${API_BASE_URL}/api/transaction-types/${id}`);
      return remote;
    }

    throw new Error('Không tìm thấy loại giao dịch');
  };

  return {
    getTransactionTypes,
    getTransactionTypeById,
  };
};
