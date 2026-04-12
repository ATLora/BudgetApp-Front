// src/features/budgets/components/BudgetCategoryRow.tsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CategorySelect } from '@/features/categories/components/CategorySelect';
import { NewCategoryInlineForm } from '@/features/categories/components/NewCategoryInlineForm';
import type { CategoryDto } from '@/types/api';
import type { PendingBudgetCategory } from '../types';

interface BudgetCategoryRowProps {
  row: PendingBudgetCategory;
  /** IDs already used in other rows — passed to CategorySelect to prevent duplicates. */
  excludeIds: string[];
  onUpdate: (key: string, changes: Partial<Omit<PendingBudgetCategory, 'key'>>) => void;
  onRemove: (key: string) => void;
}

// Map category type to badge variant
const TYPE_VARIANT = {
  Income: 'default',
  Expense: 'secondary',
  Savings: 'outline',
} as const;

export function BudgetCategoryRow({ row, excludeIds, onUpdate, onRemove }: BudgetCategoryRowProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  function handleSelectCategory(cat: CategoryDto) {
    onUpdate(row.key, { category: cat });
    setShowCreateForm(false);
  }

  function handleCreated(cat: CategoryDto) {
    onUpdate(row.key, { category: cat });
    setShowCreateForm(false);
  }

  const hasCategory = row.category !== null;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2.5">
      {/* Top row: category info / picker + remove button */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {hasCategory ? (
            // Category is locked — show badge + name
            <div className="flex items-center gap-2 h-8">
              <Badge variant={TYPE_VARIANT[row.category!.categoryType] ?? 'outline'}>
                {row.category!.categoryType}
              </Badge>
              <span className="text-sm font-medium truncate">{row.category!.name}</span>
            </div>
          ) : showCreateForm ? (
            <NewCategoryInlineForm
              onCreated={handleCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          ) : (
            <CategorySelect
              value={null}
              onSelect={handleSelectCategory}
              onCreateRequest={() => setShowCreateForm(true)}
              excludeIds={excludeIds}
            />
          )}
        </div>

        {/* Remove button — always visible except during create form */}
        {!showCreateForm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(row.key)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Amount + Notes — only when category is locked */}
      {hasCategory && (
        <>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Planned amount"
            value={row.plannedAmount > 0 ? row.plannedAmount : ''}
            onChange={(e) =>
              onUpdate(row.key, { plannedAmount: parseFloat(e.target.value) || 0 })
            }
          />
          <textarea
            rows={2}
            placeholder="Notes (optional)"
            value={row.notes}
            onChange={(e) => onUpdate(row.key, { notes: e.target.value })}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
          />
        </>
      )}
    </div>
  );
}
