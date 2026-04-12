# Savings Goals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full CRUD Savings Goals feature with card-grid list page, progress-focused detail page, contribution management, and transaction-to-goal linking.

**Architecture:** Feature-contained in `src/features/savings/` following existing transaction patterns. Query/mutation hooks wrap `savingsApi` (already exists). Two pages replace existing stubs. One cross-boundary change adds a savings goal dropdown to `TransactionFormDialog`.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, react-hook-form + Zod, shadcn/ui (Dialog, Progress, Badge, Card, Select), Tailwind CSS v4, Axios, date-fns, lucide-react icons.

**Spec:** `Docs/superpowers/specs/2026-04-12-savings-goals-design.md`

**Verification gate:** `npx tsc --noEmit` + browser testing (no test suite in this project).

---

## File Structure

```
src/features/savings/
  SavingsListPage.tsx              (replace stub)
  SavingsDetailPage.tsx            (replace stub)
  hooks/
    useSavingsGoalList.ts          (create)
    useSavingsGoalDetail.ts        (create)
    useSavingsGoalProgress.ts      (create)
    useSavingsGoalMutations.ts     (create)
  components/
    SavingsGoalCard.tsx            (create)
    SavingsGoalFormDialog.tsx      (create)
    ContributionFormDialog.tsx     (create)

Modified:
  src/features/transactions/components/TransactionFormDialog.tsx
```

---

### Task 1: Query Hooks

**Files:**
- Create: `src/features/savings/hooks/useSavingsGoalList.ts`
- Create: `src/features/savings/hooks/useSavingsGoalDetail.ts`
- Create: `src/features/savings/hooks/useSavingsGoalProgress.ts`

- [ ] **Step 1: Create `useSavingsGoalList` hook**

```typescript
// src/features/savings/hooks/useSavingsGoalList.ts
import { useQuery } from '@tanstack/react-query';
import { savingsApi } from '@/services/api/savings';

export function useSavingsGoalList() {
  return useQuery({
    queryKey: ['savings', 'list'],
    queryFn: () => savingsApi.list(),
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Create `useSavingsGoalDetail` hook**

```typescript
// src/features/savings/hooks/useSavingsGoalDetail.ts
import { useQuery } from '@tanstack/react-query';
import { savingsApi } from '@/services/api/savings';

export function useSavingsGoalDetail(id: string) {
  return useQuery({
    queryKey: ['savings', 'detail', id],
    queryFn: () => savingsApi.getById(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
```

- [ ] **Step 3: Create `useSavingsGoalProgress` hook**

```typescript
// src/features/savings/hooks/useSavingsGoalProgress.ts
import { useQuery } from '@tanstack/react-query';
import { savingsApi } from '@/services/api/savings';

export function useSavingsGoalProgress(id: string) {
  return useQuery({
    queryKey: ['savings', 'progress', id],
    queryFn: () => savingsApi.getProgress(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors from the new hook files.

- [ ] **Step 5: Commit**

```bash
git add src/features/savings/hooks/useSavingsGoalList.ts src/features/savings/hooks/useSavingsGoalDetail.ts src/features/savings/hooks/useSavingsGoalProgress.ts
git commit -m "feat: add savings goal query hooks"
```

---

### Task 2: Mutation Hooks

**Files:**
- Create: `src/features/savings/hooks/useSavingsGoalMutations.ts`

- [ ] **Step 1: Create mutation hooks file with all 6 mutations**

```typescript
// src/features/savings/hooks/useSavingsGoalMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { savingsApi } from '@/services/api/savings';
import type {
  CreateSavingsGoalRequest,
  UpdateSavingsGoalRequest,
  AddContributionRequest,
  SavingsGoalStatus,
} from '@/types/api';

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSavingsGoalRequest) => savingsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSavingsGoalRequest }) =>
      savingsApi.update(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['savings', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['savings', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => savingsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateSavingsGoalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SavingsGoalStatus }) =>
      savingsApi.updateStatus(id, status),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['savings', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['savings', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['savings', 'progress', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAddContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, data }: { goalId: string; data: AddContributionRequest }) =>
      savingsApi.addContribution(goalId, data),
    onSuccess: (_result, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: ['savings', 'detail', goalId] });
      queryClient.invalidateQueries({ queryKey: ['savings', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['savings', 'progress', goalId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, contributionId }: { goalId: string; contributionId: string }) =>
      savingsApi.deleteContribution(goalId, contributionId),
    onSuccess: (_result, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: ['savings', 'detail', goalId] });
      queryClient.invalidateQueries({ queryKey: ['savings', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['savings', 'progress', goalId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/savings/hooks/useSavingsGoalMutations.ts
git commit -m "feat: add savings goal mutation hooks"
```

---

### Task 3: SavingsGoalCard Component

**Files:**
- Create: `src/features/savings/components/SavingsGoalCard.tsx`

- [ ] **Step 1: Create the card component**

```typescript
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
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/savings/components/SavingsGoalCard.tsx
git commit -m "feat: add SavingsGoalCard component"
```

---

### Task 4: SavingsGoalFormDialog Component

**Files:**
- Create: `src/features/savings/components/SavingsGoalFormDialog.tsx`

- [ ] **Step 1: Create the form dialog**

```typescript
// src/features/savings/components/SavingsGoalFormDialog.tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCreateSavingsGoal,
  useUpdateSavingsGoal,
} from '../hooks/useSavingsGoalMutations';
import type { SavingsGoalDetailDto } from '@/types/api';

const savingsGoalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  targetAmount: z
    .number({ error: 'Enter a valid amount' })
    .positive('Amount must be greater than 0'),
  targetDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

type SavingsGoalFormData = z.infer<typeof savingsGoalSchema>;

const EMPTY_DEFAULTS: SavingsGoalFormData = {
  name: '',
  targetAmount: 0,
  targetDate: '',
  description: '',
};

export interface SavingsGoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  /** Provide in edit mode to pre-fill the form. */
  goal?: SavingsGoalDetailDto;
  /** Called after a successful mutation. */
  onSuccess?: () => void;
}

export function SavingsGoalFormDialog({
  open,
  onOpenChange,
  mode,
  goal,
  onSuccess,
}: SavingsGoalFormDialogProps) {
  const isEdit = mode === 'edit';
  const [serverError, setServerError] = useState<string | null>(null);

  const editDefaults: SavingsGoalFormData = goal
    ? {
        name: goal.name,
        targetAmount: goal.targetAmount,
        targetDate: goal.targetDate ?? '',
        description: goal.description ?? '',
      }
    : EMPTY_DEFAULTS;

  const form = useForm<SavingsGoalFormData>({
    resolver: zodResolver(savingsGoalSchema),
    defaultValues: isEdit ? editDefaults : EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      setServerError(null);
      form.reset(isEdit ? editDefaults : EMPTY_DEFAULTS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const createMutation = useCreateSavingsGoal();
  const updateMutation = useUpdateSavingsGoal();
  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(data: SavingsGoalFormData) {
    setServerError(null);

    const payload = {
      name: data.name,
      targetAmount: data.targetAmount,
      targetDate: data.targetDate || null,
      description: data.description || null,
    };

    const onError = (err: unknown) => {
      setServerError(
        axios.isAxiosError(err)
          ? err.response?.data?.detail || err.response?.data?.title || err.message
          : 'Failed to save savings goal.',
      );
    };

    if (isEdit && goal) {
      updateMutation.mutate(
        { id: goal.id, data: payload },
        {
          onSuccess: () => {
            onSuccess?.();
            onOpenChange(false);
          },
          onError,
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          onSuccess?.();
          onOpenChange(false);
        },
        onError,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Savings Goal' : 'New Savings Goal'}</DialogTitle>
        </DialogHeader>

        <form
          id="savings-goal-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="sg-name">Name</Label>
            <Input
              id="sg-name"
              type="text"
              aria-invalid={!!form.formState.errors.name}
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Target Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="sg-target">Target Amount</Label>
            <Input
              id="sg-target"
              type="number"
              min="0.01"
              step="0.01"
              aria-invalid={!!form.formState.errors.targetAmount}
              {...form.register('targetAmount', { valueAsNumber: true })}
            />
            {form.formState.errors.targetAmount && (
              <p className="text-xs text-destructive">
                {form.formState.errors.targetAmount.message}
              </p>
            )}
          </div>

          {/* Target Date */}
          <div className="space-y-1.5">
            <Label htmlFor="sg-date">Target Date (optional)</Label>
            <Input id="sg-date" type="date" {...form.register('targetDate')} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="sg-desc">Description (optional)</Label>
            <textarea
              id="sg-desc"
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...form.register('description')}
            />
          </div>

          {serverError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="savings-goal-form" disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/savings/components/SavingsGoalFormDialog.tsx
git commit -m "feat: add SavingsGoalFormDialog component"
```

---

### Task 5: ContributionFormDialog Component

**Files:**
- Create: `src/features/savings/components/ContributionFormDialog.tsx`

- [ ] **Step 1: Create the contribution form dialog**

```typescript
// src/features/savings/components/ContributionFormDialog.tsx
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBudgetList } from '@/features/budgets/hooks/useBudgetList';
import { useAddContribution } from '../hooks/useSavingsGoalMutations';

const contributionSchema = z.object({
  amount: z
    .number({ error: 'Enter a valid amount' })
    .positive('Amount must be greater than 0'),
  contributionDate: z.string().min(1, 'Date is required'),
  notes: z.string().optional().nullable(),
  budgetId: z.string().optional().nullable(),
});

type ContributionFormData = z.infer<typeof contributionSchema>;

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

const EMPTY_DEFAULTS: ContributionFormData = {
  amount: 0,
  contributionDate: todayISO(),
  notes: '',
  budgetId: '',
};

export interface ContributionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  onSuccess?: () => void;
}

export function ContributionFormDialog({
  open,
  onOpenChange,
  goalId,
  onSuccess,
}: ContributionFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ContributionFormData>({
    resolver: zodResolver(contributionSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      setServerError(null);
      form.reset({ ...EMPTY_DEFAULTS, contributionDate: todayISO() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const budgetsQuery = useBudgetList();
  const budgets = budgetsQuery.data ?? [];

  const addMutation = useAddContribution();

  function handleSubmit(data: ContributionFormData) {
    setServerError(null);
    addMutation.mutate(
      {
        goalId,
        data: {
          amount: data.amount,
          contributionDate: data.contributionDate,
          notes: data.notes || null,
          budgetId: data.budgetId || null,
        },
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onOpenChange(false);
        },
        onError: (err) => {
          setServerError(
            axios.isAxiosError(err)
              ? err.response?.data?.detail || err.response?.data?.title || err.message
              : 'Failed to add contribution.',
          );
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Contribution</DialogTitle>
        </DialogHeader>

        <form
          id="contribution-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-amount">Amount</Label>
            <Input
              id="ct-amount"
              type="number"
              min="0.01"
              step="0.01"
              aria-invalid={!!form.formState.errors.amount}
              {...form.register('amount', { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-date">Date</Label>
            <Input
              id="ct-date"
              type="date"
              aria-invalid={!!form.formState.errors.contributionDate}
              {...form.register('contributionDate')}
            />
            {form.formState.errors.contributionDate && (
              <p className="text-xs text-destructive">
                {form.formState.errors.contributionDate.message}
              </p>
            )}
          </div>

          {/* Budget (optional) */}
          <div className="space-y-1.5">
            <Label>Budget (optional)</Label>
            <Controller
              control={form.control}
              name="budgetId"
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                  disabled={budgetsQuery.isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={budgetsQuery.isLoading ? 'Loading…' : 'None'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {budgets.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-notes">Notes (optional)</Label>
            <textarea
              id="ct-notes"
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...form.register('notes')}
            />
          </div>

          {serverError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={addMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="contribution-form" disabled={addMutation.isPending}>
            {addMutation.isPending ? 'Adding…' : 'Add Contribution'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/savings/components/ContributionFormDialog.tsx
git commit -m "feat: add ContributionFormDialog component"
```

---

### Task 6: SavingsListPage

**Files:**
- Modify: `src/features/savings/SavingsListPage.tsx` (replace stub)

- [ ] **Step 1: Replace the stub with the full list page**

```typescript
// src/features/savings/SavingsListPage.tsx
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/formatters';
import type { SavingsGoalStatus as StatusType } from '@/types/api';
import { useSavingsGoalList } from './hooks/useSavingsGoalList';
import { useDashboardSavings } from '@/features/dashboard/hooks/useDashboardSavings';
import { SavingsGoalCard } from './components/SavingsGoalCard';
import { SavingsGoalFormDialog } from './components/SavingsGoalFormDialog';

interface StatCardProps {
  label: string;
  value: string;
  colorClass: string;
}

function StatCard({ label, value, colorClass }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${colorClass}`}>{value}</p>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      <div className="mt-1.5 h-5 w-24 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function SavingsListPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusType | undefined>(undefined);

  const listQuery = useSavingsGoalList();
  const dashboardQuery = useDashboardSavings();

  const allGoals = listQuery.data ?? [];
  const goals = statusFilter
    ? allGoals.filter((g) => g.status === statusFilter)
    : allGoals;

  const dashData = dashboardQuery.data;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Savings Goals</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track progress toward your savings goals
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Goal
        </Button>
      </div>

      {/* Summary bar */}
      {dashboardQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : dashData ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total Saved"
            value={formatCurrency(dashData.totalCurrentAmount)}
            colorClass="text-sky-600"
          />
          <StatCard
            label="Total Target"
            value={formatCurrency(dashData.totalTargetAmount)}
            colorClass="text-foreground"
          />
          <StatCard
            label="Active Goals"
            value={String(dashData.activeGoalCount)}
            colorClass="text-sky-600"
          />
          <StatCard
            label="Completed"
            value={String(dashData.completedGoalCount)}
            colorClass="text-emerald-600"
          />
        </div>
      ) : null}

      {/* Status filter */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter ?? '__all__'}
          onValueChange={(v) =>
            setStatusFilter(!v || v === '__all__' ? undefined : (v as StatusType))
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Goal grid */}
      {listQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4 shadow-sm text-sm">
          <p className="text-muted-foreground">Could not load savings goals.</p>
          <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-xl border bg-card px-5 py-12 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            {statusFilter ? 'No goals match this filter.' : 'No savings goals yet.'}
          </p>
          {!statusFilter && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setDialogOpen(true)}
            >
              Create your first savings goal
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <SavingsGoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <SavingsGoalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="create"
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Open browser and verify the list page**

Run: `npm run dev` (if not already running)
Navigate to `http://localhost:5173/savings`. Verify:
- Header with "New Goal" button renders
- Summary bar shows (or skeleton while loading)
- Status filter dropdown works
- Empty state shows if no goals exist
- Clicking "New Goal" opens the form dialog
- Creating a goal shows it in the grid

- [ ] **Step 4: Commit**

```bash
git add src/features/savings/SavingsListPage.tsx
git commit -m "feat: implement SavingsListPage with card grid and filters"
```

---

### Task 7: SavingsDetailPage

**Files:**
- Modify: `src/features/savings/SavingsDetailPage.tsx` (replace stub)

- [ ] **Step 1: Replace the stub with the full detail page**

```typescript
// src/features/savings/SavingsDetailPage.tsx
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Pause, Play, Plus } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Progress as ProgressRoot,
  ProgressTrack,
  ProgressIndicator,
} from '@/components/ui/progress';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';
import { SavingsGoalStatus } from '@/types/api';
import { useSavingsGoalDetail } from './hooks/useSavingsGoalDetail';
import { useSavingsGoalProgress } from './hooks/useSavingsGoalProgress';
import {
  useDeleteSavingsGoal,
  useUpdateSavingsGoalStatus,
  useDeleteContribution,
} from './hooks/useSavingsGoalMutations';
import { SavingsGoalFormDialog } from './components/SavingsGoalFormDialog';
import { ContributionFormDialog } from './components/ContributionFormDialog';

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-sky-100 text-sky-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Paused: 'bg-amber-100 text-amber-700',
};

function progressBarClass(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500';
  return 'bg-sky-500';
}

export function SavingsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [editOpen, setEditOpen] = useState(false);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingContributionId, setDeletingContributionId] = useState<string | null>(null);

  const detailQuery = useSavingsGoalDetail(id ?? '');
  const progressQuery = useSavingsGoalProgress(id ?? '');
  const deleteMutation = useDeleteSavingsGoal();
  const statusMutation = useUpdateSavingsGoalStatus();
  const deleteContribMutation = useDeleteContribution();

  const goal = detailQuery.data;
  const progress = progressQuery.data;

  function handleDelete() {
    if (!id) return;
    setDeleteError(null);
    deleteMutation.mutate(id, {
      onSuccess: () => navigate('/savings'),
      onError: (err) => {
        setDeleteError(
          axios.isAxiosError(err)
            ? err.response?.data?.detail || err.response?.data?.title || err.message
            : 'Failed to delete savings goal.',
        );
      },
    });
  }

  function handleToggleStatus() {
    if (!id || !goal) return;
    const newStatus =
      goal.status === SavingsGoalStatus.Active
        ? SavingsGoalStatus.Paused
        : SavingsGoalStatus.Active;
    statusMutation.mutate({ id, status: newStatus });
  }

  function handleDeleteContribution(contributionId: string) {
    if (!id) return;
    setDeletingContributionId(contributionId);
    deleteContribMutation.mutate(
      { goalId: id, contributionId },
      { onSettled: () => setDeletingContributionId(null) },
    );
  }

  // Loading state
  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  // Error state
  if (detailQuery.isError || !goal) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          to="/savings"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Savings Goals
        </Link>
        <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4 shadow-sm text-sm">
          <p className="text-muted-foreground">Could not load savings goal.</p>
          <Button variant="outline" size="sm" onClick={() => detailQuery.refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const clampedPct = Math.min(goal.progressPercentage, 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Back */}
      <Link
        to="/savings"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Savings Goals
      </Link>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-semibold">{goal.name}</h1>
            <Badge
              className={`flex-shrink-0 border-0 ${STATUS_STYLES[goal.status] ?? ''}`}
            >
              {goal.status}
            </Badge>
          </div>
          {goal.description && (
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Pause / Resume */}
          {goal.status !== SavingsGoalStatus.Completed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              disabled={statusMutation.isPending}
            >
              {goal.status === SavingsGoalStatus.Active ? (
                <>
                  <Pause className="mr-1.5 h-3.5 w-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Resume
                </>
              )}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => {
              setShowDeleteConfirm(true);
              setDeleteError(null);
            }}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Progress section */}
      <div className="rounded-xl border bg-card px-5 py-4 shadow-sm">
        <ProgressRoot value={clampedPct}>
          <ProgressTrack className="h-3">
            <ProgressIndicator className={progressBarClass(goal.progressPercentage)} />
          </ProgressTrack>
        </ProgressRoot>
        <p className="mt-2 text-right text-sm font-medium text-muted-foreground">
          {formatPercent(goal.progressPercentage, 1)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Target</p>
            <p className="mt-0.5 font-semibold">{formatCurrency(goal.targetAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saved</p>
            <p className="mt-0.5 font-semibold text-sky-600">
              {formatCurrency(goal.currentAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="mt-0.5 font-semibold">
              {formatCurrency(goal.remainingAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Days Left</p>
            <p className="mt-0.5 font-semibold">
              {progress?.daysRemaining !== null && progress?.daysRemaining !== undefined
                ? progress.daysRemaining
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Overdue warning */}
      {progress?.isOverdue && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">
          This goal is past its target date. Consider adjusting the target date or increasing contributions.
        </div>
      )}

      {/* Contributions section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contributions</h2>
          <Button size="sm" variant="outline" onClick={() => setContributionOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Contribution
          </Button>
        </div>

        {goal.contributions.length === 0 ? (
          <div className="rounded-xl border bg-card px-5 py-8 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">No contributions yet.</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setContributionOpen(true)}
            >
              Add your first contribution
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {goal.contributions.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-sky-600">
                      +{formatCurrency(c.amount)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(c.contributionDate, 'MMM d, yyyy')}
                    </span>
                  </div>
                  {(c.notes || c.budgetName) && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[c.budgetName, c.notes].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteContribution(c.id)}
                  disabled={deletingContributionId === c.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete goal confirmation */}
      {showDeleteConfirm && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm">
          <p className="font-medium text-destructive">
            Delete this savings goal? This cannot be undone.
          </p>
          {deleteError && <p className="mt-1 text-destructive">{deleteError}</p>}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Confirm Delete'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <SavingsGoalFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        goal={goal}
      />

      {/* Contribution dialog */}
      <ContributionFormDialog
        open={contributionOpen}
        onOpenChange={setContributionOpen}
        goalId={id ?? ''}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Open browser and verify the detail page**

Navigate to a savings goal detail page. Verify:
- Back link works
- Progress bar, stats row, and status badge render correctly
- Pause/Resume button works
- Edit dialog opens and pre-fills correctly
- Contributions list renders (or empty state)
- Add Contribution dialog works
- Delete contribution works
- Delete goal confirmation works

- [ ] **Step 4: Commit**

```bash
git add src/features/savings/SavingsDetailPage.tsx
git commit -m "feat: implement SavingsDetailPage with progress and contributions"
```

---

### Task 8: TransactionFormDialog — Savings Goal Linking

**Files:**
- Modify: `src/features/transactions/components/TransactionFormDialog.tsx`

- [ ] **Step 1: Add savings goal dropdown and two-step submit logic**

Add the following import at the top of the file, alongside existing imports:

```typescript
import { useSavingsGoalList } from '@/features/savings/hooks/useSavingsGoalList';
import { savingsApi } from '@/services/api/savings';
```

Add a `savingsGoalId` field to the form schema. Replace the existing `transactionSchema` with:

```typescript
const transactionSchema = z.object({
  budgetId: z.string(),
  categoryId: z.string().min(1, 'Select a category'),
  transactionType: z.enum(
    ['Income', 'Expense', 'SavingsDeposit', 'SavingsWithdrawal'] as const,
  ),
  amount: z
    .number({ error: 'Enter a valid amount' })
    .positive('Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  transactionDate: z.string().min(1, 'Date is required'),
  notes: z.string().optional().nullable(),
  savingsGoalId: z.string().optional().nullable(),
});
```

Update `EMPTY_DEFAULTS` to include:

```typescript
const EMPTY_DEFAULTS: TransactionFormData = {
  budgetId: '',
  categoryId: '',
  transactionType: TransactionType.Expense,
  amount: 0,
  description: '',
  transactionDate: todayISO(),
  notes: '',
  savingsGoalId: '',
};
```

Inside the component function body, after `const budgetsQuery = useBudgetList();`, add:

```typescript
const savingsGoalsQuery = useSavingsGoalList();
const activeSavingsGoals = (savingsGoalsQuery.data ?? []).filter(
  (g) => g.status === 'Active',
);
const isSavingsType =
  watchedType === 'SavingsDeposit' || watchedType === 'SavingsWithdrawal';
```

Replace the `handleSubmit` function with the two-step logic:

```typescript
function handleSubmit(data: TransactionFormData) {
  setServerError(null);

  if (isEdit && !transactionId) {
    setServerError('Transaction ID is required in edit mode.');
    return;
  }

  if (!isEdit && !data.budgetId) {
    form.setError('budgetId', { message: 'Select a budget' });
    return;
  }

  const onError = (err: unknown) => {
    setServerError(
      axios.isAxiosError(err)
        ? err.response?.data?.detail || err.response?.data?.title || err.message
        : 'Failed to save transaction.',
    );
  };

  const selectedGoalId = data.savingsGoalId || null;

  if (isEdit && transactionId) {
    updateMutation.mutate(
      {
        id: transactionId,
        budgetId: data.budgetId,
        data: {
          categoryId: data.categoryId,
          amount: data.amount,
          transactionType: data.transactionType,
          description: data.description,
          transactionDate: data.transactionDate,
          notes: data.notes ?? null,
        },
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onOpenChange(false);
        },
        onError,
      },
    );
  } else {
    createMutation.mutate(
      {
        budgetId: data.budgetId,
        categoryId: data.categoryId,
        amount: data.amount,
        transactionType: data.transactionType,
        description: data.description,
        transactionDate: data.transactionDate,
        notes: data.notes ?? null,
      },
      {
        onSuccess: async (newTransactionId) => {
          // Step 2: if a savings goal was selected, create the contribution
          if (selectedGoalId && newTransactionId) {
            try {
              await savingsApi.addContribution(selectedGoalId, {
                amount: data.amount,
                contributionDate: data.transactionDate,
                notes: data.notes ?? null,
                budgetId: data.budgetId || null,
                transactionId: newTransactionId,
              });
            } catch {
              setServerError(
                'Transaction created, but failed to link to savings goal. You can add the contribution manually.',
              );
              return;
            }
          }
          onSuccess?.();
          onOpenChange(false);
        },
        onError,
      },
    );
  }
}
```

Add the savings goal dropdown in the JSX, after the Notes field and before the `{serverError && ...}` block:

```tsx
{/* Savings Goal (savings transaction types only, create mode only) */}
{!isEdit && isSavingsType && (
  <div className="space-y-1.5">
    <Label>Link to Savings Goal (optional)</Label>
    <Controller
      control={form.control}
      name="savingsGoalId"
      render={({ field }) => (
        <Select
          value={field.value ?? ''}
          onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
          disabled={savingsGoalsQuery.isLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                savingsGoalsQuery.isLoading ? 'Loading…' : 'None'
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {activeSavingsGoals.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  </div>
)}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors. Note: `createMutation.mutate`'s `onSuccess` receives the result from `transactionsApi.create()` which returns a `string` (the new transaction ID).

- [ ] **Step 3: Open browser and verify the integration**

Navigate to Transactions page, click "Add Transaction":
- Select type "Savings Deposit" — verify the "Link to Savings Goal" dropdown appears
- Select type "Expense" — verify the dropdown disappears
- Create a savings deposit linked to a goal — verify the contribution appears on the goal's detail page
- Create a savings deposit without linking — verify it works normally

- [ ] **Step 4: Commit**

```bash
git add src/features/transactions/components/TransactionFormDialog.tsx
git commit -m "feat: add savings goal linking to TransactionFormDialog"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 2: Full browser walkthrough**

Test the complete flow:
1. Navigate to `/savings` — verify empty state with CTA
2. Click "New Goal" — create a goal with name, amount, target date, description
3. Verify the goal card appears in the grid with progress bar at 0%
4. Click the goal card — verify detail page loads with all sections
5. Click "Add Contribution" — add a contribution with amount and date
6. Verify progress bar updates, contribution appears in list
7. Delete the contribution — verify it disappears
8. Click "Pause" — verify status changes to Paused, button becomes "Resume"
9. Click "Resume" — verify status returns to Active
10. Click "Edit" — modify the goal name, verify it updates
11. Navigate to `/transactions` — create a SavingsDeposit transaction linked to the goal
12. Navigate back to the goal detail — verify the contribution from the transaction appears
13. Test the status filter on the list page
14. Test the delete goal flow
15. Check the dashboard savings panel still works correctly

- [ ] **Step 3: Commit all remaining changes (if any)**

```bash
git add -A
git commit -m "feat: implement Savings Goals feature"
```
