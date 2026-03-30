import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, formatPercent } from '@/lib/formatters';
import { TrendDirection } from '@/types/api';
import { useDashboardSummary } from './hooks/useDashboardSummary';
import { useDashboardSpending } from './hooks/useDashboardSpending';
import { useDashboardSavings } from './hooks/useDashboardSavings';
import { useDashboardTrends } from './hooks/useDashboardTrends';
import { StatCard } from './components/StatCard';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { BudgetHealthCard } from './components/BudgetHealthCard';
import { SpendingByCategoryChart } from './components/SpendingByCategoryChart';
import { SpendingComparisonBanner } from './components/SpendingComparisonBanner';
import { MonthlyTrendsChart } from './components/MonthlyTrendsChart';
import { SavingsGoalsPanel } from './components/SavingsGoalsPanel';

export function DashboardPage() {
  const summaryQuery = useDashboardSummary();
  const spendingQuery = useDashboardSpending();
  const trendsQuery = useDashboardTrends();
  const savingsQuery = useDashboardSavings();

  const isPrimaryLoading = summaryQuery.isLoading || spendingQuery.isLoading;
  const isPrimaryError = summaryQuery.isError || spendingQuery.isError;

  const summary = summaryQuery.data;
  const spending = spendingQuery.data;
  const trends = trendsQuery.data;

  function retryPrimary() {
    if (summaryQuery.isError) summaryQuery.refetch();
    if (spendingQuery.isError) spendingQuery.refetch();
  }

  if (isPrimaryLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your financial overview</p>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  if (isPrimaryError) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your financial overview</p>
        </div>
        <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Could not load your financial overview.
          </div>
          <Button variant="outline" size="sm" onClick={retryPrimary}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const periodLabel =
    summary
      ? `${formatDate(summary.from, 'MMM d')} – ${formatDate(summary.to, 'MMM d, yyyy')}`
      : 'This month';

  const netCashFlowNegative = (summary?.netCashFlow ?? 0) < 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{periodLabel}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Income"
          value={formatCurrency(summary?.totalIncome ?? 0)}
          icon={TrendingUp}
          iconBgClass="bg-emerald-100"
          iconColorClass="text-emerald-700"
          trend={
            trends
              ? {
                  direction: trends.incomeDirection,
                  label:
                    trends.incomeDirection === TrendDirection.Flat
                      ? 'stable vs avg'
                      : `${trends.incomeDirection === TrendDirection.Up ? 'above' : 'below'} avg ${formatCurrency(trends.averageMonthlyIncome)}`,
                }
              : undefined
          }
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(summary?.totalExpenses ?? 0)}
          icon={TrendingDown}
          iconBgClass="bg-rose-100"
          iconColorClass="text-rose-700"
          trend={
            trends
              ? {
                  direction:
                    trends.expenseDirection === TrendDirection.Up
                      ? TrendDirection.Down
                      : trends.expenseDirection === TrendDirection.Down
                        ? TrendDirection.Up
                        : TrendDirection.Flat,
                  label:
                    trends.expenseDirection === TrendDirection.Flat
                      ? 'stable vs avg'
                      : `${trends.expenseDirection === TrendDirection.Down ? 'below' : 'above'} avg ${formatCurrency(trends.averageMonthlyExpenses)}`,
                }
              : undefined
          }
        />
        <StatCard
          label="Net Cash Flow"
          value={formatCurrency(summary?.netCashFlow ?? 0)}
          icon={Wallet}
          iconBgClass={netCashFlowNegative ? 'bg-rose-100' : 'bg-emerald-100'}
          iconColorClass={netCashFlowNegative ? 'text-rose-700' : 'text-emerald-700'}
          valueColorClass={cn(netCashFlowNegative && 'text-rose-600')}
        />
        <StatCard
          label="Savings Rate"
          value={formatPercent(summary?.savingsRate ?? 0)}
          icon={PiggyBank}
          iconBgClass="bg-sky-100"
          iconColorClass="text-sky-700"
          trend={
            trends
              ? {
                  direction: trends.savingsDirection,
                  label:
                    trends.savingsDirection === TrendDirection.Flat
                      ? 'stable vs avg'
                      : `${trends.savingsDirection === TrendDirection.Up ? 'above' : 'below'} avg`,
                }
              : undefined
          }
        />
      </div>

      {/* Period comparison banner */}
      <SpendingComparisonBanner comparison={spending?.previousPeriodComparison ?? null} />

      {/* Budget health + Spending by category */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BudgetHealthCard currentBudget={summary?.currentBudget ?? null} />
        <SpendingByCategoryChart
          categories={spending?.topCategories ?? []}
          totalExpenses={spending?.totalExpenses ?? 0}
        />
      </div>

      {/* Monthly trends chart */}
      <MonthlyTrendsChart
        data={trends}
        isLoading={trendsQuery.isLoading}
        isError={trendsQuery.isError}
        refetch={trendsQuery.refetch}
      />

      {/* Savings goals panel */}
      <SavingsGoalsPanel
        data={savingsQuery.data}
        isLoading={savingsQuery.isLoading}
        isError={savingsQuery.isError}
        refetch={savingsQuery.refetch}
      />
    </div>
  );
}
