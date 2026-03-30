import { LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress as ProgressRoot } from '@base-ui/react/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, formatPercent, formatVariance } from '@/lib/formatters';
import type { BudgetHealthDto } from '@/types/api';

interface BudgetProgressRowProps {
  label: string;
  planned: number;
  actual: number;
  invertGood?: boolean; // income: more actual = better; expenses: less actual = better
}

function progressColorClass(pct: number, invertGood: boolean): string {
  if (invertGood) {
    // income: hitting target is good
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-rose-500';
  }
  // expenses/savings: staying under is good
  if (pct >= 100) return 'bg-rose-500';
  if (pct >= 80) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function varianceColorClass(variance: number, invertGood: boolean): string {
  const isPositive = variance >= 0;
  const isGood = invertGood ? isPositive : !isPositive;
  return isGood ? 'text-emerald-600' : 'text-rose-600';
}

function BudgetProgressRow({ label, planned, actual, invertGood = false }: BudgetProgressRowProps) {
  const pct = planned > 0 ? (actual / planned) * 100 : 0;
  const clampedPct = Math.min(pct, 100);
  const variance = actual - planned;
  const overBudget = pct >= 100 && !invertGood;
  const underTarget = pct < 100 && invertGood;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {formatCurrency(actual)}{' '}
          <span className="text-xs">/ {formatCurrency(planned)}</span>
        </span>
      </div>
      <ProgressRoot value={clampedPct}>
        <ProgressTrack>
          <ProgressIndicator className={progressColorClass(pct, invertGood)} />
        </ProgressTrack>
      </ProgressRoot>
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            'font-medium',
            overBudget && 'text-rose-600',
            underTarget && 'text-rose-600',
            !overBudget && !underTarget && 'text-muted-foreground',
          )}
        >
          {formatPercent(pct, 0)}
          {overBudget && ` — ${formatCurrency(Math.abs(variance))} over`}
          {underTarget && ` — ${formatCurrency(Math.abs(variance))} below target`}
        </span>
        <span className={cn('font-medium', varianceColorClass(variance, invertGood))}>
          {formatVariance(variance)}
        </span>
      </div>
    </div>
  );
}

interface BudgetHealthCardProps {
  currentBudget: BudgetHealthDto | null;
}

export function BudgetHealthCard({ currentBudget }: BudgetHealthCardProps) {
  if (!currentBudget) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Budget</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <LayoutDashboard className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">No active budget</p>
            <p className="text-sm text-muted-foreground">
              Create a budget to start tracking your spending.
            </p>
          </div>
          <Button asChild>
            <Link to="/budgets">+ Create a budget</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const allOnTrack =
    currentBudget.expensesActual <= currentBudget.expensesPlanned &&
    currentBudget.savingsActual >= currentBudget.savingsPlanned * 0.8 &&
    currentBudget.incomeActual >= currentBudget.incomePlanned * 0.8;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{currentBudget.budgetName}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {formatDate(currentBudget.startDate, 'MMM d')} –{' '}
          {formatDate(currentBudget.endDate, 'MMM d, yyyy')}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {allOnTrack && (
          <div className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
            You're on track this month
          </div>
        )}
        <BudgetProgressRow
          label="Income"
          planned={currentBudget.incomePlanned}
          actual={currentBudget.incomeActual}
          invertGood
        />
        <BudgetProgressRow
          label="Expenses"
          planned={currentBudget.expensesPlanned}
          actual={currentBudget.expensesActual}
        />
        <BudgetProgressRow
          label="Savings"
          planned={currentBudget.savingsPlanned}
          actual={currentBudget.savingsActual}
          invertGood
        />
      </CardContent>
    </Card>
  );
}
