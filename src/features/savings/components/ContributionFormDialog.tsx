// src/features/savings/components/ContributionFormDialog.tsx
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useBudgetList } from '@/features/budgets/hooks/useBudgetList';
import { useAddContribution } from '../hooks/useSavingsGoalMutations';

const contributionSchema = z.object({
  amount: z
    .number({ error: 'Enter a valid amount' })
    .positive('Amount must be greater than 0'),
  contributionDate: z.string().min(1, 'Date is required'),
  notes: z.string().optional().nullable(),
  budgetId: z.string().optional().nullable(),
});

type ContributionFormData = z.infer<typeof contributionSchema>;

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

const EMPTY_DEFAULTS: ContributionFormData = {
  amount: 0,
  contributionDate: todayISO(),
  notes: '',
  budgetId: '',
};

export interface ContributionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  onSuccess?: () => void;
}

export function ContributionFormDialog({
  open,
  onOpenChange,
  goalId,
  onSuccess,
}: ContributionFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ContributionFormData>({
    resolver: zodResolver(contributionSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      setServerError(null);
      form.reset({ ...EMPTY_DEFAULTS, contributionDate: todayISO() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const budgetsQuery = useBudgetList();
  const budgets = budgetsQuery.data ?? [];

  const addMutation = useAddContribution();

  function handleSubmit(data: ContributionFormData) {
    setServerError(null);
    addMutation.mutate(
      {
        goalId,
        data: {
          amount: data.amount,
          contributionDate: data.contributionDate,
          notes: data.notes || null,
          budgetId: data.budgetId || null,
        },
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onOpenChange(false);
        },
        onError: (err) => {
          setServerError(
            axios.isAxiosError(err)
              ? err.response?.data?.detail || err.response?.data?.title || err.message
              : 'Failed to add contribution.',
          );
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Contribution</DialogTitle>
        </DialogHeader>

        <form
          id="contribution-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-amount">Amount</Label>
            <Input
              id="ct-amount"
              type="number"
              min="0.01"
              step="0.01"
              aria-invalid={!!form.formState.errors.amount}
              {...form.register('amount', { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-date">Date</Label>
            <Input
              id="ct-date"
              type="date"
              aria-invalid={!!form.formState.errors.contributionDate}
              {...form.register('contributionDate')}
            />
            {form.formState.errors.contributionDate && (
              <p className="text-xs text-destructive">
                {form.formState.errors.contributionDate.message}
              </p>
            )}
          </div>

          {/* Budget (optional) */}
          <div className="space-y-1.5">
            <Label>Budget (optional)</Label>
            <Controller
              control={form.control}
              name="budgetId"
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                  disabled={budgetsQuery.isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={budgetsQuery.isLoading ? 'Loading…' : 'None'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {budgets.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-notes">Notes (optional)</Label>
            <textarea
              id="ct-notes"
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={addMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="contribution-form" disabled={addMutation.isPending}>
            {addMutation.isPending ? 'Adding…' : 'Add Contribution'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
