import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api/dashboard';
import type { DashboardSummaryParams } from '@/types/api';

export function useDashboardSummary(params?: DashboardSummaryParams) {
  return useQuery({
    queryKey: ['dashboard', 'summary', params],
    queryFn: () => dashboardApi.getSummary(params),
    staleTime: 5 * 60 * 1000,
  });
}
