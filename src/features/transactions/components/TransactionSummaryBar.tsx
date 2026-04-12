// src/features/transactions/components/TransactionSummaryBar.tsx
import { formatCurrency } from '@/lib/formatters';
import type { TransactionSummaryDto } from '@/types/api';

interface StatCardProps {
  label: string;
  value: string;
  colorClass: string;
}

function StatCard({ label, value, colorClass }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${colorClass}`}>{value}</p>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      <div className="mt-1.5 h-5 w-24 animate-pulse rounded bg-muted" />
    </div>
  );
}

interface TransactionSummaryBarProps {
  data: TransactionSummaryDto | undefined;
  isLoading: boolean;
}

export function TransactionSummaryBar({ data, isLoading }: TransactionSummaryBarProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const income = data?.totalIncome ?? 0;
  const expenses = data?.totalExpenses ?? 0;
  const savings = data?.totalSavingsDeposits ?? 0;
  const netFlow = data?.netCashFlow ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard label="Income" value={formatCurrency(income)} colorClass="text-emerald-600" />
      <StatCard label="Expenses" value={formatCurrency(expenses)} colorClass="text-rose-600" />
      <StatCard label="Savings" value={formatCurrency(savings)} colorClass="text-sky-600" />
      <StatCard
        label="Net Flow"
        value={`${netFlow >= 0 ? '+' : ''}${formatCurrency(netFlow)}`}
        colorClass={netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}
      />
    </div>
  );
}
