import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUpdateBudget } from '../hooks/useBudgetMutations';
import {
  budgetSchema,
  BUDGET_FORM_DEFAULTS,
  type BudgetFormData,
} from './budgetFormSchema';
import { BudgetBasicsStep } from './BudgetBasicsStep';

interface BudgetEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  defaultValues: BudgetFormData;
}

export function BudgetEditDialog({
  open,
  onOpenChange,
  budgetId,
  defaultValues,
}: BudgetEditDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { ...BUDGET_FORM_DEFAULTS, ...defaultValues },
  });

  const updateMutation = useUpdateBudget();

  useEffect(() => {
    if (open) {
      setServerError(null);
      form.reset({ ...BUDGET_FORM_DEFAULTS, ...defaultValues });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultValues]);

  function handleSubmit(data: BudgetFormData) {
    setServerError(null);
    updateMutation.mutate(
      { id: budgetId, data },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => {
          setServerError(
            axios.isAxiosError(err)
              ? err.response?.data?.detail ||
                  err.response?.data?.title ||
                  err.message
              : 'Failed to update budget.',
          );
        },
      },
    );
  }

  const isSubmitting = updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Budget</DialogTitle>
        </DialogHeader>

        <form
          id="budget-edit-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <BudgetBasicsStep form={form} />

          {serverError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="budget-edit-form" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
