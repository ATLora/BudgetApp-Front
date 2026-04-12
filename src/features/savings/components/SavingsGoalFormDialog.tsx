// src/features/savings/components/SavingsGoalFormDialog.tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
  useCreateSavingsGoal,
  useUpdateSavingsGoal,
} from '../hooks/useSavingsGoalMutations';
import type { SavingsGoalDetailDto } from '@/types/api';

const savingsGoalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  targetAmount: z
    .number({ error: 'Enter a valid amount' })
    .positive('Amount must be greater than 0'),
  targetDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

type SavingsGoalFormData = z.infer<typeof savingsGoalSchema>;

const EMPTY_DEFAULTS: SavingsGoalFormData = {
  name: '',
  targetAmount: 0,
  targetDate: '',
  description: '',
};

export interface SavingsGoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  /** Provide in edit mode to pre-fill the form. */
  goal?: SavingsGoalDetailDto;
  /** Called after a successful mutation. */
  onSuccess?: () => void;
}

export function SavingsGoalFormDialog({
  open,
  onOpenChange,
  mode,
  goal,
  onSuccess,
}: SavingsGoalFormDialogProps) {
  const isEdit = mode === 'edit';
  const [serverError, setServerError] = useState<string | null>(null);

  const editDefaults: SavingsGoalFormData = goal
    ? {
        name: goal.name,
        targetAmount: goal.targetAmount,
        targetDate: goal.targetDate ?? '',
        description: goal.description ?? '',
      }
    : EMPTY_DEFAULTS;

  const form = useForm<SavingsGoalFormData>({
    resolver: zodResolver(savingsGoalSchema),
    defaultValues: isEdit ? editDefaults : EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      setServerError(null);
      form.reset(isEdit ? editDefaults : EMPTY_DEFAULTS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const createMutation = useCreateSavingsGoal();
  const updateMutation = useUpdateSavingsGoal();
  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(data: SavingsGoalFormData) {
    setServerError(null);

    const payload = {
      name: data.name,
      targetAmount: data.targetAmount,
      targetDate: data.targetDate || null,
      description: data.description || null,
    };

    const onError = (err: unknown) => {
      setServerError(
        axios.isAxiosError(err)
          ? err.response?.data?.detail || err.response?.data?.title || err.message
          : 'Failed to save savings goal.',
      );
    };

    if (isEdit && goal) {
      updateMutation.mutate(
        { id: goal.id, data: payload },
        {
          onSuccess: () => {
            onSuccess?.();
            onOpenChange(false);
          },
          onError,
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          onSuccess?.();
          onOpenChange(false);
        },
        onError,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Savings Goal' : 'New Savings Goal'}</DialogTitle>
        </DialogHeader>

        <form
          id="savings-goal-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="sg-name">Name</Label>
            <Input
              id="sg-name"
              type="text"
              aria-invalid={!!form.formState.errors.name}
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Target Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="sg-target">Target Amount</Label>
            <Input
              id="sg-target"
              type="number"
              min="0.01"
              step="0.01"
              aria-invalid={!!form.formState.errors.targetAmount}
              {...form.register('targetAmount', { valueAsNumber: true })}
            />
            {form.formState.errors.targetAmount && (
              <p className="text-xs text-destructive">
                {form.formState.errors.targetAmount.message}
              </p>
            )}
          </div>

          {/* Target Date */}
          <div className="space-y-1.5">
            <Label htmlFor="sg-date">Target Date (optional)</Label>
            <Input id="sg-date" type="date" {...form.register('targetDate')} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="sg-desc">Description (optional)</Label>
            <textarea
              id="sg-desc"
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...form.register('description')}
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
          <Button type="submit" form="savings-goal-form" disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
