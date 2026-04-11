/**
 * Money Source Service — Offline-First
 * Reads/writes to local SQLite, sync engine handles server communication.
 */
import { useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import * as moneySourceRepo from '@/lib/db/repositories/moneySourceRepository';
import * as refDataRepo from '@/lib/db/repositories/referenceDataRepository';
import {
  MoneySourceDto,
  MoneySourceGroupedResponseDto,
  AccountTypeDto,
  CurrencyDto,
  IconDto,
  CreateMoneySourceRequest,
  UpdateMoneySourceRequest,
} from '@/lib/types/moneySource';
import { useApiClient, API_BASE_URL } from '@/lib/api';
import { isOnline } from '@/lib/sync/networkMonitor';

export const useMoneySourceService = () => {
  const { userId } = useAuth();
  const { get } = useApiClient();

  // Lấy danh sách nguồn tiền đã group — từ LOCAL
  const getGroupedMoneySources = useCallback(async (): Promise<MoneySourceGroupedResponseDto> => {
    return moneySourceRepo.getGroupedMoneySources();
  }, []);

  // Lấy danh sách nguồn tiền flat — từ LOCAL
  const getMoneySources = useCallback(async (): Promise<MoneySourceDto[]> => {
    return moneySourceRepo.getAllMoneySources();
  }, []);

  // Lấy chi tiết nguồn tiền — từ LOCAL
  const getMoneySourceById = useCallback(async (id: string): Promise<MoneySourceDto> => {
    const result = await moneySourceRepo.getMoneySourceById(id);
    if (!result) throw new Error('Không tìm thấy nguồn tiền');
    return result;
  }, []);

  // Tạo nguồn tiền — LOCAL first
  const createMoneySource = useCallback(async (data: CreateMoneySourceRequest): Promise<MoneySourceDto> => {
    if (!userId) throw new Error('Chưa đăng nhập');
    return moneySourceRepo.createMoneySource(data, userId);
  }, [userId]);

  // Cập nhật nguồn tiền — LOCAL first
  const updateMoneySource = useCallback(async (id: string, data: UpdateMoneySourceRequest): Promise<MoneySourceDto> => {
    const result = await moneySourceRepo.updateMoneySource(id, data);
    if (!result) throw new Error('Không tìm thấy nguồn tiền');
    return result;
  }, []);

  // Xóa nguồn tiền — LOCAL first
  const deleteMoneySource = useCallback(async (id: string): Promise<{ message: string }> => {
    await moneySourceRepo.deleteMoneySource(id);
    return { message: 'Đã xóa nguồn tiền' };
  }, []);

  // Reference data — từ local cache, fallback API
  const getAccountTypes = useCallback(async (): Promise<AccountTypeDto[]> => {
    const local = await refDataRepo.getAllAccountTypes();
    if (local.length > 0) return local;
    // Fallback: fetch from API and cache
    if (isOnline()) {
      const remote = await get<AccountTypeDto[]>(`${API_BASE_URL}/api/account-types`);
      await refDataRepo.upsertAccountTypes(remote);
      return remote;
    }
    return [];
  }, [get]);

  const getCurrencies = useCallback(async (): Promise<CurrencyDto[]> => {
    const local = await refDataRepo.getAllCurrencies();
    if (local.length > 0) return local;
    if (isOnline()) {
      const remote = await get<CurrencyDto[]>(`${API_BASE_URL}/api/currencies`);
      await refDataRepo.upsertCurrencies(remote);
      return remote;
    }
    return [];
  }, [get]);

  // Icons vẫn từ API (static, ít thay đổi)
  const getIcons = useCallback(async (): Promise<IconDto[]> => {
    if (isOnline()) {
      return get<IconDto[]>(`${API_BASE_URL}/api/money-sources/icons`);
    }
    return [];
  }, [get]);

  return {
    getGroupedMoneySources,
    getMoneySources,
    getMoneySourceById,
    createMoneySource,
    updateMoneySource,
    deleteMoneySource,
    getAccountTypes,
    getCurrencies,
    getIcons,
  };
};
