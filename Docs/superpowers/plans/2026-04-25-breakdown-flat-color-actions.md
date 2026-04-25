# Breakdown Flat List, Color-Coded, Dropdown Actions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten `BudgetCategoryBreakdown` by dropping the per-type group headings + subtotals, applying a colored left-border accent to each row, and replacing the per-row edit/delete icons with a single `MoreHorizontal` dropdown menu.

**Architecture:** Two sequential tasks on the same file. Task 1 restructures the render (groups → flat sorted list + colored borders) and removes unused helpers. Task 2 replaces the per-row action buttons with a shadcn `DropdownMenu` mirroring the pattern from `BudgetCard.tsx`.

**Tech Stack:** React + TypeScript, Tailwind v4, shadcn/ui (`DropdownMenu`, `Button`), lucide-react. No test framework — verification via `npm run build` + `npm run lint`.

**Spec:** `Docs/superpowers/specs/2026-04-25-breakdown-flat-color-actions-design.md`

**Branch:** `feat/merge-budget-categories-report` (continues from prior work; design + implementation already committed up to `90c4534`).

---

## File structure

**Modify only:**
- `src/features/budgets/components/BudgetCategoryBreakdown.tsx`

No new files. No deletions.

---

## Task 1: Flat sorted list with colored left-border accents

**Files:**
- Modify: `src/features/budgets/components/BudgetCategoryBreakdown.tsx`

This task removes the group headings + subtotal rows, sorts rows by type into a flat list, and applies a colored left-border accent per row. The per-row `Pencil` + `Trash2` buttons stay for now — Task 2 replaces them.

- [ ] **Step 1: Remove unused helpers and add the new sort helper + border map**

Locate the existing helper block (between the imports and the `interface BudgetCategoryBreakdownProps` block). Remove:
- `interface GroupTotals { ... }`
- `const GROUP_ORDER = [...] as const;`
- `const GROUP_LABEL: Record<string, string> = { ... };`
- `function groupRows(...) { ... }`
- `function sumGroup(...) { ... }`

Keep `interface MergedRow`, `function mergeRows`.

Add these in their place (after `mergeRows`, before the component):

```ts
const TYPE_BORDER_CLASS: Record<CategoryType, string> = {
  [CategoryType.Income]: 'border-l-emerald-500',
  [CategoryType.Expense]: 'border-l-rose-500',
  [CategoryType.Savings]: 'border-l-sky-500',
};

function sortByType(rows: MergedRow[]): MergedRow[] {
  const order: Record<CategoryType, number> = {
    [CategoryType.Income]: 0,
    [CategoryType.Expense]: 1,
    [CategoryType.Savings]: 2,
  };
  return [...rows].sort((a, b) => order[a.categoryType] - order[b.categoryType]);
}
```

> **Note on typing:** `Record<CategoryType, string>` is tighter than the previous `Record<string, string>` and gives compile-time exhaustiveness — if a new category type is ever added, TypeScript will flag the missing entry.

- [ ] **Step 2: Replace the IIFE render block with a flat sorted list**

Locate the current render block in the JSX (the `(() => { ... })()` IIFE inside `<CardContent>` that runs when `!isLoading && !isError && categories.length > 0 && report`). Replace the **entire IIFE** — including its outer parens — with:

```tsx
          {!isLoading && !isError && categories.length > 0 && report && (() => {
            const rows = sortByType(mergeRows(categories, report));
            return (
              <div className="space-y-1">
                {/* Column header — transparent left border keeps x-alignment with data rows */}
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 border-l-4 border-transparent pb-1 pl-3 pr-1 text-xs font-medium text-muted-foreground">
                  <span>Category</span>
                  <span className="w-24 text-right">Planned</span>
                  <span className="w-24 text-right">Actual</span>
                  <span className="w-28 text-right">Variance</span>
                  <span className="w-8" />
                </div>

                {rows.map((row) => {
                  const dto = categories.find((c) => c.id === row.id);
                  return (
                    <div key={row.id}>
                      <div
                        className={cn(
                          'grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 rounded-md border-l-4 py-2 pl-3 pr-1 text-sm hover:bg-muted/50',
                          TYPE_BORDER_CLASS[row.categoryType],
                        )}
                      >
                        <span className="flex items-center gap-1.5 font-medium">
                          {row.categoryName}
                          {row.notes && (
                            <Tooltip>
                              <TooltipTrigger render={<span />}>
                                <Info className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                              </TooltipTrigger>
                              <TooltipContent>{row.notes}</TooltipContent>
                            </Tooltip>
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
                        <span className="flex w-8 items-center justify-end">
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
              </div>
            );
          })()}
```

> **Important:** This step is intentionally still rendering both `Pencil` and `Trash2` icon buttons inside `<span className="flex w-8 ...">`. The slot has been narrowed from `w-16` to `w-8`, which means the two buttons will visibly overflow or wrap. **This is a transient state.** Task 2 replaces the two buttons with a single `MoreHorizontal` button that fits inside `w-8`. The intermediate visual is ugly on purpose — to keep the diff focused.
>
> If you find the visual overflow distracting during local verification, you can temporarily widen `w-8` back to `w-16` in this task, BUT you MUST re-narrow it to `w-8` in Task 2. The plan's intent is for `w-8` to be the final state.

- [ ] **Step 3: Verify build + lint**

Run:
```
npm run build
```
Expected: success.

Run:
```
npm run lint
```
Expected: 8 pre-existing errors in unrelated files (`router.tsx`, `badge.tsx`, `button.tsx`, `BudgetCategoryFormSheet.tsx`, `BudgetFormSheet.tsx`, `IconPicker.tsx`, `useTransactionMutations.ts`). No new errors.

- [ ] **Step 4: Commit**

```
git add src/features/budgets/components/BudgetCategoryBreakdown.tsx
git commit -m "refactor(budgets): flatten breakdown rows with colored type borders"
```

---

## Task 2: Replace per-row buttons with `MoreHorizontal` dropdown menu

**Files:**
- Modify: `src/features/budgets/components/BudgetCategoryBreakdown.tsx`

This task replaces the two-icon action slot with a single `⋯` button that opens a dropdown menu containing `Edit` and `Delete` items. Pattern mirrors `BudgetCard.tsx`.

- [ ] **Step 1: Update imports**

Find:
```tsx
import { Plus, AlertCircle, RefreshCw, Info, Pencil, Trash2 } from 'lucide-react';
```
Replace with:
```tsx
import { Plus, AlertCircle, RefreshCw, Info, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
```

Add this import alongside the other shadcn imports (e.g. just below the `Tooltip` import):
```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
```

- [ ] **Step 2: Replace the row's action slot**

Locate the current action slot inside the row's grid (the `<span className="flex w-8 items-center justify-end">` block from Task 1, containing the two `<Button>` icons). Replace the entire `<span>...</span>` block with:

```tsx
                        <span className="flex w-8 items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Category actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {dto && (
                                <DropdownMenuItem onClick={() => openEdit(dto)}>
                                  <Pencil className="mr-2 h-3.5 w-3.5" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setConfirmingDeleteId(row.id);
                                  setDeleteError(null);
                                }}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </span>
```

The `dto && (...)` guard is preserved on the `Edit` item only — `Delete` does not need it because it operates on `row.id` directly.

- [ ] **Step 3: Verify build + lint**

Run:
```
npm run build && npm run lint
```
Expected: build succeeds; lint shows the same 8 pre-existing errors. No new errors.

Also confirm: `Pencil` and `Trash2` are still imported (they're used as glyphs inside the dropdown items). `MoreHorizontal` is now imported.

- [ ] **Step 4: Commit**

```
git add src/features/budgets/components/BudgetCategoryBreakdown.tsx
git commit -m "feat(budgets): replace per-row action icons with MoreHorizontal dropdown menu"
```

---

## Task 3: Manual smoke test

**Files:** none. Verification only — no commit.

The repo has no automated test framework. Run `npm run dev` and verify:

- [ ] **Step 1: Layout**
  - Card body shows a single flat list of rows. No `INCOME` / `EXPENSES` / `SAVINGS` headings. No subtotal rows.
  - Rows ordered Income → Expenses → Savings; within each type, the order matches the API.

- [ ] **Step 2: Color borders**
  - Income rows have a 4px emerald left border.
  - Expense rows have a 4px rose left border.
  - Savings rows have a 4px sky left border.
  - Column header has no visible left border but its text aligns vertically with row text (no horizontal drift).

- [ ] **Step 3: Action menu**
  - Each row has a single `⋯` icon on the right.
  - Clicking it opens a dropdown with `Edit` and `Delete`.
  - `Edit` opens the form sheet pre-filled with that row's data.
  - `Delete` triggers the existing inline destructive confirm panel directly under the row (no behavior change from before).
  - `Cancel` collapses the panel; `Remove` deletes the row.

- [ ] **Step 4: Notes tooltip**
  - Rows with `notes` show the `Info` icon next to the name; hover reveals the note.
  - Rows without notes show no icon and no extra spacing.

- [ ] **Step 5: Empty / loading / error states**
  - Empty state, loading skeleton, and error block render correctly (unchanged from prior work).

- [ ] **Step 6: Final lint and build**

Run:
```
npm run lint && npm run build
```
Expected: both succeed (or lint shows only the 8 pre-existing errors).

If anything in steps 1–5 fails, stop and fix the underlying issue.

---

## Self-review checklist (for plan author)

- [x] Spec coverage:
  - Helpers removed (`GROUP_ORDER`, `GROUP_LABEL`, `groupRows`, `sumGroup`, `GroupTotals`) — Task 1 Step 1.
  - `sortByType` + `TYPE_BORDER_CLASS` added — Task 1 Step 1.
  - Header alignment with transparent left border — Task 1 Step 2.
  - Action slot narrowed to `w-8` — Task 1 Step 2 + Task 2 Step 2.
  - Row order Income → Expense → Savings via stable sort — Task 1 Step 1.
  - DropdownMenu replacing per-row buttons — Task 2 Step 2.
  - Notes tooltip preserved — Task 1 Step 2.
  - Inline delete confirm preserved — Task 1 Step 2.
- [x] No placeholders.
- [x] Type consistency: `MergedRow`, `sortByType`, `TYPE_BORDER_CLASS`, `dto`, handler names all match across tasks.
- [x] Each task ends in a single commit.
- [x] The intermediate state (Task 1 commit with `w-8` slot but two buttons inside) is documented as transient.
