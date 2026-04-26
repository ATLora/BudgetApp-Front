// src/features/budgets/components/BudgetCategoryWizardStep.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { categoriesApi } from '@/services/api/categories';
import { CategoryType } from '@/types/api';
import type { CategoryDto } from '@/types/api';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { NewCategoryInlineForm } from '@/features/categories/components/NewCategoryInlineForm';
import {
  BudgetCategoryWizardRow,
  type BudgetCategoryWizardRowValue,
} from './BudgetCategoryWizardRow';

export type DraftMap = Map<string, BudgetCategoryWizardRowValue>;

interface BudgetCategoryWizardStepProps {
  /** Drafts keyed by category id. */
  drafts: DraftMap;
  /** Categories created during this wizard session (rendered alongside server-loaded ones). */
  customCategoriesAdded: CategoryDto[];
  /** Replace the entire drafts map (component is fully controlled). */
  onDraftsChange: (next: DraftMap) => void;
  /** Append a custom category. The wizard parent owns this list. */
  onCustomCategoryAdded: (cat: CategoryDto) => void;
  /** Validation / server error to render above the step (controlled by parent). */
  errorMessage?: string | null;
}

const SECTION_ORDER: CategoryType[] = [
  CategoryType.Income,
  CategoryType.Expense,
  CategoryType.Savings,
];

const SECTION_LABEL: Record<CategoryType, string> = {
  [CategoryType.Income]: 'Income',
  [CategoryType.Expense]: 'Expense',
  [CategoryType.Savings]: 'Savings',
};

const SECTION_BORDER: Record<CategoryType, string> = {
  [CategoryType.Income]: 'border-l-emerald-500',
  [CategoryType.Expense]: 'border-l-rose-500',
  [CategoryType.Savings]: 'border-l-sky-500',
};

const SECTION_TEXT: Record<CategoryType, string> = {
  [CategoryType.Income]: 'text-emerald-600',
  [CategoryType.Expense]: 'text-rose-600',
  [CategoryType.Savings]: 'text-sky-600',
};

const EMPTY_ROW: BudgetCategoryWizardRowValue = {
  plannedAmount: 0,
  notes: '',
  noteOpen: false,
};

function getRowValue(drafts: DraftMap, categoryId: string): BudgetCategoryWizardRowValue {
  return drafts.get(categoryId) ?? EMPTY_ROW;
}

function setRowValue(
  drafts: DraftMap,
  categoryId: string,
  next: BudgetCategoryWizardRowValue,
): DraftMap {
  const copy = new Map(drafts);
  copy.set(categoryId, next);
  return copy;
}

export function BudgetCategoryWizardStep({
  drafts,
  customCategoriesAdded,
  onDraftsChange,
  onCustomCategoryAdded,
  errorMessage,
}: BudgetCategoryWizardStepProps) {
  const categoriesQuery = useQuery({
    queryKey: ['categories', 'list'],
    queryFn: () => categoriesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  // null = no section currently showing the inline create form
  const [creatingFor, setCreatingFor] = useState<CategoryType | null>(null);

  const allCategories = categoriesQuery.data ?? [];

  // Server-loaded active categories + any added during this session.
  // De-dupe by id (in case the cache invalidation re-fetches the new one).
  const merged: CategoryDto[] = (() => {
    const map = new Map<string, CategoryDto>();
    for (const c of allCategories) {
      if (c.isActive) map.set(c.id, c);
    }
    for (const c of customCategoriesAdded) {
      map.set(c.id, c);
    }
    return Array.from(map.values());
  })();

  function categoriesForSection(type: CategoryType): CategoryDto[] {
    return merged.filter((c) => c.categoryType === type);
  }

  function sectionTotal(type: CategoryType): number {
    return categoriesForSection(type).reduce(
      (sum, c) => sum + getRowValue(drafts, c.id).plannedAmount,
      0,
    );
  }

  const incomeTotal = sectionTotal(CategoryType.Income);
  const expenseTotal = sectionTotal(CategoryType.Expense);
  const savingsTotal = sectionTotal(CategoryType.Savings);
  const netTotal = incomeTotal - expenseTotal - savingsTotal;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Enter an amount to include a category. Empty rows are skipped.
      </p>

      {categoriesQuery.isError && (
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Could not load categories.
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => categoriesQuery.refetch()}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {categoriesQuery.isLoading && (
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      )}

      {!categoriesQuery.isLoading && (
        <div className="space-y-5">
          {SECTION_ORDER.map((type) => {
            const sectionCats = categoriesForSection(type);
            const total = sectionTotal(type);
            const isCreating = creatingFor === type;
            return (
              <section
                key={type}
                className={cn('border-l-4 pl-4', SECTION_BORDER[type])}
              >
                <header className="mb-2 flex items-center justify-between">
                  <h3 className={cn('text-sm font-semibold', SECTION_TEXT[type])}>
                    {SECTION_LABEL[type]}
                  </h3>
                  <span className={cn('text-sm font-medium', SECTION_TEXT[type])}>
                    {formatCurrency(total)}
                  </span>
                </header>

                {sectionCats.length === 0 && !isCreating && (
                  <p className="py-1.5 text-xs text-muted-foreground">
                    No {SECTION_LABEL[type].toLowerCase()} categories yet.
                  </p>
                )}

                <div className="divide-y divide-border/60">
                  {sectionCats.map((c) => (
                    <BudgetCategoryWizardRow
                      key={c.id}
                      categoryId={c.id}
                      categoryName={c.name}
                      value={getRowValue(drafts, c.id)}
                      onChange={(next) =>
                        onDraftsChange(setRowValue(drafts, c.id, next))
                      }
                    />
                  ))}
                </div>

                {isCreating ? (
                  <div className="mt-3">
                    <NewCategoryInlineForm
                      lockedType={type}
                      onCreated={(cat) => {
                        onCustomCategoryAdded(cat);
                        setCreatingFor(null);
                      }}
                      onCancel={() => setCreatingFor(null)}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCreatingFor(type)}
                    className="mt-2 text-xs font-medium text-primary hover:underline"
                  >
                    + Add custom {SECTION_LABEL[type].toLowerCase()} category
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}

      {errorMessage && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      {/* Sticky summary bar — sits at the bottom of the scroll area */}
      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-2 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
          <span className="text-emerald-600">
            Income <span className="font-semibold">{formatCurrency(incomeTotal)}</span>
          </span>
          <span className="text-rose-600">
            Expense <span className="font-semibold">{formatCurrency(expenseTotal)}</span>
          </span>
          <span className="text-sky-600">
            Savings <span className="font-semibold">{formatCurrency(savingsTotal)}</span>
          </span>
          <span
            className={cn(
              'font-semibold',
              netTotal >= 0 ? 'text-emerald-600' : 'text-rose-600',
            )}
          >
            Net {formatCurrency(netTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
