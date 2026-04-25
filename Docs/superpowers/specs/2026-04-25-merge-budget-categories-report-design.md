# Merge Budget Categories and Category Report — Design

**Date:** 2026-04-25
**Branch:** `feat/merge-budget-categories-report`
**Scope:** Frontend only. No API changes.

## Problem

On the budget detail page, two cards render the same set of budget categories with overlapping information:

- **Categories** — manages category rows (type badge, name, notes, planned amount, edit/delete actions, total planned).
- **Category Report** — shows variance analytics for the same rows (planned, actual, variance, plus a net total).

Showing the same rows twice is redundant and forces the user to scan back and forth between the two cards to correlate "what I planned" with "how I'm tracking." Merging them into a single, P&L-style breakdown is clearer and recovers vertical space.

## Goals

- Replace `BudgetCategoriesSection` and `BudgetReportTable` with a single component that combines management actions and variance data per row.
- Preserve all current CRUD behavior (add, edit, delete with inline confirm).
- Group rows by category type with type-level subtotals.
- Keep notes accessible without inflating row height.

## Non-goals

- No backend or DTO changes.
- No new query hooks; reuse `useBudgetDetail` and `useBudgetReport`.
- No changes to the form sheet, mutations, or `BudgetHealthSection`.
- No reordering of rows within a type group (preserve API order).

## Component shape

A new component `BudgetCategoryBreakdown` lives at:
`src/features/budgets/components/BudgetCategoryBreakdown.tsx`

```ts
interface BudgetCategoryBreakdownProps {
  budgetId: string;
  categories: BudgetCategoryDto[];             // from useBudgetDetail
  report: BudgetSummaryReportDto | undefined;  // from useBudgetReport
  isLoading: boolean;                          // true if EITHER query is loading
  isError: boolean;                            // true if EITHER query errored
  refetch: () => void;                         // refetches both queries
}
```

The component owns the same local state and mutation hooks that `BudgetCategoriesSection` owns today: sheet open/close, edit target, inline-delete target, server-error strings, and the three category mutations (`useAddBudgetCategory`, `useUpdateBudgetCategory`, `useDeleteBudgetCategory`).

### Data join

Inside the component, build a lookup from the report:

```ts
const actualsById = new Map(
  report?.categoryBreakdown.map(c => [c.budgetCategoryId, c]) ?? [],
);
```

For each `BudgetCategoryDto`, merge with its `CategoryActualDto` to produce a row containing `id`, `categoryId`, `categoryName`, `categoryType`, `notes`, `plannedAmount`, `actualAmount`, `variance`. Because rendering is gated on both queries having loaded (see *Loading*), every row is guaranteed to have a matching actuals entry.

### Subtotal computation

Compute subtotals client-side by grouping merged rows by `categoryType` and summing `plannedAmount`, `actualAmount`, and `variance`. The backend's `totalIncomePlanned`/`totalExpensesPlanned`/`totalSavingsPlanned` fields are not used — computing locally keeps the displayed total in sync with the rows we render and avoids reconciling two sources for the same number.

## Page wiring (`BudgetDetailPage.tsx`)

Replace the current `[Health | Report]` grid + full-width `Categories` layout with a stacked, full-width layout:

```
[Back link]
[Header: title, badges, actions]
[BudgetHealthSection]            ← full-width
[BudgetCategoryBreakdown]        ← full-width
```

The `lg:grid-cols-2` wrapper around Health + Report is removed. Both cards are now siblings in the outer `flex flex-col gap-6` container.

`BudgetDetailPage` continues to call `useBudgetDetail`, `useBudgetHealth`, and `useBudgetReport`. It passes the combined loading and error to the new component:

```ts
<BudgetCategoryBreakdown
  budgetId={id!}
  categories={budget.categories}
  report={reportQuery.data}
  isLoading={detailQuery.isLoading || reportQuery.isLoading}
  isError={detailQuery.isError || reportQuery.isError}
  refetch={() => { detailQuery.refetch(); reportQuery.refetch(); }}
/>
```

The page-level loading skeleton is updated: today it shows two side-by-side cards plus one full-width card. Now it shows one full-width card plus one full-width card.

## Visual layout

A single card titled **Categories** with the `+ Add Category` button in the header.

The body renders three groups in fixed order — `Income`, `Expenses`, `Savings` — and a group is rendered only if it contains at least one row.

```
┌─ Categories ───────────────────────── [+ Add Category] ┐
│                                                         │
│ Category               Planned     Actual    Variance   │   ← single header row, top of card
│                                                         │
│ INCOME                                                  │   ← group label (small, uppercase, muted)
│   Salary               $28,000.00  $0.00   +$28,000.00 ✏ 🗑│
│   ─────────────────────────────────────────────────    │
│   Subtotal             $28,000.00  $0.00   +$28,000.00  │
│                                                         │
│ EXPENSES                                                │
│   Utilities            $800.00     $0.00   +$800.00  ✏ 🗑│
│   Cleaning ⓘ           $2,000.00   $0.00   +$2,000.00 ✏ 🗑│
│   …                                                     │
│   Subtotal             $8,500.00   $0.00   +$8,500.00   │
│                                                         │
│ SAVINGS  (renders only if any savings categories exist) │
└─────────────────────────────────────────────────────────┘
```

### Row structure

- Grid: `grid-cols-[1fr_auto_auto_auto_auto]` — name (with optional notes icon), planned, actual, variance, actions.
- Right-aligned: planned, actual, variance.
- Variance color: emerald-600 if `>= 0`, rose-600 if `< 0`. Uses `formatVariance` from `@/lib/formatters`.
- Currency: `formatCurrency` from `@/lib/formatters`.
- Type badge from the old Categories section is **dropped** — type is conveyed by the group heading.

### Notes

- If `cat.notes` is non-empty, render a small lucide `Info` icon (size-3.5, muted) next to the category name.
- Wrap the icon in a `Tooltip` (`@/components/ui/tooltip`) whose content is the note text.
- If `cat.notes` is empty/null, render no icon (and no extra spacing).

### Group label

Small uppercase muted label above each group's rows: `text-xs font-medium uppercase tracking-wide text-muted-foreground`. Sits at the start of the group block with a small bottom margin.

### Subtotal row

Last row inside each group, separated by `border-t pt-2`. Same grid columns as a normal row but:
- Label: `Subtotal` (bold).
- Numbers: bold, same right-alignment.
- Variance: colored emerald/rose like a normal row.
- No actions cell content (empty).

### Column header row

Rendered **once** at the top of the card, above the first group, not repeated per group. Uses the **same 5-column grid template** as data rows (`grid-cols-[1fr_auto_auto_auto_auto]`) so column edges line up with row values; the actions column slot is left empty. Styling: `text-xs font-medium text-muted-foreground`, same as today's report header.

## Interactions

### Add Category
- `+ Add Category` button in the card header opens `BudgetCategoryFormSheet` with `editTarget = undefined`. Same handler logic as today's `BudgetCategoriesSection.openAdd`.

### Edit Category
- Per-row `Pencil` icon button opens the same sheet with `editTarget = cat`. Identical to today.

### Delete Category
- Per-row `Trash2` icon sets `confirmingDeleteId = cat.id`.
- Inline confirmation panel (the same destructive panel currently in `BudgetCategoriesSection`) renders **between the row and the next row in the same group** — i.e. inserted into the group's row stream, not at the bottom of the card.
- Confirm calls `deleteMutation.mutate(catId)`. Cancel clears `confirmingDeleteId`.

### Empty state
- When `categories.length === 0`: render the same centered message used today: `No categories added yet. Add one →`, where `Add one →` is a button that opens the add sheet. No groups, no header row.

### Loading
- When `isLoading === true`: render a single skeleton block (e.g. `h-64 animate-pulse rounded-lg bg-muted`) inside the card body. No groups, no header.

### Error
- When `isError === true`: render the same error block used today (`AlertCircle` + "Could not load categories." + `Retry` button). The retry button calls the prop `refetch` which refetches both queries.

## Files

### Created
- `src/features/budgets/components/BudgetCategoryBreakdown.tsx`

### Modified
- `src/features/budgets/BudgetDetailPage.tsx` — swap component imports, drop `lg:grid-cols-2` wrapper, pass merged props to new component, update loading skeleton.

### Deleted
- `src/features/budgets/components/BudgetCategoriesSection.tsx`
- `src/features/budgets/components/BudgetReportTable.tsx`

### Unchanged
- `BudgetCategoryFormSheet.tsx`, `BudgetCategoryRow.tsx`, `BudgetCategoryBuilder.tsx`
- All hooks under `src/features/budgets/hooks/`
- `src/types/api.ts`, all API services

## Testing

No test framework is configured in the repo. Manual verification only, via `npm run dev`:

1. Open a budget detail page with at least one category in each of Income, Expenses, Savings.
2. Verify groups render in order Income → Expenses → Savings, with a subtotal row inside each.
3. Verify the column header appears once at the top.
4. Verify rows with `notes` show an `Info` icon and that hovering reveals the note. Rows without notes have no icon.
5. Variance coloring: positive emerald, negative rose, in both row and subtotal levels.
6. Add a category → sheet opens → submit → new row appears in the correct group with subtotal updated.
7. Edit a category's planned amount → row updates → group subtotal updates.
8. Delete a category → inline confirm appears between the row and the next row in the group → confirm → row removed → subtotal updated.
9. Empty state: open or create a budget with zero categories. Verify the empty CTA appears and `Add one →` opens the sheet.
10. Loading: throttle network, navigate to detail page. Verify a single skeleton appears in the card body until both queries resolve.
11. Error: simulate failure (e.g. block one of the endpoints in DevTools). Verify the error block appears with a working retry.
12. Verify Health card now spans full width and the page no longer has a side-by-side row.

## Out of scope / future work

- Per-group "Add Category" buttons (today there is one global add).
- Inline editing of planned amount directly in the row.
- Sorting / collapsing groups.
- Showing per-group subtotals in `BudgetHealthSection` (the data is already there but the card is left as-is).
