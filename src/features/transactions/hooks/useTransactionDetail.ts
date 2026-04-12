import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '@/services/api/transactions';

export function useTransactionDetail(id: string) {
  return useQuery({
    queryKey: ['transactions', 'detail', id],
    queryFn: () => transactionsApi.getById(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
