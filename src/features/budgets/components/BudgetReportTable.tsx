import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency, formatVariance } from '@/lib/formatters';
import type { BudgetSummaryReportDto } from '@/types/api';

interface BudgetReportTableProps {
  data: BudgetSummaryReportDto | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function BudgetReportTable({ data, isLoading, isError, refetch }: BudgetReportTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Report</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="h-48 animate-pulse rounded-lg bg-muted" />}

        {isError && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Could not load category report.
            </div>
            <Button variant="ghost" size="sm" onClick={refetch}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && data && (
          <div className="space-y-1">
            {/* Table header */}
            <div className="grid grid-cols-4 gap-2 pb-2 text-xs font-medium text-muted-foreground">
              <span>Category</span>
              <span className="text-right">Planned</span>
              <span className="text-right">Actual</span>
              <span className="text-right">Variance</span>
            </div>

            {data.categoryBreakdown.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No categories assigned to this budget yet.
              </p>
            ) : (
              <>
                {data.categoryBreakdown.map((row) => (
                  <div
                    key={row.budgetCategoryId}
                    className="grid grid-cols-4 gap-2 rounded-md px-1 py-2 text-sm hover:bg-muted/50"
                  >
                    <span className="font-medium">{row.categoryName}</span>
                    <span className="text-right text-muted-foreground">
                      {formatCurrency(row.plannedAmount)}
                    </span>
                    <span className="text-right">{formatCurrency(row.actualAmount)}</span>
                    <span
                      className={cn(
                        'text-right font-medium',
                        row.variance >= 0 ? 'text-emerald-600' : 'text-rose-600',
                      )}
                    >
                      {formatVariance(row.variance)}
                    </span>
                  </div>
                ))}

                {/* Totals row */}
                {(() => {
                  const netPlanned =
                    data.totalIncomePlanned -
                    data.totalExpensesPlanned -
                    data.totalSavingsPlanned;
                  const netActual =
                    data.totalIncomeActual -
                    data.totalExpensesActual -
                    data.totalSavingsActual;
                  const netVariance = netPlanned - netActual;
                  return (
                    <div className="grid grid-cols-4 gap-2 border-t pt-2 text-sm font-semibold">
                      <span>Total</span>
                      <span className="text-right">{formatCurrency(netPlanned)}</span>
                      <span className="text-right">{formatCurrency(netActual)}</span>
                      <span
                        className={cn(
                          'text-right',
                          netVariance >= 0 ? 'text-emerald-600' : 'text-rose-600',
                        )}
                      >
                        {formatVariance(netVariance)}
                      </span>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
