import { useApiClient, API_BASE_URL } from '@/lib/api';
import {
  MoneySourceDto,
  MoneySourceGroupedResponseDto,
  AccountTypeDto,
  CurrencyDto,
  IconDto,
  CreateMoneySourceRequest,
  UpdateMoneySourceRequest,
} from '@/lib/types/moneySource';

export const useMoneySourceService = () => {
  const { get, post, put, delete: del } = useApiClient();

  // Lấy danh sách nguồn tiền đã group theo AccountType (cho màn Account)
  const getGroupedMoneySources = async (): Promise<MoneySourceGroupedResponseDto> => {
    return get<MoneySourceGroupedResponseDto>(`${API_BASE_URL}/api/money-sources/grouped`);
  };

  // Lấy danh sách nguồn tiền (flat list)
  const getMoneySources = async (): Promise<MoneySourceDto[]> => {
    return get<MoneySourceDto[]>(`${API_BASE_URL}/api/money-sources`);
  };

  // Lấy chi tiết nguồn tiền
  const getMoneySourceById = async (id: string): Promise<MoneySourceDto> => {
    return get<MoneySourceDto>(`${API_BASE_URL}/api/money-sources/${id}`);
  };

  // Tạo nguồn tiền mới
  const createMoneySource = async (data: CreateMoneySourceRequest): Promise<MoneySourceDto> => {
    return post<MoneySourceDto>(`${API_BASE_URL}/api/money-sources`, data);
  };

  // Cập nhật nguồn tiền
  const updateMoneySource = async (id: string, data: UpdateMoneySourceRequest): Promise<MoneySourceDto> => {
    return put<MoneySourceDto>(`${API_BASE_URL}/api/money-sources/${id}`, data);
  };

  // Xóa nguồn tiền
  const deleteMoneySource = async (id: string): Promise<{ message: string }> => {
    return del<{ message: string }>(`${API_BASE_URL}/api/money-sources/${id}`);
  };

  // Lấy danh sách loại tài khoản (AccountType)
  const getAccountTypes = async (): Promise<AccountTypeDto[]> => {
    return get<AccountTypeDto[]>(`${API_BASE_URL}/api/account-types`);
  };

  // Lấy danh sách tiền tệ
  const getCurrencies = async (): Promise<CurrencyDto[]> => {
    return get<CurrencyDto[]>(`${API_BASE_URL}/api/currencies`);
  };

  // Lấy danh sách icon có sẵn
  const getIcons = async (): Promise<IconDto[]> => {
    return get<IconDto[]>(`${API_BASE_URL}/api/money-sources/icons`);
  };

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
