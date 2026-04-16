// src/features/budgets/BudgetListPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BudgetType } from '@/types/api';
import type { BudgetSummaryDto, BudgetType as BudgetTypeValue } from '@/types/api';
import { useBudgetList } from './hooks/useBudgetList';
import {
  useCreateBudgetWithCategories,
  useUpdateBudget,
  useDeleteBudget,
  useRollForwardBudget,
} from './hooks/useBudgetMutations';
import { BudgetCard } from './components/BudgetCard';
import { BudgetListSkeleton } from './components/BudgetListSkeleton';
import { BudgetFormSheet } from './components/BudgetFormSheet';
import type { BudgetFormData } from './components/BudgetFormSheet';
import { DeleteBudgetDialog } from './components/DeleteBudgetDialog';
import type { PendingBudgetCategory } from './types';

export function BudgetListPage() {
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState<BudgetTypeValue | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<BudgetSummaryDto | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingCategories, setPendingCategories] = useState<PendingBudgetCategory[]>([]);
  const [rollingForwardId, setRollingForwardId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetSummaryDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useBudgetList(filterType ? { budgetType: filterType } : undefined);
  const createWithCategories = useCreateBudgetWithCategories();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();
  const rollForwardMutation = useRollForwardBudget();

  const budgets = listQuery.data ?? [];

  function openCreate() {
    setEditTarget(undefined);
    setFormMode('create');
    setFormError(null);
    setPendingCategories([]);
    setFormOpen(true);
  }

  function openEdit(budget: BudgetSummaryDto) {
    setEditTarget(budget);
    setFormMode('edit');
    setFormError(null);
    setPendingCategories([]);
    setFormOpen(true);
  }

  function handleFormSubmit(data: BudgetFormData) {
    setFormError(null);
    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, data },
        {
          onSuccess: () => setFormOpen(false),
          onError: (err) => {
            setFormError(
              axios.isAxiosError(err)
                ? err.response?.data?.detail || err.response?.data?.title || err.message
                : 'Failed to update budget.',
            );
          },
        },
      );
    } else {
      createWithCategories.mutate(
        { budgetData: data, categories: pendingCategories },
        {
          onSuccess: () => setFormOpen(false),
          onError: (err) => {
            setFormError(
              axios.isAxiosError(err)
                ? err.response?.data?.detail || err.response?.data?.title || err.message
                : 'Failed to create budget.',
            );
          },
        },
      );
    }
  }

  function handleDeleteRequest(budget: BudgetSummaryDto) {
    setDeleteTarget(budget);
    setDeleteError(null);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteError(null);
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (err) => {
        setDeleteError(
          axios.isAxiosError(err)
            ? err.response?.data?.detail || err.response?.data?.title || err.message
            : 'Failed to delete budget.',
        );
      },
    });
  }

  function handleRollForward(id: string) {
    setRollingForwardId(id);
    rollForwardMutation.mutate(id, {
      onSuccess: (newId) => navigate(`/budgets/${newId}`),
      onSettled: () => setRollingForwardId(null),
    });
  }

  // Edit form only needs the basic fields (no planned totals)
  const editDefaultValues: Partial<BudgetFormData> | undefined = editTarget
    ? {
        name: editTarget.name,
        budgetType: editTarget.budgetType,
        startDate: editTarget.startDate,
        endDate: editTarget.endDate,
        isRecurring: editTarget.isRecurring,
      }
    : undefined;

  const isSubmitting = createWithCategories.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Budgets</h1>
          <p className="text-sm text-muted-foreground">Manage and track your budgets</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Budget
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          value={filterType ?? 'all'}
          onValueChange={(v) =>
            setFilterType(v === 'all' ? undefined : (v as BudgetTypeValue))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value={BudgetType.Monthly}>Monthly</SelectItem>
            <SelectItem value={BudgetType.Weekly}>Weekly</SelectItem>
            <SelectItem value={BudgetType.Biweekly}>Biweekly</SelectItem>
            <SelectItem value={BudgetType.Quarterly}>Quarterly</SelectItem>
            <SelectItem value={BudgetType.Annual}>Annual</SelectItem>
            <SelectItem value={BudgetType.Custom}>Custom</SelectItem>
          </SelectContent>
        </Select>
        {listQuery.data && (
          <p className="text-sm text-muted-foreground">
            {budgets.length} {budgets.length === 1 ? 'budget' : 'budgets'}
          </p>
        )}
      </div>

      {/* Content */}
      {listQuery.isLoading && <BudgetListSkeleton />}

      {listQuery.isError && (
        <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4 shadow-sm text-sm">
          <p className="text-muted-foreground">Could not load budgets.</p>
          <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!listQuery.isLoading && !listQuery.isError && budgets.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card py-12 text-center shadow-sm">
          <LayoutDashboard className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">No budgets yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first budget to start tracking your finances.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Budget
          </Button>
        </div>
      )}

      {!listQuery.isLoading && !listQuery.isError && budgets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={openEdit}
              onDeleteRequest={handleDeleteRequest}
              onRollForward={handleRollForward}
              isRollingForward={rollingForwardId === budget.id}
            />
          ))}
        </div>
      )}

      <BudgetFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editTarget ? 'Edit Budget' : 'New Budget'}
        submitLabel={editTarget ? 'Save Changes' : 'Create Budget'}
        defaultValues={editDefaultValues}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        serverError={formError}
        mode={formMode}
        onCategoriesChange={setPendingCategories}
      />

      <DeleteBudgetDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        budgetName={deleteTarget?.name ?? ''}
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
        error={deleteError}
      />
    </div>
  );
}
