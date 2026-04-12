import { useQuery } from '@tanstack/react-query';
import { savingsApi } from '@/services/api/savings';

export function useSavingsGoalDetail(id: string) {
  return useQuery({
    queryKey: ['savings', 'detail', id],
    queryFn: () => savingsApi.getById(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
