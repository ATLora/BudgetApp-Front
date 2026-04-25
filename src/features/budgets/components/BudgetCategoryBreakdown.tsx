// src/features/budgets/components/BudgetCategoryBreakdown.tsx
import { useState } from 'react';
import { Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { BudgetCategoryDto, BudgetSummaryReportDto } from '@/types/api';
import {
  useAddBudgetCategory,
  useUpdateBudgetCategory,
  useDeleteBudgetCategory,
} from '../hooks/useBudgetCategoryMutations';
import { BudgetCategoryFormSheet } from './BudgetCategoryFormSheet';

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

          {/* Grouped rows go here in Task 2 */}
          {!isLoading && !isError && categories.length > 0 && report && (
            <div className="space-y-4">
              {/* placeholder until Task 2 */}
            </div>
          )}
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
