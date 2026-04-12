import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi } from '@/services/api/budgets';
import type { CreateBudgetRequest, UpdateBudgetRequest } from '@/types/api';
import type { PendingBudgetCategory } from '../types';

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBudgetRequest }) =>
      budgetsApi.update(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => budgetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRollForwardBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => budgetsApi.rollForward(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

interface CreateBudgetWithCategoriesInput {
  budgetData: CreateBudgetRequest;
  categories: PendingBudgetCategory[];
}

export function useCreateBudgetWithCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ budgetData, categories }: CreateBudgetWithCategoriesInput) => {
      // Step 1: create the budget — backend calculates totals from categories
      const budgetId = await budgetsApi.create(budgetData);

      // Step 2: add all pending categories that have a category selected
      const committed = categories.filter((c) => c.category !== null);
      await Promise.all(
        committed.map((c) =>
          budgetsApi.addCategory(budgetId, {
            categoryId: c.category!.id,
            plannedAmount: c.plannedAmount,
            notes: c.notes || null,
          }),
        ),
      );

      return budgetId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
