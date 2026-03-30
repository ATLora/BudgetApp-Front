import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api/dashboard';
import type { DashboardSpendingParams } from '@/types/api';

export function useDashboardSpending(params?: DashboardSpendingParams) {
  return useQuery({
    queryKey: ['dashboard', 'spending', params],
    queryFn: () => dashboardApi.getSpending(params),
    staleTime: 5 * 60 * 1000,
  });
}
