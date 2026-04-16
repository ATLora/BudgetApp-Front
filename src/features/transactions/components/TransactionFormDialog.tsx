// src/features/transactions/components/TransactionFormDialog.tsx
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useSavingsGoalList } from '@/features/savings/hooks/useSavingsGoalList';
import { savingsApi } from '@/services/api/savings';
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
  budgetId: z.string(),
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
  savingsGoalId: z.string().optional().nullable(),
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
  savingsGoalId: '',
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
  const queryClient = useQueryClient();

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  // Re-initialise form whenever dialog opens
  useEffect(() => {
    if (open) {
      setServerError(null);
      form.reset({ ...EMPTY_DEFAULTS, transactionDate: todayISO(), ...defaultValues });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const watchedType = form.watch('transactionType');
  const requiredCatType = TYPE_TO_CAT_TYPE[watchedType];

  const budgetsQuery = useBudgetList();
  const budgets = budgetsQuery.data ?? [];

  const savingsGoalsQuery = useSavingsGoalList();
  const activeSavingsGoals = (savingsGoalsQuery.data ?? []).filter(
    (g) => g.status === 'Active',
  );
  const isSavingsType =
    watchedType === 'SavingsDeposit' || watchedType === 'SavingsWithdrawal';

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

    if (isEdit && !transactionId) {
      setServerError('Transaction ID is required in edit mode.');
      return;
    }

    if (!isEdit && !data.budgetId) {
      form.setError('budgetId', { message: 'Select a budget' });
      return;
    }

    const onError = (err: unknown) => {
      setServerError(
        axios.isAxiosError(err)
          ? err.response?.data?.detail || err.response?.data?.title || err.message
          : 'Failed to save transaction.',
      );
    };

    const selectedGoalId = data.savingsGoalId || null;

    if (isEdit && transactionId) {
      updateMutation.mutate(
        {
          id: transactionId,
          budgetId: data.budgetId,
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
          onSuccess: async (newTransactionId) => {
            // Step 2: if a savings goal was selected, create the contribution
            if (selectedGoalId && newTransactionId) {
              try {
                await savingsApi.addContribution(selectedGoalId, {
                  amount: data.amount,
                  contributionDate: data.transactionDate,
                  notes: data.notes ?? null,
                  budgetId: data.budgetId || null,
                  transactionId: newTransactionId,
                });
                queryClient.invalidateQueries({ queryKey: ['savings'] });
              } catch {
                setServerError(
                  'Transaction created, but failed to link to savings goal. You can add the contribution manually.',
                );
                return;
              }
            }
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
                    items={Object.fromEntries(budgets.map((b) => [b.id, b.name]))}
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
                  items={Object.fromEntries(filteredCategories.map((c) => [c.id, c.name]))}
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

          {/* Savings Goal (savings transaction types only, create mode only) */}
          {!isEdit && isSavingsType && (
            <div className="space-y-1.5">
              <Label>Link to Savings Goal (optional)</Label>
              <Controller
                control={form.control}
                name="savingsGoalId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                    disabled={savingsGoalsQuery.isLoading}
                    items={{
                      __none__: 'None',
                      ...Object.fromEntries(activeSavingsGoals.map((g) => [g.id, g.name])),
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          savingsGoalsQuery.isLoading ? 'Loading…' : 'None'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {activeSavingsGoals.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

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
