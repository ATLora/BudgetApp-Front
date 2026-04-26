// src/features/budgets/components/BudgetWizardDialog.tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CategoryDto } from '@/types/api';
import type { PendingBudgetCategory } from '../types';
import { useCreateBudgetWithCategories } from '../hooks/useBudgetMutations';
import {
  budgetSchema,
  BUDGET_FORM_DEFAULTS,
  type BudgetFormData,
} from './budgetFormSchema';
import { BudgetBasicsStep } from './BudgetBasicsStep';
import {
  BudgetCategoryWizardStep,
  type DraftMap,
} from './BudgetCategoryWizardStep';
import type { BudgetCategoryWizardRowValue } from './BudgetCategoryWizardRow';

interface BudgetWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful create. */
  onCreated?: (newBudgetId: string) => void;
}

type Step = 1 | 2;

function emptyDraft(): BudgetCategoryWizardRowValue {
  return { plannedAmount: 0, notes: '', noteOpen: false };
}

function draftsToPending(
  drafts: DraftMap,
  categoryById: Map<string, CategoryDto>,
): PendingBudgetCategory[] {
  const out: PendingBudgetCategory[] = [];
  for (const [id, value] of drafts.entries()) {
    if (value.plannedAmount <= 0) continue;
    const cat = categoryById.get(id);
    if (!cat) continue;
    out.push({
      key: id,
      category: cat,
      plannedAmount: value.plannedAmount,
      notes: value.notes,
    });
  }
  return out;
}

export function BudgetWizardDialog({
  open,
  onOpenChange,
  onCreated,
}: BudgetWizardDialogProps) {
  const [step, setStep] = useState<Step>(1);
  const [drafts, setDrafts] = useState<DraftMap>(() => new Map());
  const [customCategoriesAdded, setCustomCategoriesAdded] = useState<CategoryDto[]>([]);
  const [stepError, setStepError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: BUDGET_FORM_DEFAULTS,
  });

  const createMutation = useCreateBudgetWithCategories();

  // Reset everything when the dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setDrafts(new Map());
      setCustomCategoriesAdded([]);
      setStepError(null);
      setServerError(null);
      form.reset(BUDGET_FORM_DEFAULTS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleAddCustomCategory(cat: CategoryDto) {
    setCustomCategoriesAdded((prev) => [...prev, cat]);
    // Pre-create an empty draft so the row is wired and ready
    setDrafts((prev) => {
      const copy = new Map(prev);
      if (!copy.has(cat.id)) copy.set(cat.id, emptyDraft());
      return copy;
    });
  }

  async function goToStep2() {
    const ok = await form.trigger();
    if (ok) {
      setStepError(null);
      setStep(2);
    }
  }

  function goBackToStep1() {
    setStepError(null);
    setStep(1);
  }

  async function handleCreate() {
    setStepError(null);
    setServerError(null);

    // Defensive: re-validate basics
    const basicsOk = await form.trigger();
    if (!basicsOk) {
      setStep(1);
      return;
    }

    // Read the cached categories list (the step 2 component populated it
    // via useQuery on the same key). Combine with any custom categories
    // added during this wizard session to build a complete lookup.
    const cached = (queryClient.getQueryData<CategoryDto[]>(['categories', 'list']) ?? [])
      .filter((c) => c.isActive);
    const allKnown = [...cached, ...customCategoriesAdded];
    const categoryById = new Map(allKnown.map((c) => [c.id, c]));

    const categories = draftsToPending(drafts, categoryById);
    if (categories.length === 0) {
      setStepError('Add at least one category to your budget.');
      return;
    }

    createMutation.mutate(
      { budgetData: form.getValues(), categories },
      {
        onSuccess: (newId) => {
          onCreated?.(newId);
          onOpenChange(false);
        },
        onError: (err) => {
          setServerError(
            axios.isAxiosError(err)
              ? err.response?.data?.detail ||
                  err.response?.data?.title ||
                  err.message
              : 'Failed to create budget.',
          );
        },
      },
    );
  }

  const isSubmitting = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[90vh] flex-col gap-4',
          step === 1 ? 'sm:max-w-lg' : 'sm:max-w-2xl',
        )}
      >
        <DialogHeader>
          <DialogTitle>New Budget</DialogTitle>
          <Stepper step={step} onJumpToStep1={goBackToStep1} />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          {step === 1 && <BudgetBasicsStep form={form} />}
          {step === 2 && (
            <BudgetCategoryWizardStep
              drafts={drafts}
              customCategoriesAdded={customCategoriesAdded}
              onDraftsChange={setDrafts}
              onCustomCategoryAdded={handleAddCustomCategory}
              errorMessage={stepError ?? serverError}
            />
          )}
        </div>

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={goToStep2} disabled={isSubmitting}>
                Next →
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={goBackToStep1} disabled={isSubmitting}>
                ← Back
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create Budget'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface StepperProps {
  step: Step;
  onJumpToStep1: () => void;
}

function Stepper({ step, onJumpToStep1 }: StepperProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={onJumpToStep1}
        className={cn(
          'h-1.5 w-12 rounded-full transition-colors',
          step >= 1 ? 'bg-primary' : 'bg-muted',
          step === 2 && 'cursor-pointer hover:bg-primary/80',
        )}
        aria-label="Go to step 1"
        disabled={step === 1}
      />
      <span
        className={cn(
          'h-1.5 w-12 rounded-full',
          step >= 2 ? 'bg-primary' : 'bg-muted',
        )}
        aria-hidden="true"
      />
      <span className="ml-1">Step {step} of 2 · {step === 1 ? 'Basics' : 'Categories'}</span>
    </div>
  );
}
