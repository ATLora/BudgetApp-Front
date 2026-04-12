// src/features/transactions/TransactionDetailPage.tsx
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { useTransactionDetail } from './hooks/useTransactionDetail';
import { useDeleteTransaction } from './hooks/useTransactionMutations';
import { TransactionFormDialog } from './components/TransactionFormDialog';
import type { TransactionFormData } from './components/TransactionFormDialog';

const TYPE_LABELS: Record<string, string> = {
  Income: 'Income',
  Expense: 'Expense',
  SavingsDeposit: 'Savings Deposit',
  SavingsWithdrawal: 'Savings Withdrawal',
};

const TYPE_AMOUNT_COLOR: Record<string, string> = {
  Income: 'text-emerald-600',
  Expense: 'text-rose-600',
  SavingsDeposit: 'text-sky-600',
  SavingsWithdrawal: 'text-amber-600',
};

const TYPE_SIGN: Record<string, string> = {
  Income: '+',
  Expense: '-',
  SavingsDeposit: '+',
  SavingsWithdrawal: '-',
};

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [editOpen, setEditOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const detailQuery = useTransactionDetail(id ?? '');
  const deleteMutation = useDeleteTransaction();
  const transaction = detailQuery.data;

  function handleDelete() {
    if (!id) return;
    setDeleteError(null);
    deleteMutation.mutate(
      { id, budgetId: transaction?.budgetId ?? '' },
      {
        onSuccess: () => navigate('/transactions'),
        onError: (err) => {
          setDeleteError(
            axios.isAxiosError(err)
              ? err.response?.data?.detail || err.response?.data?.title || err.message
              : 'Failed to delete transaction.',
          );
        },
      },
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (detailQuery.isError || !transaction) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          to="/transactions"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transactions
        </Link>
        <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4 shadow-sm text-sm">
          <p className="text-muted-foreground">Could not load transaction.</p>
          <Button variant="outline" size="sm" onClick={() => detailQuery.refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const editDefaultValues: Partial<TransactionFormData> = {
    budgetId: transaction.budgetId,
    categoryId: transaction.categoryId,
    transactionType: transaction.transactionType,
    amount: transaction.amount,
    description: transaction.description,
    transactionDate: transaction.transactionDate,
    notes: transaction.notes ?? '',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Back */}
      <Link
        to="/transactions"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Transactions
      </Link>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="truncate text-2xl font-semibold">{transaction.description}</h1>
          <p className="text-sm text-muted-foreground">
            {transaction.budgetName} · {transaction.categoryName} ·{' '}
            {formatDate(transaction.transactionDate, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => {
              setShowDeleteConfirm(true);
              setDeleteError(null);
            }}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Amount card */}
      <div className="rounded-xl border bg-card px-5 py-4 shadow-sm">
        <p className="text-xs text-muted-foreground">Amount</p>
        <p
          className={`mt-1 text-3xl font-bold ${
            TYPE_AMOUNT_COLOR[transaction.transactionType] ?? 'text-foreground'
          }`}
        >
          {TYPE_SIGN[transaction.transactionType] ?? ''}
          {formatCurrency(transaction.amount)}
        </p>
        <span className="mt-2 inline-block rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {TYPE_LABELS[transaction.transactionType] ?? transaction.transactionType}
        </span>
      </div>

      {/* Detail fields */}
      <div className="rounded-xl border bg-card px-5 py-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="mt-0.5 font-medium">{transaction.budgetName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Category</p>
            <p className="mt-0.5 font-medium">{transaction.categoryName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Transaction Date</p>
            <p className="mt-0.5 font-medium">
              {formatDate(transaction.transactionDate, 'MMM d, yyyy')}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Recorded</p>
            <p className="mt-0.5 font-medium">
              {formatDate(transaction.createdAt, 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        {transaction.notes && (
          <div className="mt-4 border-t pt-4">
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm">{transaction.notes}</p>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm">
          <p className="font-medium text-destructive">
            Delete this transaction? This cannot be undone.
          </p>
          {deleteError && <p className="mt-1 text-destructive">{deleteError}</p>}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Confirm Delete'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <TransactionFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        transactionId={id}
        defaultValues={editDefaultValues}
        onSuccess={() => detailQuery.refetch()}
      />
    </div>
  );
}
