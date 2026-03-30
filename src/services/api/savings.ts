import { client } from './client';
import type {
  AddContributionRequest,
  ContributionDto,
  CreateSavingsGoalRequest,
  SavingsGoalDetailDto,
  SavingsGoalProgressDto,
  SavingsGoalStatus,
  SavingsGoalSummaryDto,
  UpdateSavingsGoalRequest,
} from '@/types/api';

export const savingsApi = {
  list: () =>
    client.get<SavingsGoalSummaryDto[]>('/api/v1/savings-goals').then((r) => r.data),

  getById: (id: string) =>
    client.get<SavingsGoalDetailDto>(`/api/v1/savings-goals/${id}`).then((r) => r.data),

  create: (data: CreateSavingsGoalRequest) =>
    client.post<string>('/api/v1/savings-goals', data).then((r) => r.data),

  update: (id: string, data: UpdateSavingsGoalRequest) =>
    client.put(`/api/v1/savings-goals/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    client.delete(`/api/v1/savings-goals/${id}`).then((r) => r.data),

  getProgress: (id: string) =>
    client.get<SavingsGoalProgressDto>(`/api/v1/savings-goals/${id}/progress`).then((r) => r.data),

  updateStatus: (id: string, status: SavingsGoalStatus) =>
    client.patch(`/api/v1/savings-goals/${id}/status`, { status }).then((r) => r.data),

  addContribution: (id: string, data: AddContributionRequest) =>
    client.post<string>(`/api/v1/savings-goals/${id}/contributions`, data).then((r) => r.data),

  getContribution: (id: string, contributionId: string) =>
    client.get<ContributionDto>(`/api/v1/savings-goals/${id}/contributions/${contributionId}`).then((r) => r.data),

  deleteContribution: (id: string, contributionId: string) =>
    client.delete(`/api/v1/savings-goals/${id}/contributions/${contributionId}`).then((r) => r.data),
};
