// src/features/budgets/components/BudgetCategoryBreakdown.tsx
import { useState } from 'react';
import { Plus, AlertCircle, RefreshCw, Info, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { CategoryIcon } from '@/features/categories/icons';
import { useCategoryLookup } from '@/features/categories/hooks/useCategoryLookup';

interface MergedRow {
  id: string;
  categoryName: string;
  categoryType: BudgetCategoryDto['categoryType'];
  notes: string | null | undefined;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
}

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
      categoryName: c.categoryName,
      categoryType: c.categoryType,
      notes: c.notes,
      plannedAmount: c.plannedAmount,
      actualAmount: actuals?.actualAmount ?? 0,
      variance: actuals?.variance ?? 0,
    };
  });
}

const TYPE_BORDER_CLASS: Record<CategoryType, string> = {
  [CategoryType.Income]: 'border-l-emerald-500',
  [CategoryType.Expense]: 'border-l-rose-500',
  [CategoryType.Savings]: 'border-l-sky-500',
};

function sortByType(rows: MergedRow[]): MergedRow[] {
  const order: Record<CategoryType, number> = {
    [CategoryType.Income]: 0,
    [CategoryType.Expense]: 1,
    [CategoryType.Savings]: 2,
  };
  return [...rows].sort((a, b) => order[a.categoryType] - order[b.categoryType]);
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
  const { lookup: categoryLookup } = useCategoryLookup();

  function openAdd() {
    setEditTarget(undefined);
    setCatError(null);
    setSheetOpen(true);
  }

  function openEdit(cat: BudgetCategoryDto) {
    setEditTarget(cat);
    setCatError(null);
    setSheetOpen(true);
  }

  function handleAdd(data: { categoryId: string; plannedAmount: number; notes?: string }) {
    addMutation.mutate(
      { categoryId: data.categoryId, plannedAmount: data.plannedAmount, notes: data.notes },
      {
        onSuccess: () => setSheetOpen(false),
        onError: (err) => {
          if (axios.isAxiosError(err)) {
            setCatError(err.response?.data?.detail || err.response?.data?.title || err.message);
          } else {
            setCatError('Failed to add category.');
          }
        },
      },
    );
  }

  function handleEdit(catId: string, data: { plannedAmount: number; notes?: string }) {
    updateMutation.mutate(
      { catId, data: { plannedAmount: data.plannedAmount, notes: data.notes } },
      {
        onSuccess: () => setSheetOpen(false),
        onError: (err) => {
          if (axios.isAxiosError(err)) {
            setCatError(err.response?.data?.detail || err.response?.data?.title || err.message);
          } else {
            setCatError('Failed to update category.');
          }
        },
      },
    );
  }

  function handleDelete(catId: string) {
    setDeleteError(null);
    deleteMutation.mutate(catId, {
      onSuccess: () => setConfirmingDeleteId(null),
      onError: (err) => {
        if (axios.isAxiosError(err)) {
          setDeleteError(err.response?.data?.detail || err.response?.data?.title || err.message);
        } else {
          setDeleteError('Failed to delete category.');
        }
      },
    });
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
            const rows = sortByType(mergeRows(categories, report));
            return (
              <div className="space-y-1">
                {/* Column header — transparent left border keeps x-alignment with data rows */}
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 border-l-4 border-transparent pb-1 pl-3 pr-1 text-xs font-medium text-muted-foreground">
                  <span>Category</span>
                  <span className="w-24 text-right">Planned</span>
                  <span className="w-24 text-right">Actual</span>
                  <span className="w-28 text-right">Variance</span>
                  <span className="w-8" />
                </div>

                {rows.map((row) => {
                  const dto = categories.find((c) => c.id === row.id);
                  return (
                    <div key={row.id}>
                      <div
                        className={cn(
                          'grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 rounded-md border-l-4 py-2 pl-3 pr-1 text-sm hover:bg-muted/50',
                          TYPE_BORDER_CLASS[row.categoryType],
                        )}
                      >
                        <span className="flex items-center gap-1.5 font-medium">
                          <CategoryIcon
                            iconName={categoryLookup.get(dto?.categoryId ?? '')?.icon}
                            className="size-4 text-muted-foreground shrink-0"
                          />
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
                        <span className="flex w-8 items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Category actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {dto && (
                                <DropdownMenuItem onClick={() => openEdit(dto)}>
                                  <Pencil className="mr-2 h-3.5 w-3.5" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setConfirmingDeleteId(row.id);
                                  setDeleteError(null);
                                }}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </span>
                      </div>

                      {confirmingDeleteId === row.id && (
                        <div className="mx-1 mb-1 rounded-lg bg-destructive/10 px-3 py-2 text-sm">
                          <p className="font-medium text-destructive">
                            Remove {row.categoryName} from this budget?
                          </p>
                          {deleteError && (
                            <p className="mt-1 text-xs text-destructive">{deleteError}</p>
                          )}
                          <div className="mt-2 flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(row.id)}
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? 'Removing…' : 'Remove'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setConfirmingDeleteId(null);
                                setDeleteError(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
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
        onAdd={handleAdd}
        onEdit={handleEdit}
        isSubmitting={addMutation.isPending || updateMutation.isPending}
        serverError={catError}
      />
    </>
  );
}
