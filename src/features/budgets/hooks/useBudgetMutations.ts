import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi } from '@/services/api/budgets';
import type { CreateBudgetRequest, UpdateBudgetRequest } from '@/types/api';

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBudgetRequest) => budgetsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

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
