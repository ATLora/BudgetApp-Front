import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { SpendingByCategoryDto } from '@/types/api';

const CHART_PALETTE = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

interface SpendingByCategoryChartProps {
  categories: SpendingByCategoryDto[];
  totalExpenses: number;
}

export function SpendingByCategoryChart({ categories, totalExpenses }: SpendingByCategoryChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">No expenses yet</p>
              <p className="text-sm text-muted-foreground">
                Your spending breakdown will appear here once you add transactions.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="total"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="80%"
                >
                  {categories.map((cat, index) => (
                    <Cell
                      key={cat.categoryId}
                      fill={cat.color ?? CHART_PALETTE[index % CHART_PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {categories.map((cat, index) => (
                <div key={cat.categoryId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: cat.color ?? CHART_PALETTE[index % CHART_PALETTE.length],
                      }}
                    />
                    <span>{cat.categoryName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{formatPercent(cat.percentageOfTotal, 0)}</span>
                    <span className="w-20 text-right font-medium text-foreground">
                      {formatCurrency(cat.total)}
                    </span>
                  </div>
                </div>
              ))}
              {totalExpenses > 0 && (
                <div className="flex items-center justify-between border-t pt-2 text-sm font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(totalExpenses)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
