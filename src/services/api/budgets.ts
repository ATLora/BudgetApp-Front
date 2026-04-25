import { client } from './client';
import type {
  AddBudgetCategoryRequest,
  BudgetCategoryDto,
  BudgetDetailDto,
  BudgetListParams,
  BudgetSummaryDto,
  BudgetSummaryReportDto,
  CreateBudgetRequest,
  UpdateBudgetCategoryRequest,
  UpdateBudgetRequest,
} from '@/types/api';

export const budgetsApi = {
  list: (params?: BudgetListParams) =>
    client.get<BudgetSummaryDto[]>('/api/v1/budgets', { params }).then((r) => r.data),

  create: (data: CreateBudgetRequest) =>
    client.post<string>('/api/v1/budgets', data).then((r) => r.data),

  getById: (id: string) =>
    client.get<BudgetDetailDto>(`/api/v1/budgets/${id}`).then((r) => r.data),

  update: (id: string, data: UpdateBudgetRequest) =>
    client.put(`/api/v1/budgets/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    client.delete(`/api/v1/budgets/${id}`).then((r) => r.data),

  getReport: (id: string) =>
    client.get<BudgetSummaryReportDto>(`/api/v1/budgets/${id}/summary`).then((r) => r.data),

  getCategories: (id: string) =>
    client.get<BudgetCategoryDto[]>(`/api/v1/budgets/${id}/categories`).then((r) => r.data),

  addCategory: (id: string, data: AddBudgetCategoryRequest) =>
    client.post(`/api/v1/budgets/${id}/categories`, data).then((r) => r.data),

  updateCategory: (id: string, catId: string, data: UpdateBudgetCategoryRequest) =>
    client.put(`/api/v1/budgets/${id}/categories/${catId}`, data).then((r) => r.data),

  deleteCategory: (id: string, catId: string) =>
    client.delete(`/api/v1/budgets/${id}/categories/${catId}`).then((r) => r.data),

  rollForward: (id: string) =>
    client.post<string>(`/api/v1/budgets/${id}/roll-forward`).then((r) => r.data),
};
