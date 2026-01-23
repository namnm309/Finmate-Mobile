import { useCallback, useMemo } from 'react';
import { useApiClient, API_BASE_URL } from '@/lib/api';
import { OverviewReportDto } from '@/lib/types/report';

export const useReportService = () => {
  const { get } = useApiClient();

  // Lấy báo cáo tổng quan thu/chi và thống kê theo danh mục
  // Memoize để đảm bảo function stable
  const getOverview = useCallback(async (
    startDate?: Date,
    endDate?: Date
  ): Promise<OverviewReportDto> => {
    const searchParams = new URLSearchParams();
    
    if (startDate) {
      searchParams.append('startDate', startDate.toISOString());
    }
    if (endDate) {
      searchParams.append('endDate', endDate.toISOString());
    }

    const queryString = searchParams.toString();
    const url = queryString
      ? `${API_BASE_URL}/api/reports/overview?${queryString}`
      : `${API_BASE_URL}/api/reports/overview`;
    
    return get<OverviewReportDto>(url);
  }, [get]);

  // Memoize return value để tránh tạo object mới mỗi lần render
  return useMemo(() => ({
    getOverview,
  }), [getOverview]);
};
