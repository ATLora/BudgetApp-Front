// src/features/transactions/hooks/useTransactionMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@/services/api/transactions';
import type { CreateTransactionRequest, UpdateTransactionRequest } from '@/types/api';

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransactionRequest) => transactionsApi.create(data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'detail', variables.budgetId] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, budgetId: _budgetId }: { id: string; budgetId: string; data: UpdateTransactionRequest }) =>
      transactionsApi.update(id, data),
    onSuccess: (_result, { id, budgetId }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'detail', budgetId] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; budgetId: string }) => transactionsApi.delete(id),
    onSuccess: (_result, { budgetId }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'detail', budgetId] });
    },
  });
}
