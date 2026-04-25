# Merge Budget Categories and Category Report — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `BudgetCategoriesSection` and `BudgetReportTable` with a single `BudgetCategoryBreakdown` card that groups rows by category type with per-group subtotals, planned/actual/variance per row, edit/delete actions, and notes surfaced via tooltip.

**Architecture:** New component owns local state + mutations (moved from `BudgetCategoriesSection`). It joins `useBudgetDetail`'s categories with `useBudgetReport`'s actuals/variance by `budgetCategoryId`. Renders three groups in fixed order (`Income`, `Expenses`, `Savings`); each group renders only if it has rows, with a per-group subtotal row computed client-side. Page is restructured from `[Health | Report]` side-by-side + `[Categories]` to two stacked full-width cards: `[Health]` and `[Breakdown]`.

**Tech Stack:** React + TypeScript, TanStack Query, Tailwind v4, shadcn/ui (`Card`, `Button`, `Tooltip`), lucide-react icons. No test framework — verification via `npm run lint`, `npm run build`, and manual smoke.

**Spec:** `Docs/superpowers/specs/2026-04-25-merge-budget-categories-report-design.md`

**Branch:** `feat/merge-budget-categories-report` (already created and active)

---

## File structure

**Create:**
- `src/features/budgets/components/BudgetCategoryBreakdown.tsx` — the new merged component (≈250 lines).

**Modify:**
- `src/features/budgets/BudgetDetailPage.tsx` — swap component imports; remove the `lg:grid-cols-2` grid; pass merged props (categories + report + combined loading/error/refetch); update the loading-state placeholder skeleton.

**Delete:**
- `src/features/budgets/components/BudgetCategoriesSection.tsx`
- `src/features/budgets/components/BudgetReportTable.tsx`

**Unchanged (referenced):**
- `src/features/budgets/components/BudgetCategoryFormSheet.tsx`
- `src/features/budgets/hooks/useBudgetCategoryMutations.ts`
- `src/features/budgets/hooks/useBudgetDetail.ts`, `useBudgetReport.ts`
- `src/types/api.ts`, all API services
- `src/components/ui/tooltip.tsx`

---

## Task 1: Scaffold `BudgetCategoryBreakdown` with empty / loading / error states

**Files:**
- Create: `src/features/budgets/components/BudgetCategoryBreakdown.tsx`

This task introduces the component skeleton with three render branches (loading, error, empty) and the `+ Add Category` header button (wired to a `useState` open flag and the existing `BudgetCategoryFormSheet`). No grouped rows yet — those come in Task 2.

- [ ] **Step 1: Create the file with full skeleton**

```tsx
// src/features/budgets/components/BudgetCategoryBreakdown.tsx
import { useState } from 'react';
import { Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { BudgetCategoryDto, BudgetSummaryReportDto } from '@/types/api';
import {
  useAddBudgetCategory,
  useUpdateBudgetCategory,
  useDeleteBudgetCategory,
} from '../hooks/useBudgetCategoryMutations';
import { BudgetCategoryFormSheet } from './BudgetCategoryFormSheet';

interface BudgetCategoryBreakdownProps {
  budgetId: string;
  categories: BudgetCategoryDto[];
  report: BudgetSummaryReportDto | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function BudgetCategoryBreakdown({
  budgetId,
  categories,
  report,
  isLoading,
  isError,
  refetch,
}: BudgetCategoryBreakdownProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetCategoryDto | undefined>();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [catError, setCatError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const addMutation = useAddBudgetCategory(budgetId);
  const updateMutation = useUpdateBudgetCategory(budgetId);
  const deleteMutation = useDeleteBudgetCategory(budgetId);

  function openAdd() {
    setEditTarget(undefined);
    setCatError(null);
    setSheetOpen(true);
  }

  const existingCategoryIds = categories.map((c) => c.categoryId);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Categories</CardTitle>
            <Button size="sm" variant="outline" onClick={openAdd}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="h-64 animate-pulse rounded-lg bg-muted" />}

          {isError && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Could not load categories.
              </div>
              <Button variant="ghost" size="sm" onClick={refetch}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !isError && categories.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No categories added yet.{' '}
              <button
                className="font-medium text-primary hover:underline"
                onClick={openAdd}
              >
                Add one →
              </button>
            </div>
          )}

          {/* Grouped rows go here in Task 2 */}
          {!isLoading && !isError && categories.length > 0 && report && (
            <div className="space-y-4">
              {/* placeholder until Task 2 */}
            </div>
          )}
        </CardContent>
      </Card>

      <BudgetCategoryFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editTarget={editTarget}
        existingCategoryIds={existingCategoryIds}
        onAdd={() => {
          // wired in Task 4
        }}
        onEdit={() => {
          // wired in Task 4
        }}
        isSubmitting={addMutation.isPending || updateMutation.isPending}
        serverError={catError}
      />
    </>
  );
}
```

> **Note:** The `onAdd` / `onEdit` props are stubbed in this task to keep TypeScript satisfied. They are wired to the real handlers in Task 4. The `confirmingDeleteId`, `deleteError`, `deleteMutation` are declared now even though they are only consumed in Task 4 — declaring them up-front avoids unused-import churn between tasks.

- [ ] **Step 2: Verify it builds and lints**

Run:
```bash
npm run build
```
Expected: build succeeds. The component is not yet imported anywhere, but `tsc -b` will type-check it as part of the project.

Run:
```bash
npm run lint
```
Expected: no errors. If lint complains about unused `confirmingDeleteId`, `deleteError`, `deleteMutation`, `editTarget`, prefix consumed-later vars with `void` calls or just continue — they will be used in Task 4 within the same PR. If lint fails strictly on unused vars, temporarily silence with `// eslint-disable-next-line` on those declarations and remove the comment in Task 4.

- [ ] **Step 3: Commit**

```bash
git add src/features/budgets/components/BudgetCategoryBreakdown.tsx
git commit -m "feat(budgets): scaffold BudgetCategoryBreakdown with empty/loading/error states"
```

---

## Task 2: Render grouped rows with subtotals (read-only)

**Files:**
- Modify: `src/features/budgets/components/BudgetCategoryBreakdown.tsx`

This task implements the data join, grouping, and subtotal computation, and renders all rows + the column header. No interactions yet (edit/delete buttons render as inert icons; add stays wired to the existing stub).

- [ ] **Step 1: Add the data-join helper above the component**

Insert these declarations between the imports and the `interface BudgetCategoryBreakdownProps` block:

```tsx
import { CategoryType } from '@/types/api';
import { cn } from '@/lib/utils';
import { formatCurrency, formatVariance } from '@/lib/formatters';
import type { CategoryActualDto } from '@/types/api';

interface MergedRow {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryType: BudgetCategoryDto['categoryType'];
  notes: string | null | undefined;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
}

interface GroupTotals {
  plannedAmount: number;
  actualAmount: number;
  variance: number;
}

const GROUP_ORDER = [
  CategoryType.Income,
  CategoryType.Expense,
  CategoryType.Savings,
] as const;

const GROUP_LABEL: Record<string, string> = {
  [CategoryType.Income]: 'Income',
  [CategoryType.Expense]: 'Expenses',
  [CategoryType.Savings]: 'Savings',
};

function mergeRows(
  categories: BudgetCategoryDto[],
  report: BudgetSummaryReportDto,
): MergedRow[] {
  const actualsById = new Map<string, CategoryActualDto>(
    report.categoryBreakdown.map((c) => [c.budgetCategoryId, c]),
  );
  return categories.map((c) => {
    const actuals = actualsById.get(c.id);
    return {
      id: c.id,
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      categoryType: c.categoryType,
      notes: c.notes,
      plannedAmount: c.plannedAmount,
      actualAmount: actuals?.actualAmount ?? 0,
      variance: actuals?.variance ?? 0,
    };
  });
}

function groupRows(rows: MergedRow[]): Map<string, MergedRow[]> {
  const groups = new Map<string, MergedRow[]>();
  for (const row of rows) {
    const list = groups.get(row.categoryType) ?? [];
    list.push(row);
    groups.set(row.categoryType, list);
  }
  return groups;
}

function sumGroup(rows: MergedRow[]): GroupTotals {
  return rows.reduce<GroupTotals>(
    (acc, r) => ({
      plannedAmount: acc.plannedAmount + r.plannedAmount,
      actualAmount: acc.actualAmount + r.actualAmount,
      variance: acc.variance + r.variance,
    }),
    { plannedAmount: 0, actualAmount: 0, variance: 0 },
  );
}
```

- [ ] **Step 2: Replace the placeholder render block with grouped rows**

Find this block in the component:

```tsx
          {/* Grouped rows go here in Task 2 */}
          {!isLoading && !isError && categories.length > 0 && report && (
            <div className="space-y-4">
              {/* placeholder until Task 2 */}
            </div>
          )}
```

Replace it with:

```tsx
          {!isLoading && !isError && categories.length > 0 && report && (() => {
            const rows = mergeRows(categories, report);
            const grouped = groupRows(rows);
            return (
              <div className="space-y-4">
                {/* Column header — shared 5-col grid with data rows */}
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 px-1 pb-1 text-xs font-medium text-muted-foreground">
                  <span>Category</span>
                  <span className="w-24 text-right">Planned</span>
                  <span className="w-24 text-right">Actual</span>
                  <span className="w-28 text-right">Variance</span>
                  <span className="w-16" />
                </div>

                {GROUP_ORDER.map((type) => {
                  const groupRowsForType = grouped.get(type);
                  if (!groupRowsForType || groupRowsForType.length === 0) return null;
                  const totals = sumGroup(groupRowsForType);
                  return (
                    <div key={type} className="space-y-1">
                      <div className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {GROUP_LABEL[type]}
                      </div>

                      {groupRowsForType.map((row) => (
                        <div
                          key={row.id}
                          className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 rounded-md px-1 py-2 text-sm hover:bg-muted/50"
                        >
                          <span className="font-medium">{row.categoryName}</span>
                          <span className="w-24 text-right text-muted-foreground">
                            {formatCurrency(row.plannedAmount)}
                          </span>
                          <span className="w-24 text-right">
                            {formatCurrency(row.actualAmount)}
                          </span>
                          <span
                            className={cn(
                              'w-28 text-right font-medium',
                              row.variance >= 0 ? 'text-emerald-600' : 'text-rose-600',
                            )}
                          >
                            {formatVariance(row.variance)}
                          </span>
                          <span className="w-16" />
                        </div>
                      ))}

                      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 border-t px-1 pt-2 text-sm font-semibold">
                        <span>Subtotal</span>
                        <span className="w-24 text-right">
                          {formatCurrency(totals.plannedAmount)}
                        </span>
                        <span className="w-24 text-right">
                          {formatCurrency(totals.actualAmount)}
                        </span>
                        <span
                          className={cn(
                            'w-28 text-right',
                            totals.variance >= 0 ? 'text-emerald-600' : 'text-rose-600',
                          )}
                        >
                          {formatVariance(totals.variance)}
                        </span>
                        <span className="w-16" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
```

- [ ] **Step 3: Verify type-check + lint**

Run:
```bash
npm run build
```
Expected: build succeeds.

Run:
```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/budgets/components/BudgetCategoryBreakdown.tsx
git commit -m "feat(budgets): render grouped rows with per-type subtotals in BudgetCategoryBreakdown"
```

---

## Task 3: Add notes tooltip per row

**Files:**
- Modify: `src/features/budgets/components/BudgetCategoryBreakdown.tsx`

This task adds a small `Info` icon next to the category name when `row.notes` is non-empty, with a `Tooltip` showing the note text.

- [ ] **Step 1: Update imports**

Find:
```tsx
import { Plus, AlertCircle, RefreshCw } from 'lucide-react';
```
Replace with:
```tsx
import { Plus, AlertCircle, RefreshCw, Info } from 'lucide-react';
```

Add alongside the other shadcn imports:
```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
```

- [ ] **Step 2: Replace the row's name cell with a name + optional tooltip cell**

Find the row's name span:
```tsx
                          <span className="font-medium">{row.categoryName}</span>
```

Replace with:
```tsx
                          <span className="flex items-center gap-1.5 font-medium">
                            {row.categoryName}
                            {row.notes && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger render={<span />}>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>{row.notes}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </span>
```

- [ ] **Step 3: Verify type-check + lint**

Run:
```bash
npm run build && npm run lint
```
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/features/budgets/components/BudgetCategoryBreakdown.tsx
git commit -m "feat(budgets): show notes tooltip on category rows in BudgetCategoryBreakdown"
```

---

## Task 4: Wire add / edit / delete interactions

**Files:**
- Modify: `src/features/budgets/components/BudgetCategoryBreakdown.tsx`

This task replaces the stubbed `onAdd` / `onEdit` callbacks with real handlers, adds the per-row `Edit` and `Delete` buttons, and renders the inline delete confirmation panel between the row and the next row in the same group.

- [ ] **Step 1: Update imports**

Find:
```tsx
import { Plus, AlertCircle, RefreshCw, Info } from 'lucide-react';
```
Replace with:
```tsx
import { Plus, AlertCircle, RefreshCw, Info, Pencil, Trash2 } from 'lucide-react';
```

- [ ] **Step 2: Add handler functions above `existingCategoryIds`**

Inside the component, after the `openAdd` function and before `const existingCategoryIds`:

```tsx
  function openEdit(cat: BudgetCategoryDto) {
    setEditTarget(cat);
    setCatError(null);
    setSheetOpen(true);
  }

  function handleAdd(data: { categoryId: string; plannedAmount: number; notes?: string }) {
    addMutation.mutate(
      { categoryId: data.categoryId, plannedAmount: data.plannedAmount, notes: data.notes },
      {
        onSuccess: () => setSheetOpen(false),
        onError: (err) => {
          import('axios').then(({ default: axios }) => {
            if (axios.isAxiosError(err)) {
              setCatError(err.response?.data?.detail || err.response?.data?.title || err.message);
            } else {
              setCatError('Failed to add category.');
            }
          });
        },
      },
    );
  }

  function handleEdit(catId: string, data: { plannedAmount: number; notes?: string }) {
    updateMutation.mutate(
      { catId, data: { plannedAmount: data.plannedAmount, notes: data.notes } },
      {
        onSuccess: () => setSheetOpen(false),
        onError: (err) => {
          import('axios').then(({ default: axios }) => {
            if (axios.isAxiosError(err)) {
              setCatError(err.response?.data?.detail || err.response?.data?.title || err.message);
            } else {
              setCatError('Failed to update category.');
            }
          });
        },
      },
    );
  }

  function handleDelete(catId: string) {
    setDeleteError(null);
    deleteMutation.mutate(catId, {
      onSuccess: () => setConfirmingDeleteId(null),
      onError: (err) => {
        import('axios').then(({ default: axios }) => {
          if (axios.isAxiosError(err)) {
            setDeleteError(err.response?.data?.detail || err.response?.data?.title || err.message);
          } else {
            setDeleteError('Failed to delete category.');
          }
        });
      },
    });
  }
```

> These are ported verbatim from the deleted `BudgetCategoriesSection.tsx` to preserve identical behavior.

- [ ] **Step 3: Wire `BudgetCategoryFormSheet` props**

Find:
```tsx
        onAdd={() => {
          // wired in Task 4
        }}
        onEdit={() => {
          // wired in Task 4
        }}
```
Replace with:
```tsx
        onAdd={handleAdd}
        onEdit={handleEdit}
```

- [ ] **Step 4: Replace the row render with row + actions + inline-confirm sibling**

Locate the existing `groupRowsForType.map((row) => ...)` block (it currently produces a single grid row per category, with the notes tooltip span added in Task 3 inside the name cell). Replace the entire `groupRowsForType.map(...)` call — including its fragment / wrapping element — with the following:

```tsx
                      {groupRowsForType.map((row) => {
                        // Re-find the source DTO for the edit sheet (mergeRows drops some fields).
                        const dto = categories.find((c) => c.id === row.id);
                        return (
                          <div key={row.id}>
                            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 rounded-md px-1 py-2 text-sm hover:bg-muted/50">
                              <span className="flex items-center gap-1.5 font-medium">
                                {row.categoryName}
                                {row.notes && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger render={<span />}>
                                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>{row.notes}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </span>
                              <span className="w-24 text-right text-muted-foreground">
                                {formatCurrency(row.plannedAmount)}
                              </span>
                              <span className="w-24 text-right">
                                {formatCurrency(row.actualAmount)}
                              </span>
                              <span
                                className={cn(
                                  'w-28 text-right font-medium',
                                  row.variance >= 0 ? 'text-emerald-600' : 'text-rose-600',
                                )}
                              >
                                {formatVariance(row.variance)}
                              </span>
                              <span className="flex w-16 items-center justify-end gap-1">
                                {dto && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => openEdit(dto)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setConfirmingDeleteId(row.id);
                                    setDeleteError(null);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </span>
                            </div>

                            {confirmingDeleteId === row.id && (
                              <div className="mx-1 mb-1 rounded-lg bg-destructive/10 px-3 py-2 text-sm">
                                <p className="font-medium text-destructive">
                                  Remove {row.categoryName} from this budget?
                                </p>
                                {deleteError && (
                                  <p className="mt-1 text-xs text-destructive">{deleteError}</p>
                                )}
                                <div className="mt-2 flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete(row.id)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    {deleteMutation.isPending ? 'Removing…' : 'Remove'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setConfirmingDeleteId(null);
                                      setDeleteError(null);
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
```

> **Note:** The notes-tooltip span from Task 3 is now embedded inline in the new row block; the standalone tooltip pattern from Task 3 is replaced here. If lint/build complains about an unused import after this edit, scan the file — everything imported at the top should still be in use.

- [ ] **Step 5: If you added an eslint-disable comment in Task 1, remove it**

Look at the declarations of `editTarget`, `confirmingDeleteId`, `deleteError`, `deleteMutation`. They are now consumed. Remove any `// eslint-disable-next-line` comments above them.

- [ ] **Step 6: Verify type-check + lint**

Run:
```bash
npm run build && npm run lint
```
Expected: both succeed.

- [ ] **Step 7: Commit**

```bash
git add src/features/budgets/components/BudgetCategoryBreakdown.tsx
git commit -m "feat(budgets): wire add/edit/delete handlers and inline delete confirm in BudgetCategoryBreakdown"
```

---

## Task 5: Integrate into `BudgetDetailPage` and restructure layout

**Files:**
- Modify: `src/features/budgets/BudgetDetailPage.tsx`

This task swaps the two old components for the new one, changes the side-by-side `[Health | Report]` layout to two stacked full-width cards, and updates the page-level loading skeleton.

- [ ] **Step 1: Swap component imports**

Find:
```tsx
import { BudgetReportTable } from './components/BudgetReportTable';
import { BudgetCategoriesSection } from './components/BudgetCategoriesSection';
```
Replace with:
```tsx
import { BudgetCategoryBreakdown } from './components/BudgetCategoryBreakdown';
```

- [ ] **Step 2: Update the page-level loading skeleton**

Find:
```tsx
  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }
```
Replace with:
```tsx
  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }
```

- [ ] **Step 3: Replace the side-by-side block + Categories block with the new layout**

Find:
```tsx
      {/* Health + Report */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BudgetHealthSection
          data={healthQuery.data}
          isLoading={healthQuery.isLoading}
          isError={healthQuery.isError}
          refetch={healthQuery.refetch}
        />
        <BudgetReportTable
          data={reportQuery.data}
          isLoading={reportQuery.isLoading}
          isError={reportQuery.isError}
          refetch={reportQuery.refetch}
        />
      </div>

      {/* Categories */}
      <BudgetCategoriesSection
        budgetId={id!}
        categories={budget.categories}
        isLoading={detailQuery.isLoading}
        isError={detailQuery.isError}
        refetch={detailQuery.refetch}
      />
```

Replace with:
```tsx
      {/* Health */}
      <BudgetHealthSection
        data={healthQuery.data}
        isLoading={healthQuery.isLoading}
        isError={healthQuery.isError}
        refetch={healthQuery.refetch}
      />

      {/* Categories + Report */}
      <BudgetCategoryBreakdown
        budgetId={id!}
        categories={budget.categories}
        report={reportQuery.data}
        isLoading={detailQuery.isLoading || reportQuery.isLoading}
        isError={detailQuery.isError || reportQuery.isError}
        refetch={() => {
          detailQuery.refetch();
          reportQuery.refetch();
        }}
      />
```

- [ ] **Step 4: Verify type-check + lint**

Run:
```bash
npm run build && npm run lint
```
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add src/features/budgets/BudgetDetailPage.tsx
git commit -m "refactor(budgets): use BudgetCategoryBreakdown and stack cards full-width on detail page"
```

---

## Task 6: Delete the obsolete components

**Files:**
- Delete: `src/features/budgets/components/BudgetCategoriesSection.tsx`
- Delete: `src/features/budgets/components/BudgetReportTable.tsx`

- [ ] **Step 1: Verify no remaining references**

Run:
```bash
git grep -n "BudgetCategoriesSection\|BudgetReportTable" -- src
```
Expected: no output (the only references were in `BudgetDetailPage.tsx`, removed in Task 5).

If there are any matches, stop and update those callers before deleting.

- [ ] **Step 2: Delete the files**

```bash
git rm src/features/budgets/components/BudgetCategoriesSection.tsx
git rm src/features/budgets/components/BudgetReportTable.tsx
```

- [ ] **Step 3: Verify type-check + lint**

Run:
```bash
npm run build && npm run lint
```
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(budgets): remove BudgetCategoriesSection and BudgetReportTable (replaced by BudgetCategoryBreakdown)"
```

---

## Task 7: Manual smoke test

**Files:** none — this is a verification-only task. Nothing to commit.

The repo has no automated test framework, so this is the gate before the work is considered complete.

- [ ] **Step 1: Start the dev server**

Run:
```bash
npm run dev
```
Expected: server starts on port 5173 (or as configured). Backend at `VITE_API_URL` must be running.

- [ ] **Step 2: Verify a populated budget detail page**

Open a budget that has at least one Income, one Expense, and one Savings category in the browser at `/budgets/<id>`.

Check:
- The page is two stacked cards: `BudgetHealthSection` on top, `Categories` card below — both full-width.
- The `Categories` card has the `+ Add Category` button in the header.
- The column header `Category | Planned | Actual | Variance` appears once at the top of the card body.
- Three group blocks render in this order: `INCOME`, `EXPENSES`, `SAVINGS`. Each label is small uppercase muted text.
- Each group has its rows below the label, then a `Subtotal` row with a top border.
- Variance values are emerald-colored when `>= 0` and rose when `< 0`, in both rows and subtotals.

- [ ] **Step 3: Verify notes tooltip**

Find a row with a `notes` value (or add one via the edit sheet). Hover the small `Info` icon next to the name. Confirm the tooltip shows the note text. Confirm rows without notes have no icon and no extra spacing.

- [ ] **Step 4: Verify add flow**

Click `+ Add Category`. The form sheet opens with no edit target. Pick a category, enter a planned amount, optionally add notes, submit. Confirm:
- Sheet closes on success.
- New row appears in the correct group (matching its `categoryType`).
- That group's `Subtotal` updates.
- Page-level loading does not skeleton the whole card (mutation invalidation triggers a refetch but the staleTime keeps existing data visible).

- [ ] **Step 5: Verify edit flow**

Click the `Pencil` icon on a row. The form sheet opens in edit mode, name field disabled (per existing sheet behavior), planned and notes pre-filled. Change the planned amount, submit. Confirm:
- Sheet closes on success.
- Row's planned and variance update.
- Group subtotal updates.

- [ ] **Step 6: Verify delete flow**

Click the `Trash2` icon on a row. Confirm:
- An inline destructive panel appears immediately under that row, **inside the same group** (i.e. before the next row of the same type, not at the bottom of the card).
- Clicking `Cancel` collapses the panel.
- Clicking `Remove` deletes the row and updates the subtotal.

- [ ] **Step 7: Verify empty state**

Open or temporarily strip a budget so it has zero categories. Confirm the card body shows the centered `No categories added yet. Add one →` message. Click `Add one →` and confirm the sheet opens.

- [ ] **Step 8: Verify error state**

In DevTools, block the request to `/api/budgets/<id>/report` (or `…/budgets/<id>`). Reload the page. Confirm the card body shows the `AlertCircle` + "Could not load categories." + `Retry` block. Click `Retry`, unblock the request, confirm the card recovers.

- [ ] **Step 9: Verify loading state**

In DevTools throttle network to "Slow 3G" and reload. Confirm a single skeleton block appears in the card body until both `useBudgetDetail` and `useBudgetReport` resolve, then the grouped table renders.

- [ ] **Step 10: Final lint and build**

Run:
```bash
npm run lint && npm run build
```
Expected: both succeed cleanly.

If anything in steps 2–9 fails, stop and fix the issue. Do not consider the work complete until every check above passes.

---

## Self-review checklist (for plan author)

- [x] Spec coverage: every section of the spec maps to a task — component shape (Task 1), data join + grouping (Task 2), notes tooltip (Task 3), interactions (Task 4), page wiring + layout (Task 5), removal of obsolete files (Task 6), manual verification (Task 7).
- [x] No placeholders: every step has either complete code or a concrete command.
- [x] Type consistency: `MergedRow`, `GroupTotals`, `mergeRows`, `groupRows`, `sumGroup`, `GROUP_ORDER`, `GROUP_LABEL`, `BudgetCategoryBreakdownProps`, handler names (`openAdd`, `openEdit`, `handleAdd`, `handleEdit`, `handleDelete`) are used consistently across tasks.
- [x] Files: every file path is exact and absolute within the repo.
- [x] Commits: each task ends with a single focused commit.
