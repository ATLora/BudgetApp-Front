// src/features/budgets/components/BudgetCategoryBuilder.tsx
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { BudgetCategoryRow } from './BudgetCategoryRow';
import type { PendingBudgetCategory } from '../types';

interface BudgetCategoryBuilderProps {
  /** Called every time the category list changes, so the parent can track state. */
  onChange: (cats: PendingBudgetCategory[]) => void;
}

export function BudgetCategoryBuilder({ onChange }: BudgetCategoryBuilderProps) {
  const [categories, setCategories] = useState<PendingBudgetCategory[]>([]);

  function update(next: PendingBudgetCategory[]) {
    setCategories(next);
    onChange(next);
  }

  function addRow() {
    update([
      ...categories,
      { key: crypto.randomUUID(), category: null, plannedAmount: 0, notes: '' },
    ]);
  }

  function handleUpdate(key: string, changes: Partial<Omit<PendingBudgetCategory, 'key'>>) {
    update(categories.map((c) => (c.key === key ? { ...c, ...changes } : c)));
  }

  function handleRemove(key: string) {
    update(categories.filter((c) => c.key !== key));
  }

  // IDs of categories that have been selected (to exclude from other rows)
  const selectedIds = categories
    .filter((c) => c.category !== null)
    .map((c) => c.category!.id);

  // Live totals — only rows with a selected category count
  const incomePlanned = categories
    .filter((c) => c.category?.categoryType === 'Income')
    .reduce((sum, c) => sum + c.plannedAmount, 0);

  const expensesPlanned = categories
    .filter((c) => c.category?.categoryType === 'Expense')
    .reduce((sum, c) => sum + c.plannedAmount, 0);

  const savingsPlanned = categories
    .filter((c) => c.category?.categoryType === 'Savings')
    .reduce((sum, c) => sum + c.plannedAmount, 0);

  const hasTotals = incomePlanned > 0 || expensesPlanned > 0 || savingsPlanned > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Categories</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          className="h-7 gap-1 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add category
        </Button>
      </div>

      {categories.length > 0 && (
        <div className="space-y-2">
          {categories.map((row) => (
            <BudgetCategoryRow
              key={row.key}
              row={row}
              // pass all selected IDs except this row's own category
              excludeIds={selectedIds.filter((id) => id !== row.category?.id)}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {hasTotals && (
        <div className="rounded-lg bg-muted/50 px-3 py-2 space-y-1 text-sm">
          {incomePlanned > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Income planned</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatCurrency(incomePlanned)}
              </span>
            </div>
          )}
          {expensesPlanned > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expenses planned</span>
              <span className="font-medium">{formatCurrency(expensesPlanned)}</span>
            </div>
          )}
          {savingsPlanned > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Savings planned</span>
              <span className="font-medium">{formatCurrency(savingsPlanned)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
