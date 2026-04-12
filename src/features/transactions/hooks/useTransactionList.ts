import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '@/services/api/transactions';
import type { TransactionListParams } from '@/types/api';

export function useTransactionList(params?: TransactionListParams) {
  return useQuery({
    queryKey: ['transactions', 'list', params],
    queryFn: () => transactionsApi.list(params),
    staleTime: 5 * 60 * 1000,
  });
}
