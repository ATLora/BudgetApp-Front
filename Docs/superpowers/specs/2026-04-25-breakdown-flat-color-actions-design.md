# Breakdown Flat List, Color-Coded, Dropdown Actions — Design

**Date:** 2026-04-25
**Branch:** `feat/merge-budget-categories-report` (continues from prior work)
**Scope:** Follow-up tweak to `BudgetCategoryBreakdown` only. No backend, no other components.

## Problem

The just-shipped `BudgetCategoryBreakdown` renders rows in three labelled groups (`INCOME`, `EXPENSES`, `SAVINGS`) with per-group subtotal rows and per-row `Pencil` + `Trash2` icon buttons. Two cleanup opportunities surfaced once we saw it on the page:

1. The group headings + subtotal rows add visual weight without a clear payoff — Health already shows the overall variance, and the rhythm of the table is broken by three label/subtotal pairs.
2. Two action icons per row crowd the right edge and look noisier than they need to.

This iteration replaces both with leaner alternatives.

## Goals

- Render rows as a single flat list (no group headings, no subtotal rows).
- Use a 4px colored left border on each row to convey type at a glance.
- Replace the per-row edit + delete icons with a single `⋯` (`MoreHorizontal`) dropdown menu containing `Edit` and `Delete` items.

## Non-goals

- No new totals, no grand-total row. Health card owns the totals story.
- No row-click-to-edit behavior (we explicitly chose the dropdown over click-row).
- No changes to the form sheet, mutations, page layout, or `BudgetHealthSection`.
- No changes to the empty / loading / error states.

## Visual layout

```
┌─ Categories ────────────────────────────── [+ Add Category] ┐
│                                                              │
│   Category               Planned     Actual    Variance      │   ← header (transparent left border)
│ ┃ Salary    ⓘ            $28,000.00  $0.00   +$28,000.00  ⋯ │   ← emerald border (Income)
│ ┃ Utilities              $800.00     $0.00   +$800.00     ⋯ │   ← rose border (Expense)
│ ┃ Cleaning               $2,000.00   $0.00   +$2,000.00   ⋯ │
│ ┃ Housing                $4,700.00   $0.00   +$4,700.00   ⋯ │
│ ┃ Dogs                   $1,000.00   $0.00   +$1,000.00   ⋯ │
│ ┃ Mom                    $2,000.00   $0.00   +$2,000.00   ⋯ │
│ ┃ Emergency Fund         $500.00     $0.00   +$500.00     ⋯ │   ← sky border (Savings)
└──────────────────────────────────────────────────────────────┘
```

The `┃` represents the colored 4px left border accent. No textual type indicator.

## Row order

Rows are sorted by type into three runs in fixed order: `Income` first, then `Expense`, then `Savings`. Within each type, the API's order is preserved. This keeps the colored bars in coherent runs (all emerald, then all rose, then all sky) so the eye reads the table as type-grouped without needing headings.

## Styling

### Type-to-border map

```ts
const TYPE_BORDER_CLASS: Record<CategoryType, string> = {
  [CategoryType.Income]: 'border-l-emerald-500',
  [CategoryType.Expense]: 'border-l-rose-500',
  [CategoryType.Savings]: 'border-l-sky-500',
};
```

Each row applies `border-l-4` plus the type-specific color class.

### Header alignment

The column header row applies `border-l-4 border-transparent` so its leading edge sits at the same x-coordinate as the data rows. Without this, the header text would be 4px to the left of the row text and the columns would visibly drift.

### Padding

The 4px border eats into the row's leading whitespace. To preserve the previous visual padding, the row uses `pl-3` (instead of `px-1`) on its outer grid container. The header row mirrors with `border-l-4 border-transparent pl-3 pr-1`.

### Row width / actions column

The action slot shrinks from `w-16` (two icons) to `w-8` (single `⋯` icon). The corresponding empty action-cell `<span>` in the column header must also shrink to `w-8` so columns stay aligned. The 5-column grid template (`grid-cols-[1fr_auto_auto_auto_auto]`) is unchanged.

## Action menu

Each row's action slot contains:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">Category actions</span>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => openEdit(dto)}>
      <Pencil className="mr-2 h-3.5 w-3.5" />
      Edit
    </DropdownMenuItem>
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
```

Pattern mirrors `BudgetCard.tsx`. The Delete item triggers the existing inline delete-confirm panel — same UX as today, just gated behind one extra click.

The Edit item is rendered only when `dto = categories.find(c => c.id === row.id)` is truthy (preserves the existing guard, even though the lookup should always succeed in practice).

## Helpers to remove

The following module-level constants and functions are no longer used and must be deleted:

- `GROUP_ORDER`
- `GROUP_LABEL`
- `groupRows`
- `sumGroup`
- The `GroupTotals` interface

`mergeRows` and `MergedRow` stay (still used to project rows for rendering).

A new tiny helper replaces `groupRows`:

```ts
function sortByType(rows: MergedRow[]): MergedRow[] {
  const order: Record<CategoryType, number> = {
    [CategoryType.Income]: 0,
    [CategoryType.Expense]: 1,
    [CategoryType.Savings]: 2,
  };
  return [...rows].sort((a, b) => order[a.categoryType] - order[b.categoryType]);
}
```

(The sort is stable in modern JS engines, so per-type order from the API is preserved.)

## Imports to change

In `BudgetCategoryBreakdown.tsx`:

- Add: `MoreHorizontal` from `lucide-react`.
- Keep: `Pencil` and `Trash2` (now used as glyphs inside the dropdown items).
- Add: `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` from `@/components/ui/dropdown-menu`.

## What stays unchanged

- Component props (`BudgetCategoryBreakdownProps`).
- All local state and mutation hooks.
- All four handlers (`openAdd`, `openEdit`, `handleAdd`, `handleEdit`, `handleDelete`).
- `BudgetCategoryFormSheet` integration.
- Inline delete confirmation panel layout (still rendered as a sibling of the row inside `<div key={row.id}>`).
- Notes tooltip.
- Empty / loading / error states.
- Card title `Categories` and the `+ Add Category` button.

## Render structure

The render path simplifies from "header + three nested groups, each with rows + a subtotal" to "header + flat list of rows":

```
{header row (with transparent border for alignment)}
{sortedRows.map(row => (
  <div key={row.id}>
    <div className={`grid ... border-l-4 ${TYPE_BORDER_CLASS[row.categoryType]} pl-3 ...`}>
      {name + notes tooltip}
      {planned}
      {actual}
      {variance}
      {dropdown menu}
    </div>
    {confirmingDeleteId === row.id && <inline-confirm panel>}
  </div>
))}
```

The two-level `.map().map()` structure becomes a single `.map()`. The IIFE wrapper around the rendered block can stay for clarity (it scopes the local `sortedRows` derivation) but a `useMemo` is just as good. Implementation is free to choose; spec is neutral on that point.

## Testing

Same manual smoke approach as the prior iteration (no test framework). After implementation:

1. Verify rows render as a single flat list, no group headings, no subtotal rows.
2. Verify each row has a left border whose color matches its type (emerald / rose / sky).
3. Verify the column header text starts at the same x-coordinate as row text (transparent border on header keeps alignment).
4. Verify rows are ordered Income → Expense → Savings; within each type, the order matches the API.
5. Verify clicking the `⋯` icon opens a dropdown with `Edit` and `Delete` items.
6. Verify `Edit` opens the form sheet with the row pre-filled.
7. Verify `Delete` triggers the existing inline confirm panel (no behavior change).
8. Verify the notes tooltip still appears on rows that have notes.
9. Verify empty / loading / error states still render correctly.
10. `npm run lint` and `npm run build` clean (no new errors).

## Out of scope / future

- Sorting beyond the type-group order (e.g. by name, by variance) — not needed now.
- Inline editing of the planned amount.
- Keyboard shortcuts (e.g. `e` to edit, `d` to delete).
- A grand-total row anywhere on the card.
