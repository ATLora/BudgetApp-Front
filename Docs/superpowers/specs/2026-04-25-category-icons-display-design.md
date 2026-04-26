# Category Icons Display — Design

**Date:** 2026-04-25
**Status:** Approved (pending implementation)
**Type:** Feature / UI consistency

## Problem

Categories already store `icon` (Lucide icon name, e.g. `"ShoppingCart"`) and `color` (hex) on `CategoryDto`. Users can pick an icon when creating/editing a category via [IconPicker.tsx](../../src/features/categories/components/IconPicker.tsx), but **the icon is never displayed anywhere** — every surface that renders a category name (budget breakdown, transactions list, transaction detail, category pickers, budget wizard, dashboard legend) shows text only. The picker exists but its output is invisible to the user, making the icon feature feel half-built.

## Goal

Display the category icon everywhere a category name is rendered, with consistent sizing and tint rules and graceful fallbacks for categories without an icon.

## Non-goals

- Backend DTO changes. The two API DTOs that don't include icon (`BudgetCategoryDto`, `TransactionDto`) will continue to ship `categoryId`/`categoryName` only; the frontend will resolve icons via the existing `['categories', 'list']` query cache.
- Per-category custom hex color (`CategoryDto.color`) is **not** used for icon tinting in this work. Existing color schemes (emerald/rose/sky by `categoryType`, `text-muted-foreground` for neutral surfaces) are preserved.
- Re-styling the IconPicker itself.
- Building out the (currently stub) Categories page.

## Background

### Where the icon name is set
- `IconPicker.tsx` exports a local `CATEGORY_ICONS: Record<string, LucideIcon>` map of 24 Lucide icons. The category form writes the chosen key (e.g. `"ShoppingCart"`) into `CategoryDto.icon`.

### Where the icon must be read
Two situations:

1. **DTO already carries `icon`** — render directly:
   - `CategoryDto` (used by `CategorySelect`, `BudgetCategoryWizardStep`, `TransactionFormDialog`'s category query)
   - `SpendingByCategoryDto` (dashboard chart)
2. **DTO carries only `categoryId`/`categoryName`** — must resolve via lookup:
   - `BudgetCategoryDto` (used in `BudgetCategoryBreakdown`)
   - `TransactionDto` and `TransactionDetailDto` (used in `TransactionCard`, `TransactionDetailPage`)

The `['categories', 'list']` TanStack Query cache (10min staleTime) is already populated by multiple consumers, so a lookup hook re-reads existing cache without extra network round-trips.

## Architecture

### Shared building blocks

**`src/features/categories/icons.tsx`** (new)

Move the icon map out of `IconPicker.tsx` so it has one home, plus a small render component:

```ts
export const CATEGORY_ICONS: Record<string, LucideIcon> = { /* the existing 24 entries */ };

interface CategoryIconProps {
  iconName: string | null | undefined;
  className?: string;     // size + color via Tailwind
  fallback?: ReactNode;   // rendered when iconName is null/unknown
}

export function CategoryIcon({ iconName, className, fallback = null }: CategoryIconProps): ReactNode;
```

`IconPicker.tsx` is updated to import `CATEGORY_ICONS` from this new module instead of declaring its own.

**`src/features/categories/hooks/useCategoryLookup.ts`** (new)

```ts
export function useCategoryLookup(): {
  lookup: Map<string, CategoryDto>;
  isLoading: boolean;
  isError: boolean;
};
```

Uses `useQuery` with the same `['categories', 'list']` key + `categoriesApi.list()` queryFn + 10min staleTime as `CategorySelect` so it shares the cache. Memoizes the Map via `useMemo` keyed on the data array reference.

### Why these boundaries

- The icon map and the React renderer are a single small file because they always change together — adding an icon = updating both keys and the picker.
- The lookup hook stays separate from the icon component because not every consumer needs lookup (the four DTO-carrying-icon consumers can pass `icon` directly).
- Both are scoped to `features/categories/` since they belong to that feature's domain even though they're consumed cross-feature — this matches the existing pattern (`CategorySelect`, `IconPicker` already live there and are used from budgets/transactions).

## Data flow

```
CategoryDto.icon  ──┐
                    ├──► <CategoryIcon iconName=...> ──► Lucide icon (or fallback)
useCategoryLookup ──┘
```

- **Direct path:** consumers that already have `CategoryDto` (or `SpendingByCategoryDto` with its own `icon` field) pass `iconName` straight to `<CategoryIcon>`.
- **Lookup path:** consumers with only `categoryId` call `useCategoryLookup()`, then `lookup.get(categoryId)?.icon`.

## Consumers (changes)

| # | File | Change |
|---|---|---|
| 1 | [BudgetCategoryBreakdown.tsx:230](../../src/features/budgets/components/BudgetCategoryBreakdown.tsx) | Add `<CategoryIcon>` immediately left of `row.categoryName`. Resolve via `useCategoryLookup`. Tint: `text-muted-foreground`, `size-4`. |
| 2 | [TransactionCard.tsx:55-59](../../src/features/transactions/components/TransactionCard.tsx) | Keep the colored circle (`bg/text` from `CATEGORY_TYPE_COLORS`). Render `<CategoryIcon>` inside. Fallback: the existing first-letter span. Resolve via `useCategoryLookup`. Icon `size-4`, inherits the circle's `text-*-600`. |
| 3 | [TransactionDetailPage.tsx:120, :172](../../src/features/transactions/TransactionDetailPage.tsx) | Render `<CategoryIcon>` next to category name in the subtitle line (line 120) and inside the "Category" detail field (line 172). Resolve via `useCategoryLookup`. Tint: `text-muted-foreground`, `size-4`. |
| 4 | [CategorySelect.tsx:80-84](../../src/features/categories/components/CategorySelect.tsx) | Render `<CategoryIcon iconName={cat.icon}>` inside each `SelectItem` (left of name). Tint: `text-muted-foreground`, `size-4`. |
| 5 | [TransactionFormDialog.tsx:340-344](../../src/features/transactions/components/TransactionFormDialog.tsx) | Same treatment as #4 for the inline Select. |
| 6 | [BudgetCategoryWizardRow.tsx:71](../../src/features/budgets/components/BudgetCategoryWizardRow.tsx) | Add `iconName?: string \| null` prop. Render `<CategoryIcon>` before the `<label>`. Parent ([BudgetCategoryWizardStep.tsx](../../src/features/budgets/components/BudgetCategoryWizardStep.tsx)) already holds the full `CategoryDto[]` — pass `cat.icon` through. Tint: `text-muted-foreground`, `size-4`. |
| 7 | [SpendingByCategoryChart.tsx:64-72](../../src/features/dashboard/components/SpendingByCategoryChart.tsx) | In the legend rows: render `<CategoryIcon iconName={cat.icon}>` between the existing color dot and the name. Tint: `text-muted-foreground`, `size-3.5`. (DTO already includes `icon` — no lookup.) |

## Color & sizing rules (consolidated)

| Surface | Size | Tint |
|---|---|---|
| BudgetCategoryBreakdown row | `size-4` | `text-muted-foreground` |
| TransactionCard avatar (inside circle) | `size-4` | inherit the circle's `text-{emerald,rose,sky}-600` |
| TransactionDetailPage | `size-4` | `text-muted-foreground` |
| CategorySelect option | `size-4` | `text-muted-foreground` |
| TransactionFormDialog option | `size-4` | `text-muted-foreground` |
| Budget wizard row | `size-4` | `text-muted-foreground` |
| Dashboard legend | `size-3.5` | `text-muted-foreground` |

## Fallback rules

- `iconName === null` (user never picked one) → `<CategoryIcon>` returns `fallback` (default `null`).
- `iconName` set but not in `CATEGORY_ICONS` (icon was removed/renamed) → treated identically to `null`.
- Lookup-loading state (TransactionCard, BudgetCategoryBreakdown, TransactionDetailPage) → render the fallback (or nothing). The row is already visible from server data; we don't want flicker.
- TransactionCard is the **only** surface that supplies a non-null fallback (the existing first-letter span). Every other surface just collapses to no-icon, so the layout reads identically to today when no icon is set.

## Error handling

- Lookup hook surfaces `isError` but consumers don't render error UI from it — the absence of an icon is itself the worst-case visual outcome and matches the no-icon-set state. Categories list errors are already surfaced by `CategorySelect` and the dedicated category management surface.
- No new network calls are introduced. The lookup hook reuses the existing `['categories', 'list']` cache.

## Testing & verification

No test framework is configured in this repo, so verification is via the dev server.

Run `npm run dev`, then with the Claude Preview tools:

1. **BudgetDetailPage** — categories with icons show icons in the breakdown grid; categories without icons show no icon (no broken layout).
2. **TransactionsPage** — `TransactionCard` shows icon inside the colored circle for categories that have one; first-letter fallback when not.
3. **TransactionDetailPage** — icon appears next to category name in subtitle and detail field.
4. **TransactionFormDialog** — open the Select; icons appear left of each option name.
5. **CategorySelect** in `BudgetCategoryFormSheet` — icons appear in dropdown.
6. **Budget Wizard** — icons appear next to category names on the planning step.
7. **Dashboard SpendingByCategoryChart legend** — icon appears between the color dot and the category name; missing-icon categories collapse cleanly.
8. **Edit a category and clear its icon** — verify fallback behavior across surfaces (TransactionCard reverts to letter; others render no icon).

Then run `npm run build` to confirm no type errors and `npm run lint` for warnings.

## Out-of-scope follow-ups (not implemented now)

- Categories management page (still a stub).
- Per-category color (`CategoryDto.color`) tinting — could replace the type-based tint in TransactionCard later if desired.
- Icon presence indicator in the category creation form (showing user a preview chip with the chosen icon).
