import { useQuery } from '@tanstack/react-query';
import { savingsApi } from '@/services/api/savings';

export function useSavingsGoalProgress(id: string) {
  return useQuery({
    queryKey: ['savings', 'progress', id],
    queryFn: () => savingsApi.getProgress(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
