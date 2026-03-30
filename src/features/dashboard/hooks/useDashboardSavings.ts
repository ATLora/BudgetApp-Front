import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api/dashboard';

export function useDashboardSavings() {
  return useQuery({
    queryKey: ['dashboard', 'savings'],
    queryFn: () => dashboardApi.getSavings(),
    staleTime: 5 * 60 * 1000,
  });
}
