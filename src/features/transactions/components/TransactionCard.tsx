// src/features/transactions/components/TransactionCard.tsx
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { TransactionDto } from '@/types/api';

const CATEGORY_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Income: { bg: 'bg-emerald-500/15', text: 'text-emerald-600' },
  Expense: { bg: 'bg-rose-500/15', text: 'text-rose-600' },
  Savings: { bg: 'bg-sky-500/15', text: 'text-sky-600' },
};

const AMOUNT_COLOR: Record<string, string> = {
  Income: 'text-emerald-600',
  Expense: 'text-rose-600',
  SavingsDeposit: 'text-sky-600',
  SavingsWithdrawal: 'text-amber-600',
};

const AMOUNT_SIGN: Record<string, string> = {
  Income: '+',
  Expense: '-',
  SavingsDeposit: '+',
  SavingsWithdrawal: '-',
};

interface TransactionCardProps {
  transaction: TransactionDto;
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const navigate = useNavigate();
  const colors = CATEGORY_TYPE_COLORS[transaction.categoryType] ?? CATEGORY_TYPE_COLORS['Expense'];
  const amountColor = AMOUNT_COLOR[transaction.transactionType] ?? 'text-foreground';
  const sign = AMOUNT_SIGN[transaction.transactionType] ?? '';

  function handleClick() {
    navigate(`/transactions/${transaction.id}`);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className="flex cursor-pointer items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${colors.bg} ${colors.text}`}
        >
          {transaction.categoryName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{transaction.description}</p>
          <p className="text-xs text-muted-foreground">
            {transaction.categoryName} · {formatDate(transaction.transactionDate, 'MMM d, yyyy')}
          </p>
        </div>
      </div>
      <p className={`ml-4 flex-shrink-0 text-sm font-semibold ${amountColor}`}>
        {sign}{formatCurrency(transaction.amount)}
      </p>
    </div>
  );
}
