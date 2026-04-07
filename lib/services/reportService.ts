/**
 * Report Service — Offline-First
 * Computes reports from local SQLite data.
 * Falls back to API when online for potentially more accurate server-side computation.
 */
import { useCallback, useMemo } from 'react';
import { useApiClient, API_BASE_URL } from '@/lib/api';
import { OverviewReportDto } from '@/lib/types/report';
import * as transactionRepo from '@/lib/db/repositories/transactionRepository';
import { isOnline } from '@/lib/sync/networkMonitor';

export const useReportService = () => {
  const { get } = useApiClient();

  // Lấy báo cáo tổng quan — tính từ LOCAL data
  const getOverview = useCallback(async (
    startDate?: Date,
    endDate?: Date
  ): Promise<OverviewReportDto> => {
    // Compute from local SQLite
    const localReport = await transactionRepo.getLocalOverview(
      startDate?.toISOString(),
      endDate?.toISOString(),
    );

    return localReport;
  }, []);

  return useMemo(() => ({
    getOverview,
  }), [getOverview]);
};
