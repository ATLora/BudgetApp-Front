import { useState } from 'react';
import { Pencil, Trash2, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { CategoryType } from '@/types/api';
import type { BudgetCategoryDto } from '@/types/api';
import { useAddBudgetCategory, useUpdateBudgetCategory, useDeleteBudgetCategory } from '../hooks/useBudgetCategoryMutations';
import { BudgetCategoryFormSheet } from './BudgetCategoryFormSheet';

const CATEGORY_TYPE_LABELS: Record<string, string> = {
  [CategoryType.Income]: 'Income',
  [CategoryType.Expense]: 'Expense',
  [CategoryType.Savings]: 'Savings',
};

const CATEGORY_TYPE_BADGE_CLASS: Record<string, string> = {
  [CategoryType.Income]: 'bg-emerald-100 text-emerald-700',
  [CategoryType.Expense]: 'bg-rose-100 text-rose-700',
  [CategoryType.Savings]: 'bg-sky-100 text-sky-700',
};

interface BudgetCategoriesSectionProps {
  budgetId: string;
  categories: BudgetCategoryDto[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function BudgetCategoriesSection({
  budgetId,
  categories,
  isLoading,
  isError,
  refetch,
}: BudgetCategoriesSectionProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetCategoryDto | undefined>();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [catError, setCatError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const addMutation = useAddBudgetCategory(budgetId);
  const updateMutation = useUpdateBudgetCategory(budgetId);
  const deleteMutation = useDeleteBudgetCategory(budgetId);

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
          import('axios').then(({ default: axios }) => {
            if (axios.isAxiosError(err)) {
              setCatError(err.response?.data?.detail || err.response?.data?.title || err.message);
            } else {
              setCatError('Failed to add category.');
            }
          });
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
          import('axios').then(({ default: axios }) => {
            if (axios.isAxiosError(err)) {
              setCatError(err.response?.data?.detail || err.response?.data?.title || err.message);
            } else {
              setCatError('Failed to update category.');
            }
          });
        },
      },
    );
  }

  function handleDelete(catId: string) {
    setDeleteError(null);
    deleteMutation.mutate(catId, {
      onSuccess: () => setConfirmingDeleteId(null),
      onError: (err) => {
        import('axios').then(({ default: axios }) => {
          if (axios.isAxiosError(err)) {
            setDeleteError(err.response?.data?.detail || err.response?.data?.title || err.message);
          } else {
            setDeleteError('Failed to delete category.');
          }
        });
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
          {isLoading && <div className="h-32 animate-pulse rounded-lg bg-muted" />}

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

          {!isLoading && !isError && (
            <>
              {categories.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No categories added yet.{' '}
                  <button
                    className="font-medium text-primary hover:underline"
                    onClick={openAdd}
                  >
                    Add one →
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between rounded-md px-1 py-2 text-sm hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              CATEGORY_TYPE_BADGE_CLASS[cat.categoryType] ??
                                'bg-muted text-muted-foreground',
                            )}
                          >
                            {CATEGORY_TYPE_LABELS[cat.categoryType] ?? cat.categoryType}
                          </span>
                          <span className="font-medium">{cat.categoryName}</span>
                          {cat.notes && (
                            <span className="truncate text-xs text-muted-foreground max-w-32">
                              {cat.notes}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatCurrency(cat.plannedAmount)}</span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(cat)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setConfirmingDeleteId(cat.id);
                              setDeleteError(null);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Inline delete confirm */}
                      {confirmingDeleteId === cat.id && (
                        <div className="mx-1 mb-1 rounded-lg bg-destructive/10 px-3 py-2 text-sm">
                          <p className="font-medium text-destructive">
                            Remove {cat.categoryName} from this budget?
                          </p>
                          {deleteError && (
                            <p className="mt-1 text-xs text-destructive">{deleteError}</p>
                          )}
                          <div className="mt-2 flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(cat.id)}
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
                  ))}

                  {/* Category total */}
                  <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                    <span>Total planned</span>
                    <span>
                      {formatCurrency(
                        categories.reduce((sum, c) => sum + c.plannedAmount, 0),
                      )}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <BudgetCategoryFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        budgetId={budgetId}
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
