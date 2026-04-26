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
  useDeleteBudget,
  useRollForwardBudget,
} from './hooks/useBudgetMutations';
import { BudgetCard } from './components/BudgetCard';
import { BudgetListSkeleton } from './components/BudgetListSkeleton';
import { BudgetWizardDialog } from './components/BudgetWizardDialog';
import { BudgetEditDialog } from './components/BudgetEditDialog';
import type { BudgetFormData } from './components/budgetFormSchema';
import { DeleteBudgetDialog } from './components/DeleteBudgetDialog';

export function BudgetListPage() {
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState<BudgetTypeValue | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetSummaryDto | null>(null);
  const [rollingForwardId, setRollingForwardId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetSummaryDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useBudgetList(filterType ? { budgetType: filterType } : undefined);
  const deleteMutation = useDeleteBudget();
  const rollForwardMutation = useRollForwardBudget();

  const budgets = listQuery.data ?? [];

  function openCreate() {
    setCreateOpen(true);
  }

  function openEdit(budget: BudgetSummaryDto) {
    setEditTarget(budget);
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

  const editDefaults: BudgetFormData | null = editTarget
    ? {
        name: editTarget.name,
        budgetType: editTarget.budgetType,
        startDate: editTarget.startDate,
        endDate: editTarget.endDate,
        isRecurring: editTarget.isRecurring,
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
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

      <BudgetWizardDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editTarget && editDefaults && (
        <BudgetEditDialog
          open={editTarget !== null}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          budgetId={editTarget.id}
          defaultValues={editDefaults}
        />
      )}

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
