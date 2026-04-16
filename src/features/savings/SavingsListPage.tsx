// src/features/savings/SavingsListPage.tsx
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/formatters';
import type { SavingsGoalStatus as StatusType } from '@/types/api';
import { useSavingsGoalList } from './hooks/useSavingsGoalList';
import { useDashboardSavings } from '@/features/dashboard/hooks/useDashboardSavings';
import { SavingsGoalCard } from './components/SavingsGoalCard';
import { SavingsGoalFormDialog } from './components/SavingsGoalFormDialog';

interface StatCardProps {
  label: string;
  value: string;
  colorClass: string;
}

function StatCard({ label, value, colorClass }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${colorClass}`}>{value}</p>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      <div className="mt-1.5 h-5 w-24 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function SavingsListPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusType | undefined>(undefined);

  const listQuery = useSavingsGoalList();
  const dashboardQuery = useDashboardSavings();

  const allGoals = listQuery.data ?? [];
  const goals = statusFilter
    ? allGoals.filter((g) => g.status === statusFilter)
    : allGoals;

  const dashData = dashboardQuery.data;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Savings Goals</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track progress toward your savings goals
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Goal
        </Button>
      </div>

      {/* Summary bar */}
      {dashboardQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : dashData ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total Saved"
            value={formatCurrency(dashData.totalCurrentAmount)}
            colorClass="text-sky-600"
          />
          <StatCard
            label="Total Target"
            value={formatCurrency(dashData.totalTargetAmount)}
            colorClass="text-foreground"
          />
          <StatCard
            label="Active Goals"
            value={String(dashData.activeGoalCount)}
            colorClass="text-sky-600"
          />
          <StatCard
            label="Completed"
            value={String(dashData.completedGoalCount)}
            colorClass="text-emerald-600"
          />
        </div>
      ) : null}

      {/* Status filter */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter ?? '__all__'}
          onValueChange={(v) =>
            setStatusFilter(!v || v === '__all__' ? undefined : (v as StatusType))
          }
          items={{
            __all__: 'All statuses',
            Active: 'Active',
            Completed: 'Completed',
            Paused: 'Paused',
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Goal grid */}
      {listQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4 shadow-sm text-sm">
          <p className="text-muted-foreground">Could not load savings goals.</p>
          <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-xl border bg-card px-5 py-12 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            {statusFilter ? 'No goals match this filter.' : 'No savings goals yet.'}
          </p>
          {!statusFilter && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setDialogOpen(true)}
            >
              Create your first savings goal
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <SavingsGoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <SavingsGoalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="create"
      />
    </div>
  );
}
