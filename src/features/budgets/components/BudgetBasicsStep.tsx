// src/features/budgets/components/BudgetBasicsStep.tsx
import { Controller, type UseFormReturn } from 'react-hook-form';
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
import type { BudgetFormData } from './budgetFormSchema';

interface BudgetBasicsStepProps {
  form: UseFormReturn<BudgetFormData>;
}

export function BudgetBasicsStep({ form }: BudgetBasicsStepProps) {
  const { register, control, formState: { errors } } = form;

  return (
    <div className="space-y-4">
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
    </div>
  );
}
