import { client } from './client';
import type {
  DashboardSavingsDto,
  DashboardSpendingDto,
  DashboardSpendingParams,
  DashboardSummaryDto,
  DashboardSummaryParams,
  DashboardTrendsDto,
  DashboardTrendsParams,
} from '@/types/api';

export const dashboardApi = {
  getSummary: (params?: DashboardSummaryParams) =>
    client.get<DashboardSummaryDto>('/api/v1/dashboard/summary', { params }).then((r) => r.data),

  getSpending: (params?: DashboardSpendingParams) =>
    client.get<DashboardSpendingDto>('/api/v1/dashboard/spending', { params }).then((r) => r.data),

  getSavings: () =>
    client.get<DashboardSavingsDto>('/api/v1/dashboard/savings').then((r) => r.data),

  getTrends: (params?: DashboardTrendsParams) =>
    client.get<DashboardTrendsDto>('/api/v1/dashboard/trends', { params }).then((r) => r.data),
};
