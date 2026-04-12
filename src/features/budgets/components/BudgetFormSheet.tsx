// src/features/budgets/components/BudgetFormSheet.tsx
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
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
import { BudgetType } from '@/types/api';
import { BudgetCategoryBuilder } from './BudgetCategoryBuilder';
import type { PendingBudgetCategory } from '../types';

const budgetSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(200, 'Max 200 characters'),
    budgetType: z.enum(['Monthly', 'Weekly', 'Biweekly', 'Quarterly', 'Annual', 'Custom'] as const),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    isRecurring: z.boolean(),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate > d.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export type BudgetFormData = z.infer<typeof budgetSchema>;

function toDateInputStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function defaultStartDate(): string {
  const d = new Date();
  return toDateInputStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

function defaultEndDate(): string {
  const d = new Date();
  return toDateInputStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

const DEFAULT_VALUES: BudgetFormData = {
  name: '',
  budgetType: BudgetType.Monthly,
  startDate: defaultStartDate(),
  endDate: defaultEndDate(),
  isRecurring: true,
};

interface BudgetFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  defaultValues?: Partial<BudgetFormData>;
  onSubmit: (data: BudgetFormData) => void;
  isSubmitting: boolean;
  serverError?: string | null;
  /** 'create' shows the category builder; 'edit' hides it. Defaults to 'edit'. */
  mode?: 'create' | 'edit';
  /** Called whenever the pending categories change (create mode only). */
  onCategoriesChange?: (cats: PendingBudgetCategory[]) => void;
}

export function BudgetFormSheet({
  open,
  onOpenChange,
  title,
  submitLabel,
  defaultValues,
  onSubmit,
  isSubmitting,
  serverError,
  mode = 'edit',
  onCategoriesChange,
}: BudgetFormSheetProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  // Incrementing this key forces BudgetCategoryBuilder to remount (and reset)
  // each time the sheet opens in create mode.
  const [builderKey, setBuilderKey] = useState(0);

  useEffect(() => {
    if (open) {
      reset({ ...DEFAULT_VALUES, ...defaultValues });
      if (mode === 'create') setBuilderKey((k) => k + 1);
    }
  }, [open, defaultValues, reset, mode]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <form
          id="budget-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-4 pb-2"
        >
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="budget-name">Name</Label>
              <Input
                id="budget-name"
                placeholder="e.g. April 2026"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Budget Type */}
            <div className="space-y-1.5">
              <Label>Budget Type</Label>
              <Controller
                control={control}
                name="budgetType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={BudgetType.Monthly}>Monthly</SelectItem>
                      <SelectItem value={BudgetType.Weekly}>Weekly</SelectItem>
                      <SelectItem value={BudgetType.Biweekly}>Biweekly</SelectItem>
                      <SelectItem value={BudgetType.Quarterly}>Quarterly</SelectItem>
                      <SelectItem value={BudgetType.Annual}>Annual</SelectItem>
                      <SelectItem value={BudgetType.Custom}>Custom</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.budgetType && (
                <p className="text-xs text-destructive">{errors.budgetType.message}</p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  aria-invalid={!!errors.startDate}
                  {...register('startDate')}
                />
                {errors.startDate && (
                  <p className="text-xs text-destructive">{errors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  aria-invalid={!!errors.endDate}
                  {...register('endDate')}
                />
                {errors.endDate && (
                  <p className="text-xs text-destructive">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            {/* Recurring toggle */}
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Repeat automatically</p>
                <p className="text-xs text-muted-foreground">
                  Enables rolling this budget forward to the next period
                </p>
              </div>
              <input
                id="is-recurring"
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-primary"
                {...register('isRecurring')}
              />
            </div>

            {/* Category builder — create mode only */}
            {mode === 'create' && (
              <div className="border-t pt-4">
                <BudgetCategoryBuilder
                  key={builderKey}
                  onChange={onCategoriesChange ?? (() => {})}
                />
              </div>
            )}

            {serverError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </p>
            )}
          </div>
        </form>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="budget-form" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : submitLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
