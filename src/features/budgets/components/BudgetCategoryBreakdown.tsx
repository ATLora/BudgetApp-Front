// src/features/budgets/components/BudgetCategoryBreakdown.tsx
import { useState } from 'react';
import { Plus, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CategoryType } from '@/types/api';
import type {
  BudgetCategoryDto,
  BudgetSummaryReportDto,
  CategoryActualDto,
} from '@/types/api';
import { cn } from '@/lib/utils';
import { formatCurrency, formatVariance } from '@/lib/formatters';
import {
  useAddBudgetCategory,
  useUpdateBudgetCategory,
  useDeleteBudgetCategory,
} from '../hooks/useBudgetCategoryMutations';
import { BudgetCategoryFormSheet } from './BudgetCategoryFormSheet';

interface MergedRow {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryType: BudgetCategoryDto['categoryType'];
  notes: string | null | undefined;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
}

interface GroupTotals {
  plannedAmount: number;
  actualAmount: number;
  variance: number;
}

const GROUP_ORDER = [
  CategoryType.Income,
  CategoryType.Expense,
  CategoryType.Savings,
] as const;

const GROUP_LABEL: Record<string, string> = {
  [CategoryType.Income]: 'Income',
  [CategoryType.Expense]: 'Expenses',
  [CategoryType.Savings]: 'Savings',
};

function mergeRows(
  categories: BudgetCategoryDto[],
  report: BudgetSummaryReportDto,
): MergedRow[] {
  const actualsById = new Map<string, CategoryActualDto>(
    report.categoryBreakdown.map((c) => [c.budgetCategoryId, c]),
  );
  return categories.map((c) => {
    const actuals = actualsById.get(c.id);
    return {
      id: c.id,
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      categoryType: c.categoryType,
      notes: c.notes,
      plannedAmount: c.plannedAmount,
      actualAmount: actuals?.actualAmount ?? 0,
      variance: actuals?.variance ?? 0,
    };
  });
}

function groupRows(rows: MergedRow[]): Map<string, MergedRow[]> {
  const groups = new Map<string, MergedRow[]>();
  for (const row of rows) {
    const list = groups.get(row.categoryType) ?? [];
    list.push(row);
    groups.set(row.categoryType, list);
  }
  return groups;
}

function sumGroup(rows: MergedRow[]): GroupTotals {
  return rows.reduce<GroupTotals>(
    (acc, r) => ({
      plannedAmount: acc.plannedAmount + r.plannedAmount,
      actualAmount: acc.actualAmount + r.actualAmount,
      variance: acc.variance + r.variance,
    }),
    { plannedAmount: 0, actualAmount: 0, variance: 0 },
  );
}

interface BudgetCategoryBreakdownProps {
  budgetId: string;
  categories: BudgetCategoryDto[];
  report: BudgetSummaryReportDto | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function BudgetCategoryBreakdown({
  budgetId,
  categories,
  report,
  isLoading,
  isError,
  refetch,
}: BudgetCategoryBreakdownProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetCategoryDto | undefined>();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [catError, setCatError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const addMutation = useAddBudgetCategory(budgetId);
  const updateMutation = useUpdateBudgetCategory(budgetId);
  const deleteMutation = useDeleteBudgetCategory(budgetId);

  // Declared up-front for Task 4 — referenced here to satisfy the unused-var checks
  // until the delete flow is wired in.
  void confirmingDeleteId;
  void setConfirmingDeleteId;
  void deleteError;
  void setDeleteError;
  void deleteMutation;

  function openAdd() {
    setEditTarget(undefined);
    setCatError(null);
    setSheetOpen(true);
  }

  const existingCategoryIds = categories.map((c) => c.categoryId);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Categories</CardTitle>
            <Button size="sm" variant="outline" onClick={openAdd}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="h-64 animate-pulse rounded-lg bg-muted" />}

          {isError && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Could not load categories.
              </div>
              <Button variant="ghost" size="sm" onClick={refetch}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !isError && categories.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No categories added yet.{' '}
              <button
                className="font-medium text-primary hover:underline"
                onClick={openAdd}
              >
                Add one →
              </button>
            </div>
          )}

          {!isLoading && !isError && categories.length > 0 && report && (() => {
            const rows = mergeRows(categories, report);
            const grouped = groupRows(rows);
            return (
              <div className="space-y-4">
                {/* Column header — shared 5-col grid with data rows */}
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 px-1 pb-1 text-xs font-medium text-muted-foreground">
                  <span>Category</span>
                  <span className="w-24 text-right">Planned</span>
                  <span className="w-24 text-right">Actual</span>
                  <span className="w-28 text-right">Variance</span>
                  <span className="w-16" />
                </div>

                {GROUP_ORDER.map((type) => {
                  const groupRowsForType = grouped.get(type);
                  if (!groupRowsForType || groupRowsForType.length === 0) return null;
                  const totals = sumGroup(groupRowsForType);
                  return (
                    <div key={type} className="space-y-1">
                      <div className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {GROUP_LABEL[type]}
                      </div>

                      {groupRowsForType.map((row) => (
                        <div
                          key={row.id}
                          className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 rounded-md px-1 py-2 text-sm hover:bg-muted/50"
                        >
                          <span className="flex items-center gap-1.5 font-medium">
                            {row.categoryName}
                            {row.notes && (
                              <Tooltip>
                                <TooltipTrigger render={<span />}>
                                  <Info className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                                </TooltipTrigger>
                                <TooltipContent>{row.notes}</TooltipContent>
                              </Tooltip>
                            )}
                          </span>
                          <span className="w-24 text-right text-muted-foreground">
                            {formatCurrency(row.plannedAmount)}
                          </span>
                          <span className="w-24 text-right">
                            {formatCurrency(row.actualAmount)}
                          </span>
                          <span
                            className={cn(
                              'w-28 text-right font-medium',
                              row.variance >= 0 ? 'text-emerald-600' : 'text-rose-600',
                            )}
                          >
                            {formatVariance(row.variance)}
                          </span>
                          <span className="w-16" />
                        </div>
                      ))}

                      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 border-t px-1 pt-2 text-sm font-semibold">
                        <span>Subtotal</span>
                        <span className="w-24 text-right">
                          {formatCurrency(totals.plannedAmount)}
                        </span>
                        <span className="w-24 text-right">
                          {formatCurrency(totals.actualAmount)}
                        </span>
                        <span
                          className={cn(
                            'w-28 text-right',
                            totals.variance >= 0 ? 'text-emerald-600' : 'text-rose-600',
                          )}
                        >
                          {formatVariance(totals.variance)}
                        </span>
                        <span className="w-16" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <BudgetCategoryFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editTarget={editTarget}
        existingCategoryIds={existingCategoryIds}
        onAdd={() => {
          // wired in Task 4
        }}
        onEdit={() => {
          // wired in Task 4
        }}
        isSubmitting={addMutation.isPending || updateMutation.isPending}
        serverError={catError}
      />
    </>
  );
}
