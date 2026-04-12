import { useQuery } from '@tanstack/react-query';
import { savingsApi } from '@/services/api/savings';

export function useSavingsGoalList() {
  return useQuery({
    queryKey: ['savings', 'list'],
    queryFn: () => savingsApi.list(),
    staleTime: 5 * 60 * 1000,
  });
}
