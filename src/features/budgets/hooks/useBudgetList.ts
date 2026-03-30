import { useQuery } from '@tanstack/react-query';
import { budgetsApi } from '@/services/api/budgets';
import type { BudgetListParams } from '@/types/api';

export function useBudgetList(params?: BudgetListParams) {
  return useQuery({
    queryKey: ['budgets', 'list', params],
    queryFn: () => budgetsApi.list(params),
    staleTime: 5 * 60 * 1000,
  });
}
