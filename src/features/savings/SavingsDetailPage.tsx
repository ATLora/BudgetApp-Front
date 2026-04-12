// src/features/savings/SavingsDetailPage.tsx
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Pause, Play, Plus } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Progress as ProgressRoot,
  ProgressTrack,
  ProgressIndicator,
} from '@/components/ui/progress';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';
import { SavingsGoalStatus } from '@/types/api';
import { useSavingsGoalDetail } from './hooks/useSavingsGoalDetail';
import { useSavingsGoalProgress } from './hooks/useSavingsGoalProgress';
import {
  useDeleteSavingsGoal,
  useUpdateSavingsGoalStatus,
  useDeleteContribution,
} from './hooks/useSavingsGoalMutations';
import { SavingsGoalFormDialog } from './components/SavingsGoalFormDialog';
import { ContributionFormDialog } from './components/ContributionFormDialog';

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-sky-100 text-sky-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Paused: 'bg-amber-100 text-amber-700',
};

function progressBarClass(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500';
  return 'bg-sky-500';
}

export function SavingsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [editOpen, setEditOpen] = useState(false);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingContributionId, setDeletingContributionId] = useState<string | null>(null);
  const [confirmDeleteContribId, setConfirmDeleteContribId] = useState<string | null>(null);

  const detailQuery = useSavingsGoalDetail(id ?? '');
  const progressQuery = useSavingsGoalProgress(id ?? '');
  const deleteMutation = useDeleteSavingsGoal();
  const statusMutation = useUpdateSavingsGoalStatus();
  const deleteContribMutation = useDeleteContribution();

  const goal = detailQuery.data;
  const progress = progressQuery.data;

  function handleDelete() {
    if (!id) return;
    setDeleteError(null);
    deleteMutation.mutate(id, {
      onSuccess: () => navigate('/savings'),
      onError: (err) => {
        setDeleteError(
          axios.isAxiosError(err)
            ? err.response?.data?.detail || err.response?.data?.title || err.message
            : 'Failed to delete savings goal.',
        );
      },
    });
  }

  function handleToggleStatus() {
    if (!id || !goal) return;
    const newStatus =
      goal.status === SavingsGoalStatus.Active
        ? SavingsGoalStatus.Paused
        : SavingsGoalStatus.Active;
    statusMutation.mutate({ id, status: newStatus });
  }

  function handleDeleteContribution(contributionId: string) {
    if (!id) return;
    setDeletingContributionId(contributionId);
    setConfirmDeleteContribId(null);
    deleteContribMutation.mutate(
      { goalId: id, contributionId },
      { onSettled: () => setDeletingContributionId(null) },
    );
  }

  // Loading state
  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  // Error state
  if (detailQuery.isError || !goal) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          to="/savings"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Savings Goals
        </Link>
        <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4 shadow-sm text-sm">
          <p className="text-muted-foreground">Could not load savings goal.</p>
          <Button variant="outline" size="sm" onClick={() => detailQuery.refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const clampedPct = Math.min(goal.progressPercentage, 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Back */}
      <Link
        to="/savings"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Savings Goals
      </Link>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-semibold">{goal.name}</h1>
            <Badge
              className={`flex-shrink-0 border-0 ${STATUS_STYLES[goal.status] ?? ''}`}
            >
              {goal.status}
            </Badge>
          </div>
          {goal.description && (
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Pause / Resume */}
          {goal.status !== SavingsGoalStatus.Completed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              disabled={statusMutation.isPending}
            >
              {goal.status === SavingsGoalStatus.Active ? (
                <>
                  <Pause className="mr-1.5 h-3.5 w-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Resume
                </>
              )}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => {
              setShowDeleteConfirm(true);
              setDeleteError(null);
            }}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Progress section */}
      <div className="rounded-xl border bg-card px-5 py-4 shadow-sm">
        <ProgressRoot value={clampedPct}>
          <ProgressTrack className="h-3">
            <ProgressIndicator className={progressBarClass(goal.progressPercentage)} />
          </ProgressTrack>
        </ProgressRoot>
        <p className="mt-2 text-right text-sm font-medium text-muted-foreground">
          {formatPercent(goal.progressPercentage, 1)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Target</p>
            <p className="mt-0.5 font-semibold">{formatCurrency(goal.targetAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saved</p>
            <p className="mt-0.5 font-semibold text-sky-600">
              {formatCurrency(goal.currentAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="mt-0.5 font-semibold">
              {formatCurrency(goal.remainingAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Days Left</p>
            <p className="mt-0.5 font-semibold">
              {progress?.daysRemaining !== null && progress?.daysRemaining !== undefined
                ? progress.daysRemaining
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Overdue warning */}
      {progress?.isOverdue && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">
          This goal is past its target date. Consider adjusting the target date or increasing contributions.
        </div>
      )}

      {/* Contributions section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contributions</h2>
          <Button size="sm" variant="outline" onClick={() => setContributionOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Contribution
          </Button>
        </div>

        {goal.contributions.length === 0 ? (
          <div className="rounded-xl border bg-card px-5 py-8 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">No contributions yet.</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setContributionOpen(true)}
            >
              Add your first contribution
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {goal.contributions.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-sky-600">
                      +{formatCurrency(c.amount)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(c.contributionDate, 'MMM d, yyyy')}
                    </span>
                  </div>
                  {(c.notes || c.budgetName) && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[c.budgetName, c.notes].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                {confirmDeleteContribId === c.id ? (
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteContribution(c.id)}
                      disabled={deletingContributionId === c.id}
                    >
                      {deletingContributionId === c.id ? 'Deleting…' : 'Confirm'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteContribId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmDeleteContribId(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete goal confirmation */}
      {showDeleteConfirm && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm">
          <p className="font-medium text-destructive">
            Delete this savings goal? This cannot be undone.
          </p>
          {deleteError && <p className="mt-1 text-destructive">{deleteError}</p>}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Confirm Delete'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <SavingsGoalFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        goal={goal}
      />

      {/* Contribution dialog */}
      <ContributionFormDialog
        open={contributionOpen}
        onOpenChange={setContributionOpen}
        goalId={id ?? ''}
      />
    </div>
  );
}
