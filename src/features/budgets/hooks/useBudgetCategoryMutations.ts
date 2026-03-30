import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi } from '@/services/api/budgets';
import type { AddBudgetCategoryRequest, UpdateBudgetCategoryRequest } from '@/types/api';

export function useAddBudgetCategory(budgetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddBudgetCategoryRequest) => budgetsApi.addCategory(budgetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'detail', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'report', budgetId] });
    },
  });
}

export function useUpdateBudgetCategory(budgetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ catId, data }: { catId: string; data: UpdateBudgetCategoryRequest }) =>
      budgetsApi.updateCategory(budgetId, catId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'detail', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'report', budgetId] });
    },
  });
}

export function useDeleteBudgetCategory(budgetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (catId: string) => budgetsApi.deleteCategory(budgetId, catId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'detail', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'report', budgetId] });
    },
  });
}
