import { client } from './client';
import type {
  CreateTransactionRequest,
  TransactionDetailDto,
  TransactionDto,
  TransactionListParams,
  TransactionSummaryDto,
  TransactionSummaryParams,
  UpdateTransactionRequest,
} from '@/types/api';

export const transactionsApi = {
  list: (params?: TransactionListParams) =>
    client.get<TransactionDto[]>('/api/v1/transactions', { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get<TransactionDetailDto>(`/api/v1/transactions/${id}`).then((r) => r.data),

  create: (data: CreateTransactionRequest) =>
    client.post<string>('/api/v1/transactions', data).then((r) => r.data),

  update: (id: string, data: UpdateTransactionRequest) =>
    client.put(`/api/v1/transactions/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    client.delete(`/api/v1/transactions/${id}`).then((r) => r.data),

  getSummary: (params?: TransactionSummaryParams) =>
    client.get<TransactionSummaryDto>('/api/v1/transactions/summary', { params }).then((r) => r.data),
};
