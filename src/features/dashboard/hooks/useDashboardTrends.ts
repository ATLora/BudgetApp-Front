import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api/dashboard';
import type { DashboardTrendsParams } from '@/types/api';

export function useDashboardTrends(params?: DashboardTrendsParams) {
  return useQuery({
    queryKey: ['dashboard', 'trends', params],
    queryFn: () => dashboardApi.getTrends(params),
    staleTime: 5 * 60 * 1000,
  });
}
