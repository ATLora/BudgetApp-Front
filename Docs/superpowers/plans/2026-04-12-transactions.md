# Transactions Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full CRUD Transactions feature with a list page, detail page, and a reusable `TransactionFormDialog` that can be embedded anywhere in the app.

**Architecture:** Single `TransactionsPage` for list+filter+summary, `TransactionDetailPage` for view/edit/delete, and a self-contained `TransactionFormDialog` that owns its own mutation and can be dropped into any page (dashboard, budget detail, etc.) with no extra wiring.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, react-hook-form + zod v4, shadcn/ui (Dialog, Select, Input, Button), Tailwind CSS v4, Axios.

---

## File Map

**Create:**
- `src/features/transactions/hooks/useTransactionList.ts`
- `src/features/transactions/hooks/useTransactionSummary.ts`
- `src/features/transactions/hooks/useTransactionDetail.ts`
- `src/features/transactions/hooks/useTransactionMutations.ts`
- `src/features/transactions/components/TransactionSummaryBar.tsx`
- `src/features/transactions/components/TransactionCard.tsx`
- `src/features/transactions/components/TransactionFormDialog.tsx`
- `src/features/transactions/TransactionDetailPage.tsx`

**Modify:**
- `src/features/transactions/TransactionsPage.tsx` — replace stub
- `src/app/router.tsx` — add `/transactions/:id` route

**shadcn component to add:** `dialog` (not yet installed)

---

## Task 1: Add Dialog UI component

**Files:**
- Create: `src/components/ui/dialog.tsx` (via shadcn CLI)

- [ ] **Step 1: Install the Dialog component**

```bash
npx shadcn@latest add dialog
```

Expected: `src/components/ui/dialog.tsx` created. You will see a prompt asking which style — accept the default.

- [ ] **Step 2: Verify the file exists**

```bash
ls src/components/ui/dialog.tsx
```

Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dialog.tsx
git commit -m "feat: add shadcn Dialog component"
```

---

## Task 2: Transaction query hooks

**Files:**
- Create: `src/features/transactions/hooks/useTransactionList.ts`
- Create: `src/features/transactions/hooks/useTransactionSummary.ts`
- Create: `src/features/transactions/hooks/useTransactionDetail.ts`

- [ ] **Step 1: Create `useTransactionList.ts`**

```ts
// src/features/transactions/hooks/useTransactionList.ts
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
```

- [ ] **Step 2: Create `useTransactionSummary.ts`**

```ts
// src/features/transactions/hooks/useTransactionSummary.ts
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
```

- [ ] **Step 3: Create `useTransactionDetail.ts`**

```ts
// src/features/transactions/hooks/useTransactionDetail.ts
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
```

- [ ] **Step 4: Verify TypeScript**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/transactions/hooks/
git commit -m "feat: add transaction query hooks"
```

---

## Task 3: Transaction mutation hooks

**Files:**
- Create: `src/features/transactions/hooks/useTransactionMutations.ts`

- [ ] **Step 1: Create `useTransactionMutations.ts`**

```ts
// src/features/transactions/hooks/useTransactionMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@/services/api/transactions';
import type { CreateTransactionRequest, UpdateTransactionRequest } from '@/types/api';

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransactionRequest) => transactionsApi.create(data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'detail', variables.budgetId] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionRequest }) =>
      transactionsApi.update(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'detail'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'detail'] });
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/transactions/hooks/useTransactionMutations.ts
git commit -m "feat: add transaction mutation hooks"
```

---

## Task 4: TransactionSummaryBar component

**Files:**
- Create: `src/features/transactions/components/TransactionSummaryBar.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/transactions/components/TransactionSummaryBar.tsx
git commit -m "feat: add TransactionSummaryBar component"
```

---

## Task 5: TransactionCard component

**Files:**
- Create: `src/features/transactions/components/TransactionCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/transactions/components/TransactionCard.tsx
git commit -m "feat: add TransactionCard component"
```

---

## Task 6: TransactionFormDialog component

**Files:**
- Create: `src/features/transactions/components/TransactionFormDialog.tsx`

This is the portable create/edit modal. It owns its own form state, queries, and mutations. Any page can import and use it.

- [ ] **Step 1: Create the component**

```tsx
// src/features/transactions/components/TransactionFormDialog.tsx
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categoriesApi } from '@/services/api/categories';
import { useBudgetList } from '@/features/budgets/hooks/useBudgetList';
import { TransactionType } from '@/types/api';
import type { CategoryType } from '@/types/api';
import {
  useCreateTransaction,
  useUpdateTransaction,
} from '../hooks/useTransactionMutations';

// Maps transaction type → the category type to filter by
const TYPE_TO_CAT_TYPE: Record<string, CategoryType> = {
  Income: 'Income',
  Expense: 'Expense',
  SavingsDeposit: 'Savings',
  SavingsWithdrawal: 'Savings',
};

const transactionSchema = z.object({
  budgetId: z.string().min(1, 'Select a budget'),
  categoryId: z.string().min(1, 'Select a category'),
  transactionType: z.enum(
    ['Income', 'Expense', 'SavingsDeposit', 'SavingsWithdrawal'] as const,
  ),
  amount: z
    .number({ error: 'Enter a valid amount' })
    .positive('Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  transactionDate: z.string().min(1, 'Date is required'),
  notes: z.string().optional().nullable(),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

const EMPTY_DEFAULTS: TransactionFormData = {
  budgetId: '',
  categoryId: '',
  transactionType: TransactionType.Expense,
  amount: 0,
  description: '',
  transactionDate: todayISO(),
  notes: '',
};

export interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  /** Pre-fills the form. In edit mode, provide all fields from the existing transaction. */
  defaultValues?: Partial<TransactionFormData>;
  /** Required when mode === 'edit'. */
  transactionId?: string;
  /** Called after a successful mutation (before the dialog closes). */
  onSuccess?: () => void;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  mode,
  defaultValues,
  transactionId,
  onSuccess,
}: TransactionFormDialogProps) {
  const isEdit = mode === 'edit';
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  // Re-initialise form whenever dialog opens
  useEffect(() => {
    if (open) {
      setServerError(null);
      form.reset({ ...EMPTY_DEFAULTS, ...defaultValues });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const watchedType = form.watch('transactionType');
  const requiredCatType = TYPE_TO_CAT_TYPE[watchedType];

  const budgetsQuery = useBudgetList();
  const budgets = budgetsQuery.data ?? [];

  // Declare categoriesQuery BEFORE the useEffect that references it
  const categoriesQuery = useQuery({
    queryKey: ['categories', 'list'],
    queryFn: () => categoriesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const filteredCategories = (categoriesQuery.data ?? []).filter(
    (c) => c.categoryType === requiredCatType && c.isActive,
  );

  // Clear categoryId if it no longer matches the selected transaction type
  useEffect(() => {
    const currentCatId = form.getValues('categoryId');
    if (!currentCatId) return;
    const currentCat = (categoriesQuery.data ?? []).find((c) => c.id === currentCatId);
    if (currentCat && currentCat.categoryType !== requiredCatType) {
      form.setValue('categoryId', '', { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedType]);

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(data: TransactionFormData) {
    setServerError(null);

    const onError = (err: unknown) => {
      setServerError(
        axios.isAxiosError(err)
          ? err.response?.data?.detail || err.response?.data?.title || err.message
          : 'Failed to save transaction.',
      );
    };

    if (isEdit && transactionId) {
      updateMutation.mutate(
        {
          id: transactionId,
          data: {
            categoryId: data.categoryId,
            amount: data.amount,
            transactionType: data.transactionType,
            description: data.description,
            transactionDate: data.transactionDate,
            notes: data.notes ?? null,
          },
        },
        {
          onSuccess: () => {
            onSuccess?.();
            onOpenChange(false);
          },
          onError,
        },
      );
    } else {
      createMutation.mutate(
        {
          budgetId: data.budgetId,
          categoryId: data.categoryId,
          amount: data.amount,
          transactionType: data.transactionType,
          description: data.description,
          transactionDate: data.transactionDate,
          notes: data.notes ?? null,
        },
        {
          onSuccess: () => {
            onSuccess?.();
            onOpenChange(false);
          },
          onError,
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
        </DialogHeader>

        <form
          id="transaction-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          {/* Budget — create mode only */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Budget</Label>
              <Controller
                control={form.control}
                name="budgetId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={budgetsQuery.isLoading}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-invalid={!!form.formState.errors.budgetId}
                    >
                      <SelectValue
                        placeholder={budgetsQuery.isLoading ? 'Loading…' : 'Select a budget'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {budgets.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.budgetId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.budgetId.message}
                </p>
              )}
            </div>
          )}

          {/* Transaction Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Controller
              control={form.control}
              name="transactionType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TransactionType.Income}>Income</SelectItem>
                    <SelectItem value={TransactionType.Expense}>Expense</SelectItem>
                    <SelectItem value={TransactionType.SavingsDeposit}>
                      Savings Deposit
                    </SelectItem>
                    <SelectItem value={TransactionType.SavingsWithdrawal}>
                      Savings Withdrawal
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={categoriesQuery.isLoading}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={!!form.formState.errors.categoryId}
                  >
                    <SelectValue
                      placeholder={
                        categoriesQuery.isLoading ? 'Loading…' : 'Select a category'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.categoryId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.categoryId.message}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-amount">Amount</Label>
            <Input
              id="tx-amount"
              type="number"
              min="0.01"
              step="0.01"
              aria-invalid={!!form.formState.errors.amount}
              {...form.register('amount', { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-description">Description</Label>
            <Input
              id="tx-description"
              type="text"
              aria-invalid={!!form.formState.errors.description}
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-date">Date</Label>
            <Input
              id="tx-date"
              type="date"
              aria-invalid={!!form.formState.errors.transactionDate}
              {...form.register('transactionDate')}
            />
            {form.formState.errors.transactionDate && (
              <p className="text-xs text-destructive">
                {form.formState.errors.transactionDate.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-notes">Notes (optional)</Label>
            <textarea
              id="tx-notes"
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...form.register('notes')}
            />
          </div>

          {serverError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="transaction-form" disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/transactions/components/TransactionFormDialog.tsx
git commit -m "feat: add reusable TransactionFormDialog"
```

---

## Task 7: TransactionsPage (list page)

**Files:**
- Modify: `src/features/transactions/TransactionsPage.tsx` — replace stub with full implementation

- [ ] **Step 1: Replace the stub**

```tsx
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
            setTypeFilter(v === '__all__' ? undefined : (v as TxType))
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
          onValueChange={(v) => setBudgetFilter(v === '__all__' ? undefined : v)}
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 3: Smoke-test in browser**

Start the dev server (`npm run dev`), navigate to `/transactions`. Verify:
- Summary bar renders (4 skeleton cards → real totals after data loads)
- Filters render without errors
- "Add Transaction" button opens the dialog
- If no transactions exist, empty state shows

- [ ] **Step 4: Commit**

```bash
git add src/features/transactions/TransactionsPage.tsx
git commit -m "feat: implement TransactionsPage with filters and summary"
```

---

## Task 8: TransactionDetailPage and router wiring

**Files:**
- Create: `src/features/transactions/TransactionDetailPage.tsx`
- Modify: `src/app/router.tsx` — add `/transactions/:id` route and import

- [ ] **Step 1: Create `TransactionDetailPage.tsx`**

```tsx
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

  const detailQuery = useTransactionDetail(id!);
  const deleteMutation = useDeleteTransaction();
  const transaction = detailQuery.data;

  function handleDelete() {
    if (!id) return;
    setDeleteError(null);
    deleteMutation.mutate(id, {
      onSuccess: () => navigate('/transactions'),
      onError: (err) => {
        setDeleteError(
          axios.isAxiosError(err)
            ? err.response?.data?.detail || err.response?.data?.title || err.message
            : 'Failed to delete transaction.',
        );
      },
    });
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
```

- [ ] **Step 2: Add the route to `router.tsx`**

In `src/app/router.tsx`, add an import and a new route. The file currently imports `TransactionsPage` but not `TransactionDetailPage`, and has no `/transactions/:id` route.

Add the import after the existing `TransactionsPage` import:
```tsx
import { TransactionDetailPage } from '@/features/transactions/TransactionDetailPage';
```

Add the route after the existing `/transactions` route inside the `children` array:
```tsx
{ path: '/transactions/:id', element: <TransactionDetailPage /> },
```

The relevant section of `router.tsx` after the change should look like:
```tsx
{ path: '/transactions', element: <TransactionsPage /> },
{ path: '/transactions/:id', element: <TransactionDetailPage /> },
```

- [ ] **Step 3: Verify TypeScript**

```bash
npm run build
```

Expected: builds without errors.

- [ ] **Step 4: Smoke-test in browser**

Start the dev server (`npm run dev`). Verify:
- `/transactions` list: clicking a transaction card navigates to `/transactions/:id`
- Detail page shows all fields, amount with correct sign and color
- Edit button opens the form dialog pre-filled with existing values — saving updates and returns to the list on success
- Delete shows inline confirm → deletes and navigates back to `/transactions`

- [ ] **Step 5: Commit**

```bash
git add src/features/transactions/TransactionDetailPage.tsx src/app/router.tsx
git commit -m "feat: implement TransactionDetailPage and wire router"
```

---

## Done

At this point the Transactions feature is complete:
- `/transactions` — filterable list with summary stats and "Add Transaction" dialog
- `/transactions/:id` — detail view with edit/delete
- `TransactionFormDialog` — reusable, importable anywhere in the app for quick transaction entry
