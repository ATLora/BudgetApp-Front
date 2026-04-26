// src/features/budgets/components/budgetFormSchema.ts
import { z } from 'zod';
import { BudgetType } from '@/types/api';

export const budgetSchema = z
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultStartDate(): string {
  const d = new Date();
  return toDateInputStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

function defaultEndDate(): string {
  const d = new Date();
  return toDateInputStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function getBudgetFormDefaults(): BudgetFormData {
  return {
    name: '',
    budgetType: BudgetType.Monthly,
    startDate: defaultStartDate(),
    endDate: defaultEndDate(),
    isRecurring: true,
  };
}
