import { useQuery } from '@tanstack/react-query';
import { budgetsApi } from '@/services/api/budgets';

export function useBudgetHealth(id: string) {
  return useQuery({
    queryKey: ['budgets', 'health', id],
    queryFn: () => budgetsApi.getSummary(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
