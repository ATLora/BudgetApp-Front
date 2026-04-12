// src/features/savings/components/SavingsGoalCard.tsx
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Progress as ProgressRoot,
  ProgressTrack,
  ProgressIndicator,
} from '@/components/ui/progress';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';
import type { SavingsGoalSummaryDto } from '@/types/api';

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-sky-100 text-sky-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Paused: 'bg-amber-100 text-amber-700',
};

function progressBarClass(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500';
  return 'bg-sky-500';
}

interface SavingsGoalCardProps {
  goal: SavingsGoalSummaryDto;
}

export function SavingsGoalCard({ goal }: SavingsGoalCardProps) {
  const navigate = useNavigate();
  const clampedPct = Math.min(goal.progressPercentage, 100);
  const isOverdue =
    goal.status === 'Active' &&
    goal.targetDate !== null &&
    new Date(goal.targetDate) < new Date();

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/savings/${goal.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/savings/${goal.id}`);
        }
      }}
      aria-label={`View savings goal: ${goal.name}`}
      className="cursor-pointer transition-shadow hover:shadow-md"
    >
      <CardContent className="flex flex-col gap-3 p-4">
        {/* Header: name + status */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold">{goal.name}</h3>
          <Badge
            className={`flex-shrink-0 border-0 ${STATUS_STYLES[goal.status] ?? ''}`}
          >
            {goal.status}
          </Badge>
        </div>

        {/* Progress bar */}
        <ProgressRoot value={clampedPct}>
          <ProgressTrack className="h-2">
            <ProgressIndicator className={progressBarClass(goal.progressPercentage)} />
          </ProgressTrack>
        </ProgressRoot>

        {/* Amounts + percentage */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-sky-600 font-medium">
            {formatCurrency(goal.currentAmount)}{' '}
            <span className="text-muted-foreground font-normal">
              / {formatCurrency(goal.targetAmount)}
            </span>
          </span>
          <span className="text-muted-foreground">
            {formatPercent(goal.progressPercentage, 0)}
          </span>
        </div>

        {/* Target date + overdue */}
        {goal.targetDate && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Target: {formatDate(goal.targetDate, 'MMM d, yyyy')}</span>
            {isOverdue && (
              <span className="font-medium text-rose-600">Overdue</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
