import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '@/services/api/transactions';
import type { TransactionSummaryParams } from '@/types/api';

export function useTransactionSummary(params?: TransactionSummaryParams) {
  return useQuery({
    queryKey: ['transactions', 'summary', params],
    queryFn: () => transactionsApi.getSummary(params),
    staleTime: 5 * 60 * 1000,
  });
}
