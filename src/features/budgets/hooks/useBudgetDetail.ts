import { useQuery } from '@tanstack/react-query';
import { budgetsApi } from '@/services/api/budgets';

export function useBudgetDetail(id: string) {
  return useQuery({
    queryKey: ['budgets', 'detail', id],
    queryFn: () => budgetsApi.getById(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
