import { Card, CardContent } from '@/components/ui/card';

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="mt-2 h-9 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}
