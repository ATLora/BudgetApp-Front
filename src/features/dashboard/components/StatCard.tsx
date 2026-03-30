import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendDirection } from '@/types/api';
import type { TrendDirection as TrendDirectionType } from '@/types/api';

interface TrendInfo {
  direction: TrendDirectionType;
  label: string;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconBgClass: string;
  iconColorClass: string;
  valueColorClass?: string;
  trend?: TrendInfo;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconBgClass,
  iconColorClass,
  valueColorClass,
  trend,
}: StatCardProps) {
  const trendArrow =
    trend?.direction === TrendDirection.Up
      ? '↑'
      : trend?.direction === TrendDirection.Down
        ? '↓'
        : '→';

  const trendColorClass =
    trend?.direction === TrendDirection.Up
      ? 'text-emerald-600'
      : trend?.direction === TrendDirection.Down
        ? 'text-rose-600'
        : 'text-muted-foreground';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent>
        <div className="flex items-start justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconBgClass)}>
            <Icon className={cn('h-4 w-4', iconColorClass)} />
          </div>
        </div>
        <div className={cn('mt-2 text-3xl font-bold', valueColorClass)}>{value}</div>
        {trend && (
          <div className={cn('mt-2 text-xs font-medium', trendColorClass)}>
            {trendArrow} {trend.label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
