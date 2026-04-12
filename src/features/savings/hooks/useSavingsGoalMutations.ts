import { useMutation, useQueryClient } from '@tanstack/react-query';
import { savingsApi } from '@/services/api/savings';
import type {
  CreateSavingsGoalRequest,
  UpdateSavingsGoalRequest,
  AddContributionRequest,
  SavingsGoalStatus,
} from '@/types/api';

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSavingsGoalRequest) => savingsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSavingsGoalRequest }) =>
      savingsApi.update(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['savings', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['savings', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => savingsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateSavingsGoalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SavingsGoalStatus }) =>
      savingsApi.updateStatus(id, status),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['savings', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['savings', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['savings', 'progress', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAddContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, data }: { goalId: string; data: AddContributionRequest }) =>
      savingsApi.addContribution(goalId, data),
    onSuccess: (_result, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: ['savings', 'detail', goalId] });
      queryClient.invalidateQueries({ queryKey: ['savings', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['savings', 'progress', goalId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, contributionId }: { goalId: string; contributionId: string }) =>
      savingsApi.deleteContribution(goalId, contributionId),
    onSuccess: (_result, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: ['savings', 'detail', goalId] });
      queryClient.invalidateQueries({ queryKey: ['savings', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['savings', 'progress', goalId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
