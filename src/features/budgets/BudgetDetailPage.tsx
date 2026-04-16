import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, RotateCcw } from 'lucide-react';
import axios from 'axios';
import { parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDate } from '@/lib/formatters';
import { useBudgetDetail } from './hooks/useBudgetDetail';
import { useBudgetHealth } from './hooks/useBudgetHealth';
import { useBudgetReport } from './hooks/useBudgetReport';
import { useUpdateBudget, useDeleteBudget, useRollForwardBudget } from './hooks/useBudgetMutations';
import { BudgetTypeBadge } from './components/BudgetTypeBadge';
import { BudgetHealthSection } from './components/BudgetHealthSection';
import { BudgetReportTable } from './components/BudgetReportTable';
import { BudgetCategoriesSection } from './components/BudgetCategoriesSection';
import { BudgetFormSheet } from './components/BudgetFormSheet';
import type { BudgetFormData } from './components/BudgetFormSheet';
import { DeleteBudgetDialog } from './components/DeleteBudgetDialog';

export function BudgetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const detailQuery = useBudgetDetail(id!);
  const healthQuery = useBudgetHealth(id!);
  const reportQuery = useBudgetReport(id!);

  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();
  const rollForwardMutation = useRollForwardBudget();

  const budget = detailQuery.data;
  const periodEnded = budget ? parseISO(budget.endDate) < new Date() : false;
  const canRollForward = !!budget?.isRecurring && periodEnded;

  function handleEditSubmit(data: BudgetFormData) {
    if (!id) return;
    setFormError(null);
    updateMutation.mutate(
      { id, data },
      {
        onSuccess: () => setEditSheetOpen(false),
        onError: (err) => {
          setFormError(
            axios.isAxiosError(err)
              ? err.response?.data?.detail || err.response?.data?.title || err.message
              : 'Failed to update budget.',
          );
        },
      },
    );
  }

  function handleDelete() {
    if (!id) return;
    setDeleteError(null);
    deleteMutation.mutate(id, {
      onSuccess: () => navigate('/budgets'),
      onError: (err) => {
        setDeleteError(
          axios.isAxiosError(err)
            ? err.response?.data?.detail || err.response?.data?.title || err.message
            : 'Failed to delete budget.',
        );
      },
    });
  }

  function handleRollForward() {
    if (!id) return;
    rollForwardMutation.mutate(id, {
      onSuccess: (newId) => navigate(`/budgets/${newId}`),
      onError: (err) => {
        setDeleteError(
          axios.isAxiosError(err)
            ? err.response?.data?.detail || err.response?.data?.title || err.message
            : 'Failed to roll forward budget.',
        );
      },
    });
  }

  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (detailQuery.isError || !budget) {
    return (
      <div className="flex flex-col gap-6">
        <Link to="/budgets" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="h-4 w-4" />
          Back to Budgets
        </Link>
        <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4 shadow-sm text-sm">
          <p className="text-muted-foreground">Could not load budget.</p>
          <Button variant="outline" size="sm" onClick={() => detailQuery.refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const editDefaultValues: Partial<BudgetFormData> = {
    name: budget.name,
    budgetType: budget.budgetType,
    startDate: budget.startDate,
    endDate: budget.endDate,
    isRecurring: budget.isRecurring,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        to="/budgets"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Budgets
      </Link>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{budget.name}</h1>
            <BudgetTypeBadge budgetType={budget.budgetType} />
            {budget.isRecurring && (
              <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Recurring
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(budget.startDate, 'MMM d')} –{' '}
            {formatDate(budget.endDate, 'MMM d, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Roll Forward */}
          {budget.isRecurring && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span />}>
                  <span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canRollForward || rollForwardMutation.isPending}
                      onClick={handleRollForward}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      {rollForwardMutation.isPending ? 'Rolling…' : 'Roll Forward'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canRollForward && (
                  <TooltipContent>Available after the current period ends</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFormError(null);
              setEditSheetOpen(true);
            }}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => {
              setDeleteDialogOpen(true);
              setDeleteError(null);
            }}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Health + Report */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BudgetHealthSection
          data={healthQuery.data}
          isLoading={healthQuery.isLoading}
          isError={healthQuery.isError}
          refetch={healthQuery.refetch}
        />
        <BudgetReportTable
          data={reportQuery.data}
          isLoading={reportQuery.isLoading}
          isError={reportQuery.isError}
          refetch={reportQuery.refetch}
        />
      </div>

      {/* Categories */}
      <BudgetCategoriesSection
        budgetId={id!}
        categories={budget.categories}
        isLoading={detailQuery.isLoading}
        isError={detailQuery.isError}
        refetch={detailQuery.refetch}
      />

      {/* Edit sheet */}
      <BudgetFormSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        title="Edit Budget"
        submitLabel="Save Changes"
        defaultValues={editDefaultValues}
        onSubmit={handleEditSubmit}
        isSubmitting={updateMutation.isPending}
        serverError={formError}
      />

      <DeleteBudgetDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        budgetName={budget.name}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
        error={deleteError}
      />
    </div>
  );
}
