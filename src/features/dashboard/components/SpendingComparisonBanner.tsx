import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { SpendingComparisonDto } from '@/types/api';

interface SpendingComparisonBannerProps {
  comparison: SpendingComparisonDto | null;
}

export function SpendingComparisonBanner({ comparison }: SpendingComparisonBannerProps) {
  if (!comparison) return null;

  // Income up = good (emerald), income down = bad (rose)
  const incomeGood = comparison.incomeChangeAmount >= 0;
  // Expenses down = good (emerald), expenses up = bad (rose)
  const expensesGood = comparison.expensesChangeAmount <= 0;

  return (
    <div className="grid grid-cols-2 gap-4 rounded-xl border bg-card px-5 py-4 text-sm shadow-sm">
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">Income vs last period</p>
        <p className={cn('font-semibold', incomeGood ? 'text-emerald-600' : 'text-rose-600')}>
          {comparison.incomeChangeAmount >= 0 ? '↑' : '↓'}{' '}
          {formatCurrency(Math.abs(comparison.incomeChangeAmount))}{' '}
          <span className="font-normal text-muted-foreground">
            ({formatPercent(Math.abs(comparison.incomeChangePercent), 1)})
          </span>
        </p>
      </div>
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">Expenses vs last period</p>
        <p className={cn('font-semibold', expensesGood ? 'text-emerald-600' : 'text-rose-600')}>
          {comparison.expensesChangeAmount >= 0 ? '↑' : '↓'}{' '}
          {formatCurrency(Math.abs(comparison.expensesChangeAmount))}{' '}
          <span className="font-normal text-muted-foreground">
            ({formatPercent(Math.abs(comparison.expensesChangePercent), 1)})
          </span>
        </p>
      </div>
    </div>
  );
}
