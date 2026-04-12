// src/features/transactions/TransactionsPage.tsx
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransactionType } from '@/types/api';
import type { TransactionType as TxType, TransactionListParams } from '@/types/api';
import { useBudgetList } from '@/features/budgets/hooks/useBudgetList';
import { useTransactionList } from './hooks/useTransactionList';
import { useTransactionSummary } from './hooks/useTransactionSummary';
import { TransactionSummaryBar } from './components/TransactionSummaryBar';
import { TransactionCard } from './components/TransactionCard';
import { TransactionFormDialog } from './components/TransactionFormDialog';

export function TransactionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [budgetFilter, setBudgetFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<TxType | undefined>(undefined);
  const [fromFilter, setFromFilter] = useState<string | undefined>(undefined);
  const [toFilter, setToFilter] = useState<string | undefined>(undefined);

  const budgetsQuery = useBudgetList();
  const budgets = budgetsQuery.data ?? [];

  const listParams: TransactionListParams = {
    ...(budgetFilter ? { budgetId: budgetFilter } : {}),
    ...(typeFilter ? { transactionType: typeFilter } : {}),
    ...(fromFilter ? { from: fromFilter } : {}),
    ...(toFilter ? { to: toFilter } : {}),
  };

  const listQuery = useTransactionList(listParams);
  const summaryQuery = useTransactionSummary({
    ...(budgetFilter ? { budgetId: budgetFilter } : {}),
    ...(fromFilter ? { from: fromFilter } : {}),
    ...(toFilter ? { to: toFilter } : {}),
  });

  const transactions = listQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track your income and expenses
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Transaction
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type */}
        <Select
          value={typeFilter ?? '__all__'}
          onValueChange={(v) =>
            setTypeFilter(!v || v === '__all__' ? undefined : (v as TxType))
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All types</SelectItem>
            <SelectItem value={TransactionType.Income}>Income</SelectItem>
            <SelectItem value={TransactionType.Expense}>Expense</SelectItem>
            <SelectItem value={TransactionType.SavingsDeposit}>Savings Deposit</SelectItem>
            <SelectItem value={TransactionType.SavingsWithdrawal}>
              Savings Withdrawal
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Budget */}
        <Select
          value={budgetFilter ?? '__all__'}
          onValueChange={(v) => setBudgetFilter(!v || v === '__all__' ? undefined : v)}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All budgets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All budgets</SelectItem>
            {budgets.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range */}
        <Input
          type="date"
          className="w-36"
          value={fromFilter ?? ''}
          onChange={(e) => setFromFilter(e.target.value || undefined)}
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          className="w-36"
          value={toFilter ?? ''}
          onChange={(e) => setToFilter(e.target.value || undefined)}
        />
      </div>

      {/* Summary bar */}
      <TransactionSummaryBar data={summaryQuery.data} isLoading={summaryQuery.isLoading} />

      {/* Transaction list */}
      {listQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4 shadow-sm text-sm">
          <p className="text-muted-foreground">Could not load transactions.</p>
          <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-xl border bg-card px-5 py-12 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">No transactions found.</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => setDialogOpen(true)}
          >
            Add your first transaction
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {transactions.map((t) => (
            <TransactionCard key={t.id} transaction={t} />
          ))}
        </div>
      )}

      {/* Create dialog — pre-fill budgetId if a budget filter is active */}
      <TransactionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="create"
        defaultValues={budgetFilter ? { budgetId: budgetFilter } : undefined}
      />
    </div>
  );
}
