import { PiggyBank, AlertCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Progress as ProgressRoot, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { DashboardSavingsDto, SavingsGoalSnapshotDto } from '@/types/api';

function goalIndicatorClass(pct: number): string {
  if (pct >= 100) return 'bg-rose-500';
  if (pct >= 80) return 'bg-amber-500';
  return 'bg-emerald-500';
}

interface GoalRowProps {
  goal: SavingsGoalSnapshotDto;
}

function GoalRow({ goal }: GoalRowProps) {
  const pct = goal.progressPercentage;
  const clampedPct = Math.min(pct, 100);
  const isComplete = pct >= 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">{goal.name}</span>
          {goal.isOverdue && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Overdue
            </span>
          )}
          {isComplete && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Goal reached!
            </span>
          )}
        </div>
        <span className="text-muted-foreground">
          {formatCurrency(goal.currentAmount)}{' '}
          <span className="text-xs">/ {formatCurrency(goal.targetAmount)}</span>
        </span>
      </div>
      {isComplete ? (
        <div className="h-1.5 w-full rounded-full bg-emerald-100">
          <div className="h-full w-full rounded-full bg-emerald-500" />
        </div>
      ) : (
        <ProgressRoot value={clampedPct}>
          <ProgressTrack className="h-1.5">
            <ProgressIndicator className={goalIndicatorClass(pct)} />
          </ProgressTrack>
        </ProgressRoot>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatPercent(pct, 0)}</span>
        {goal.daysRemaining !== null && !isComplete && (
          <span>{goal.daysRemaining} days remaining</span>
        )}
      </div>
    </div>
  );
}

interface SavingsGoalsPanelProps {
  data: DashboardSavingsDto | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function SavingsGoalsPanel({ data, isLoading, isError, refetch }: SavingsGoalsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Savings Goals</CardTitle>
        {data && (
          <p className="text-xs text-muted-foreground">
            {data.activeGoalCount} active · {data.completedGoalCount} completed
            {data.overdueGoalCount > 0 && (
              <span className="ml-1 text-amber-600">· {data.overdueGoalCount} overdue</span>
            )}
          </p>
        )}
      </CardHeader>
      <CardContent className={cn(!data?.goals.length && 'py-2')}>
        {isLoading && <div className="h-48 animate-pulse rounded-lg bg-muted" />}

        {isError && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Could not load savings goals.
            </div>
            <Button variant="ghost" size="sm" onClick={refetch}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && data && (
          <>
            {data.goals.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <PiggyBank className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">No savings goals yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start saving towards something you care about.
                  </p>
                </div>
                <Link to="/savings" className={buttonVariants()}>+ Add your first goal</Link>
              </div>
            ) : (
              <div className="space-y-5">
                {data.totalTargetAmount > 0 && (
                  <div className="rounded-lg bg-sky-50 px-4 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-sky-700">Overall progress</span>
                      <span className="font-semibold text-sky-700">
                        {formatCurrency(data.totalCurrentAmount)} / {formatCurrency(data.totalTargetAmount)}
                      </span>
                    </div>
                    <ProgressRoot value={Math.min(data.overallProgressPercentage, 100)} className="mt-2">
                      <ProgressTrack className="h-1.5">
                        <ProgressIndicator className="bg-sky-500" />
                      </ProgressTrack>
                    </ProgressRoot>
                    <p className="mt-1 text-right text-xs text-sky-600">
                      {formatPercent(data.overallProgressPercentage, 0)}
                    </p>
                  </div>
                )}
                {data.goals.map((goal) => (
                  <GoalRow key={goal.goalId} goal={goal} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
      {!isLoading && !isError && data && data.goals.length > 0 && (
        <CardFooter>
          <Link to="/savings" className="text-sm font-medium text-primary hover:underline">
            View all goals →
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
