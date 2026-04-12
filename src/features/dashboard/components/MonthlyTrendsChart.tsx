import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCompactCurrency, formatCurrency } from '@/lib/formatters';
import type { DashboardTrendsDto } from '@/types/api';

interface MonthlyTrendsChartProps {
  data: DashboardTrendsDto | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function MonthlyTrendsChart({ data, isLoading, isError, refetch }: MonthlyTrendsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Trends</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="h-72 animate-pulse rounded-lg bg-muted" />}

        {isError && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Could not load trend data.
            </div>
            <Button variant="ghost" size="sm" onClick={refetch}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && data && (
          <>
            {data.monthlyTrends.length === 0 ? (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                Not enough data yet — keep recording transactions.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.monthlyTrends} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatCompactCurrency}
                    tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(typeof value === 'number' ? value : 0), String(name)]}
                    contentStyle={{
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '0.75rem', paddingTop: '1rem' }}
                  />
                  <Bar dataKey="income" name="Income" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="var(--color-chart-5)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="netSavings" name="Net Savings" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
