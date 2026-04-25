import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress as ProgressRoot, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent, formatVariance } from '@/lib/formatters';
import type { BudgetSummaryReportDto } from '@/types/api';

function progressColorClass(pct: number, invertGood: boolean): string {
  if (invertGood) {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-rose-500';
  }
  if (pct >= 100) return 'bg-rose-500';
  if (pct >= 80) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function varianceColorClass(variance: number, invertGood: boolean): string {
  const isPositive = variance >= 0;
  const isGood = invertGood ? isPositive : !isPositive;
  return isGood ? 'text-emerald-600' : 'text-rose-600';
}

interface BudgetProgressRowProps {
  label: string;
  planned: number;
  actual: number;
  invertGood?: boolean;
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

interface BudgetHealthSectionProps {
  data: BudgetSummaryReportDto | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function BudgetHealthSection({ data, isLoading, isError, refetch }: BudgetHealthSectionProps) {
  const allOnTrack = data
    ? data.totalExpensesActual <= data.totalExpensesPlanned &&
      data.totalSavingsActual >= data.totalSavingsPlanned * 0.8 &&
      data.totalIncomeActual >= data.totalIncomePlanned * 0.8
    : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Health</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="h-48 animate-pulse rounded-lg bg-muted" />}

        {isError && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Could not load budget health.
            </div>
            <Button variant="ghost" size="sm" onClick={refetch}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && data && (
          <div className="space-y-5">
            {allOnTrack && (
              <div className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                You're on track this period
              </div>
            )}
            <BudgetProgressRow
              label="Income"
              planned={data.totalIncomePlanned}
              actual={data.totalIncomeActual}
              invertGood
            />
            <BudgetProgressRow
              label="Expenses"
              planned={data.totalExpensesPlanned}
              actual={data.totalExpensesActual}
            />
            <BudgetProgressRow
              label="Savings"
              planned={data.totalSavingsPlanned}
              actual={data.totalSavingsActual}
              invertGood
            />
            {(() => {
              const overallVariance =
                (data.totalIncomeActual - data.totalExpensesActual - data.totalSavingsActual) -
                (data.totalIncomePlanned - data.totalExpensesPlanned - data.totalSavingsPlanned);
              return (
                <div className="flex items-center justify-between border-t pt-3 text-sm">
                  <span className="text-muted-foreground">Overall variance</span>
                  <span
                    className={cn(
                      'font-semibold',
                      overallVariance >= 0 ? 'text-emerald-600' : 'text-rose-600',
                    )}
                  >
                    {formatVariance(overallVariance)}
                  </span>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
