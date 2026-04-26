# Category Icons Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface category icons (Lucide names already stored on `CategoryDto.icon`) across every UI surface that renders a category — budget breakdown, transactions list, transaction detail, both category pickers, the budget wizard, and the dashboard spending legend — using a shared `CategoryIcon` component plus a `useCategoryLookup` hook over the existing `['categories', 'list']` query cache.

**Architecture:** Extract the existing `CATEGORY_ICONS` map from `IconPicker.tsx` into a shared module that also exports a `<CategoryIcon>` component. Add a `useCategoryLookup` hook that re-uses the cached categories list to expose a `Map<categoryId, CategoryDto>` for surfaces that have only a `categoryId`. Surfaces that already carry `icon` on their DTO render directly without lookup. Fallback rule: missing/unknown icon → render nothing, except `TransactionCard` which falls back to its current first-letter avatar.

**Tech Stack:** React 19, TypeScript (no `enum`, `as const` objects), Vite, TanStack Query (cache key `['categories', 'list']`), Tailwind v4, base-ui Select primitives (`@base-ui/react/select`), Lucide icons.

**Reference spec:** [Docs/superpowers/specs/2026-04-25-category-icons-display-design.md](../specs/2026-04-25-category-icons-display-design.md)

**Test framework note:** This project has no automated test framework configured (per [CLAUDE.md](../../../CLAUDE.md)). Verification per task is `npm run build` (type-check) plus targeted browser inspection. Browser checks use the Claude Preview tools (`preview_start`, `preview_snapshot`, `preview_screenshot`).

---

## File map

**Created:**
- `src/features/categories/icons.tsx` — shared `CATEGORY_ICONS` map + `<CategoryIcon>` component (Task 1)
- `src/features/categories/hooks/useCategoryLookup.ts` — Map<id, CategoryDto> lookup hook (Task 2)

**Modified:**
- `src/features/categories/components/IconPicker.tsx` — import map from new shared module (Task 1)
- `src/features/budgets/components/BudgetCategoryBreakdown.tsx` — render icon in row (Task 3)
- `src/features/transactions/components/TransactionCard.tsx` — render icon inside avatar with letter fallback (Task 4)
- `src/features/transactions/TransactionDetailPage.tsx` — render icon in two places (Task 5)
- `src/features/categories/components/CategorySelect.tsx` — render icon in dropdown options (Task 6)
- `src/features/transactions/components/TransactionFormDialog.tsx` — render icon in inline category Select (Task 7)
- `src/features/budgets/components/BudgetCategoryWizardRow.tsx` — accept `iconName` prop and render (Task 8)
- `src/features/budgets/components/BudgetCategoryWizardStep.tsx` — pass `cat.icon` to row (Task 8)
- `src/features/dashboard/components/SpendingByCategoryChart.tsx` — render icon in legend (Task 9)

---

## Task 1: Extract `CATEGORY_ICONS` map + add `<CategoryIcon>` component

**Files:**
- Create: `src/features/categories/icons.tsx`
- Modify: `src/features/categories/components/IconPicker.tsx`

- [ ] **Step 1: Create the shared icons module**

Write `src/features/categories/icons.tsx`:

```tsx
// src/features/categories/icons.tsx
import {
  Wallet, ShoppingCart, Home, Car,
  Utensils, Plane, Heart, Dumbbell,
  GraduationCap, Briefcase, TrendingUp, Gift,
  Music, Coffee, Baby, Dog,
  Smartphone, Tv, Fuel, Stethoscope,
  Bus, Landmark, Shirt, Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Wallet, ShoppingCart, Home, Car,
  Utensils, Plane, Heart, Dumbbell,
  GraduationCap, Briefcase, TrendingUp, Gift,
  Music, Coffee, Baby, Dog,
  Smartphone, Tv, Fuel, Stethoscope,
  Bus, Landmark, Shirt, Wrench,
};

interface CategoryIconProps {
  iconName: string | null | undefined;
  className?: string;
  fallback?: ReactNode;
}

/**
 * Renders the Lucide icon corresponding to a category's `icon` field.
 * Falls back to the `fallback` node when the icon name is null/undefined or not in the map.
 */
export function CategoryIcon({ iconName, className, fallback = null }: CategoryIconProps): ReactNode {
  if (!iconName) return fallback;
  const Icon = CATEGORY_ICONS[iconName];
  if (!Icon) return fallback;
  return <Icon aria-hidden="true" className={className} />;
}
```

- [ ] **Step 2: Update `IconPicker.tsx` to import from shared module**

Replace `src/features/categories/components/IconPicker.tsx` with:

```tsx
// src/features/categories/components/IconPicker.tsx
import { CATEGORY_ICONS } from '../icons';
import { cn } from '@/lib/utils';

interface IconPickerProps {
  value: string | null;
  onChange: (icon: string | null) => void;
  disabled?: boolean;
}

export function IconPicker({ value, onChange, disabled = false }: IconPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {Object.entries(CATEGORY_ICONS).map(([name, Icon]) => {
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            disabled={disabled}
            aria-label={name}
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : name)}
            className={cn(
              'flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted',
              selected && 'bg-primary/10 text-primary ring-1 ring-primary',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npm run build`
Expected: build completes with no type errors.

Run: `npm run lint`
Expected: no new errors or warnings introduced.

- [ ] **Step 4: Commit**

```bash
git add src/features/categories/icons.tsx src/features/categories/components/IconPicker.tsx
git commit -m "refactor(categories): extract CATEGORY_ICONS map and add CategoryIcon component"
```

---

## Task 2: Add `useCategoryLookup` hook

**Files:**
- Create: `src/features/categories/hooks/useCategoryLookup.ts`

- [ ] **Step 1: Create the hook**

Write `src/features/categories/hooks/useCategoryLookup.ts`:

```ts
// src/features/categories/hooks/useCategoryLookup.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '@/services/api/categories';
import type { CategoryDto } from '@/types/api';

/**
 * Returns a Map<categoryId, CategoryDto> built from the shared
 * ['categories', 'list'] query cache. Use this in components that have only
 * a categoryId and need to read icon/color/etc.
 *
 * Re-uses the same query key + staleTime as CategorySelect so this is a
 * cache read in the common case, not a new fetch.
 */
export function useCategoryLookup(): {
  lookup: Map<string, CategoryDto>;
  isLoading: boolean;
  isError: boolean;
} {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['categories', 'list'],
    queryFn: () => categoriesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const lookup = useMemo(() => {
    const map = new Map<string, CategoryDto>();
    if (data) {
      for (const c of data) {
        map.set(c.id, c);
      }
    }
    return map;
  }, [data]);

  return { lookup, isLoading, isError };
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: build completes with no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/categories/hooks/useCategoryLookup.ts
git commit -m "feat(categories): add useCategoryLookup hook over shared categories cache"
```

---

## Task 3: `BudgetCategoryBreakdown` — render icon in each row

**Files:**
- Modify: `src/features/budgets/components/BudgetCategoryBreakdown.tsx`

- [ ] **Step 1: Add lookup hook + CategoryIcon imports**

In `src/features/budgets/components/BudgetCategoryBreakdown.tsx`, add to the imports block (after the existing `import { BudgetCategoryFormSheet } ...` line):

```tsx
import { CategoryIcon } from '@/features/categories/icons';
import { useCategoryLookup } from '@/features/categories/hooks/useCategoryLookup';
```

- [ ] **Step 2: Call the hook inside the component**

In the `BudgetCategoryBreakdown` function, immediately after the existing line:
```tsx
  const deleteMutation = useDeleteBudgetCategory(budgetId);
```

Add:
```tsx
  const { lookup: categoryLookup } = useCategoryLookup();
```

- [ ] **Step 3: Render the icon in each row**

Locate the row's category-name span (around the existing line):
```tsx
                        <span className="flex items-center gap-1.5 font-medium">
                          {row.categoryName}
```

Replace it with:
```tsx
                        <span className="flex items-center gap-1.5 font-medium">
                          <CategoryIcon
                            iconName={categoryLookup.get(dto?.categoryId ?? '')?.icon}
                            className="size-4 text-muted-foreground shrink-0"
                          />
                          {row.categoryName}
```

(Note: `dto` is the `BudgetCategoryDto` already destructured a few lines above as `const dto = categories.find((c) => c.id === row.id);`. We use its `categoryId` — the **catalog** category id — to look up icon, not `row.id` which is the budget-category junction id.)

- [ ] **Step 4: Type-check + lint**

Run: `npm run build`
Expected: build passes.

Run: `npm run lint`
Expected: no new warnings.

- [ ] **Step 5: Browser verification**

Start dev server (skip if already running):

```
preview_start
```

Navigate to a budget detail page that contains categories (the existing seeded budget data). For categories with an icon set, an icon should appear left of the name in the breakdown grid. Categories without an icon render as before (just the name).

```
preview_snapshot  # confirm icon nodes appear next to category names
```

- [ ] **Step 6: Commit**

```bash
git add src/features/budgets/components/BudgetCategoryBreakdown.tsx
git commit -m "feat(budgets): show category icons in budget breakdown rows"
```

---

## Task 4: `TransactionCard` — render icon inside avatar with letter fallback

**Files:**
- Modify: `src/features/transactions/components/TransactionCard.tsx`

- [ ] **Step 1: Replace the entire file**

Overwrite `src/features/transactions/components/TransactionCard.tsx` with:

```tsx
// src/features/transactions/components/TransactionCard.tsx
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { TransactionDto } from '@/types/api';
import { CategoryIcon } from '@/features/categories/icons';
import { useCategoryLookup } from '@/features/categories/hooks/useCategoryLookup';

const CATEGORY_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Income: { bg: 'bg-emerald-500/15', text: 'text-emerald-600' },
  Expense: { bg: 'bg-rose-500/15', text: 'text-rose-600' },
  Savings: { bg: 'bg-sky-500/15', text: 'text-sky-600' },
};

const AMOUNT_COLOR: Record<string, string> = {
  Income: 'text-emerald-600',
  Expense: 'text-rose-600',
  SavingsDeposit: 'text-sky-600',
  SavingsWithdrawal: 'text-amber-600',
};

const AMOUNT_SIGN: Record<string, string> = {
  Income: '+',
  Expense: '-',
  SavingsDeposit: '+',
  SavingsWithdrawal: '-',
};

interface TransactionCardProps {
  transaction: TransactionDto;
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const navigate = useNavigate();
  const { lookup: categoryLookup } = useCategoryLookup();
  const colors = CATEGORY_TYPE_COLORS[transaction.categoryType] ?? CATEGORY_TYPE_COLORS['Expense'];
  const amountColor = AMOUNT_COLOR[transaction.transactionType] ?? 'text-foreground';
  const sign = AMOUNT_SIGN[transaction.transactionType] ?? '';
  const iconName = categoryLookup.get(transaction.categoryId)?.icon;
  const letterFallback = (
    <span aria-hidden="true">{transaction.categoryName.charAt(0).toUpperCase()}</span>
  );

  function handleClick() {
    navigate(`/transactions/${transaction.id}`);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`View transaction: ${transaction.description}`}
      className="flex cursor-pointer items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${colors.bg} ${colors.text}`}
        >
          <CategoryIcon
            iconName={iconName}
            className="size-4"
            fallback={letterFallback}
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{transaction.description}</p>
          <p className="text-xs text-muted-foreground">
            {transaction.categoryName} · {formatDate(transaction.transactionDate, 'MMM d, yyyy')}
          </p>
        </div>
      </div>
      <p className={`ml-4 flex-shrink-0 text-sm font-semibold ${amountColor}`}>
        {sign}{formatCurrency(transaction.amount)}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npm run build`
Expected: build passes.

Run: `npm run lint`
Expected: no new warnings.

- [ ] **Step 3: Browser verification**

```
preview_start  # if not running
```

Navigate to `/transactions`. Each row's leading avatar should:
- Show the category's chosen Lucide icon (size-4, inheriting the avatar's emerald/rose/sky-600 text color) when the category has `icon` set.
- Fall back to the first uppercase letter of the category name when no icon is set or the icon name is unknown.

```
preview_snapshot  # confirm icon SVGs replace letters where applicable
```

- [ ] **Step 4: Commit**

```bash
git add src/features/transactions/components/TransactionCard.tsx
git commit -m "feat(transactions): show category icon inside transaction card avatar"
```

---

## Task 5: `TransactionDetailPage` — render icon next to category name (subtitle + detail field)

**Files:**
- Modify: `src/features/transactions/TransactionDetailPage.tsx`

- [ ] **Step 1: Add imports**

Add to the import block at the top (after the existing `TransactionFormData` import):

```tsx
import { CategoryIcon } from '@/features/categories/icons';
import { useCategoryLookup } from '@/features/categories/hooks/useCategoryLookup';
```

- [ ] **Step 2: Call the hook + derive icon name**

Inside the `TransactionDetailPage` function, immediately after this existing line:
```tsx
  const transaction = detailQuery.data;
```

Add:
```tsx
  const { lookup: categoryLookup } = useCategoryLookup();
  const categoryIconName = transaction
    ? categoryLookup.get(transaction.categoryId)?.icon
    : undefined;
```

- [ ] **Step 3: Update subtitle to include icon**

Locate the existing block:
```tsx
        <div className="space-y-1 min-w-0">
          <h1 className="truncate text-2xl font-semibold">{transaction.description}</h1>
          <p className="text-sm text-muted-foreground">
            {transaction.budgetName} · {transaction.categoryName} ·{' '}
            {formatDate(transaction.transactionDate, 'MMM d, yyyy')}
          </p>
        </div>
```

Replace the `<p>` line with:
```tsx
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>{transaction.budgetName}</span>
            <span aria-hidden="true">·</span>
            <CategoryIcon iconName={categoryIconName} className="size-3.5 shrink-0" />
            <span>{transaction.categoryName}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(transaction.transactionDate, 'MMM d, yyyy')}</span>
          </p>
```

- [ ] **Step 4: Update Category detail field to include icon**

Locate the existing block:
```tsx
          <div>
            <p className="text-xs text-muted-foreground">Category</p>
            <p className="mt-0.5 font-medium">{transaction.categoryName}</p>
          </div>
```

Replace its inner `<p className="mt-0.5 font-medium">` with:
```tsx
            <p className="mt-0.5 flex items-center gap-1.5 font-medium">
              <CategoryIcon
                iconName={categoryIconName}
                className="size-4 text-muted-foreground shrink-0"
              />
              {transaction.categoryName}
            </p>
```

- [ ] **Step 5: Type-check + lint**

Run: `npm run build`
Expected: build passes.

Run: `npm run lint`
Expected: no new warnings.

- [ ] **Step 6: Browser verification**

```
preview_start  # if not running
```

From the transactions list, click into a transaction whose category has an icon. Verify the icon appears:
- In the subtitle line between the budget name and category name.
- In the detail card's "Category" field, left of the category name.

For a transaction whose category has no icon, both surfaces should render exactly as today (no broken spacing).

- [ ] **Step 7: Commit**

```bash
git add src/features/transactions/TransactionDetailPage.tsx
git commit -m "feat(transactions): show category icon on transaction detail page"
```

---

## Task 6: `CategorySelect` — render icon in dropdown options

**Files:**
- Modify: `src/features/categories/components/CategorySelect.tsx`

- [ ] **Step 1: Add CategoryIcon import**

Add to the import block (after the existing `import { categoriesApi } ...` line):

```tsx
import { CategoryIcon } from '../icons';
```

- [ ] **Step 2: Update SelectItem children to include the icon**

Locate the existing block:
```tsx
        {available.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            {cat.name}
          </SelectItem>
        ))}
```

Replace with:
```tsx
        {available.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            <CategoryIcon
              iconName={cat.icon}
              className="size-4 text-muted-foreground shrink-0"
            />
            <span>{cat.name}</span>
          </SelectItem>
        ))}
```

(`SelectPrimitive.ItemText` already wraps children with `flex flex-1 shrink-0 gap-2`, so the icon and label align horizontally without extra wrappers.)

- [ ] **Step 3: Type-check + lint**

Run: `npm run build`
Expected: build passes.

Run: `npm run lint`
Expected: no new warnings.

- [ ] **Step 4: Browser verification**

```
preview_start  # if not running
```

Navigate to a budget detail page → "Add Category" button → opens `BudgetCategoryFormSheet` which uses `CategorySelect`. Click the Select to open the dropdown. Each option should show its icon (where set) left of the name. Options for categories without an icon should render with only the name and consistent spacing.

The trigger's selected text remains text-only (intentional — `Select`'s `items` prop is keyed `Record<string, string>`).

- [ ] **Step 5: Commit**

```bash
git add src/features/categories/components/CategorySelect.tsx
git commit -m "feat(categories): show category icons in CategorySelect dropdown"
```

---

## Task 7: `TransactionFormDialog` — render icon in inline category Select

**Files:**
- Modify: `src/features/transactions/components/TransactionFormDialog.tsx`

- [ ] **Step 1: Add CategoryIcon import**

Add to the import block at the top:

```tsx
import { CategoryIcon } from '@/features/categories/icons';
```

- [ ] **Step 2: Update SelectItem children**

Locate the existing block (around line 340):
```tsx
                  <SelectContent>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
```

Replace with:
```tsx
                  <SelectContent>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <CategoryIcon
                          iconName={c.icon}
                          className="size-4 text-muted-foreground shrink-0"
                        />
                        <span>{c.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
```

- [ ] **Step 3: Type-check + lint**

Run: `npm run build`
Expected: build passes.

Run: `npm run lint`
Expected: no new warnings.

- [ ] **Step 4: Browser verification**

```
preview_start  # if not running
```

From the transactions list, click "New Transaction" (or open the form dialog from the budget detail page). Pick a transaction type, then click the Category select. Each option should show its icon left of the name. Options without an icon render with just the name, aligned consistently.

- [ ] **Step 5: Commit**

```bash
git add src/features/transactions/components/TransactionFormDialog.tsx
git commit -m "feat(transactions): show category icons in transaction form category picker"
```

---

## Task 8: `BudgetCategoryWizardRow` + `BudgetCategoryWizardStep` — pass + render icon

**Files:**
- Modify: `src/features/budgets/components/BudgetCategoryWizardRow.tsx`
- Modify: `src/features/budgets/components/BudgetCategoryWizardStep.tsx`

- [ ] **Step 1: Add `iconName` prop to the row**

In `src/features/budgets/components/BudgetCategoryWizardRow.tsx`:

Add to the imports block:
```tsx
import { CategoryIcon } from '@/features/categories/icons';
```

Update the props interface:
```tsx
interface BudgetCategoryWizardRowProps {
  categoryId: string;
  categoryName: string;
  iconName: string | null | undefined;
  value: BudgetCategoryWizardRowValue;
  onChange: (next: BudgetCategoryWizardRowValue) => void;
}
```

Update the function signature to destructure the new prop:
```tsx
export function BudgetCategoryWizardRow({
  categoryId,
  categoryName,
  iconName,
  value,
  onChange,
}: BudgetCategoryWizardRowProps) {
```

Update the label inside the row:
```tsx
        <label htmlFor={inputId} className="flex flex-1 items-center gap-1.5 text-sm">
          <CategoryIcon
            iconName={iconName}
            className="size-4 text-muted-foreground shrink-0"
          />
          {categoryName}
        </label>
```

(replaces the existing `<label htmlFor={inputId} className="flex-1 text-sm">{categoryName}</label>`)

- [ ] **Step 2: Pass `iconName` from the parent step**

In `src/features/budgets/components/BudgetCategoryWizardStep.tsx`, locate the existing block (around line 171-180):

```tsx
                  {sectionCats.map((c) => (
                    <BudgetCategoryWizardRow
                      key={c.id}
                      categoryId={c.id}
                      categoryName={c.name}
                      value={getRowValue(drafts, c.id)}
                      onChange={(next) =>
                        onDraftsChange(setRowValue(drafts, c.id, next))
                      }
```

Add the `iconName` prop:
```tsx
                  {sectionCats.map((c) => (
                    <BudgetCategoryWizardRow
                      key={c.id}
                      categoryId={c.id}
                      categoryName={c.name}
                      iconName={c.icon}
                      value={getRowValue(drafts, c.id)}
                      onChange={(next) =>
                        onDraftsChange(setRowValue(drafts, c.id, next))
                      }
```

- [ ] **Step 3: Type-check + lint**

Run: `npm run build`
Expected: build passes (the new required prop must be passed at all call sites — `BudgetCategoryWizardStep` is the only caller of `BudgetCategoryWizardRow`).

Run: `npm run lint`
Expected: no new warnings.

- [ ] **Step 4: Browser verification**

```
preview_start  # if not running
```

Navigate to the budget list and start a new budget (opens `BudgetWizardDialog`). Advance to the categories planning step. Each category row should show its icon left of the name; rows without an icon render unchanged. The amount input alignment should remain unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/features/budgets/components/BudgetCategoryWizardRow.tsx src/features/budgets/components/BudgetCategoryWizardStep.tsx
git commit -m "feat(budgets): show category icons in budget wizard planning step"
```

---

## Task 9: `SpendingByCategoryChart` — render icon in legend

**Files:**
- Modify: `src/features/dashboard/components/SpendingByCategoryChart.tsx`

- [ ] **Step 1: Add CategoryIcon import**

Add to the existing import block (after `from 'lucide-react'`):

```tsx
import { CategoryIcon } from '@/features/categories/icons';
```

- [ ] **Step 2: Render icon in each legend row**

Locate the existing block:
```tsx
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
```

Replace with:
```tsx
              {categories.map((cat, index) => (
                <div key={cat.categoryId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: cat.color ?? CHART_PALETTE[index % CHART_PALETTE.length],
                      }}
                    />
                    <CategoryIcon
                      iconName={cat.icon}
                      className="size-3.5 text-muted-foreground shrink-0"
                    />
                    <span>{cat.categoryName}</span>
                  </div>
```

- [ ] **Step 3: Type-check + lint**

Run: `npm run build`
Expected: build passes.

Run: `npm run lint`
Expected: no new warnings.

- [ ] **Step 4: Browser verification**

```
preview_start  # if not running
```

Navigate to `/dashboard`. The "Spending by Category" card legend should show: color dot → icon (when set) → category name. Categories without an icon render with just dot + name, aligned consistently.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/components/SpendingByCategoryChart.tsx
git commit -m "feat(dashboard): show category icons in spending-by-category legend"
```

---

## Task 10: Final cross-surface verification

**Files:** none modified

- [ ] **Step 1: Full type-check**

Run: `npm run build`
Expected: build passes with no errors and produces a successful Vite output.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors or warnings introduced by this work.

- [ ] **Step 3: Manual fallback verification in browser**

```
preview_start  # if not running
```

Navigate to **Categories management** (or use the existing UI) and edit a category that currently has an icon → clear the icon → save. Then visit each surface and confirm graceful fallback:

| Surface | Expected when icon cleared |
|---|---|
| `BudgetCategoryBreakdown` | Row renders without icon, layout unchanged |
| `TransactionCard` | Avatar shows the first letter of the category name |
| `TransactionDetailPage` (subtitle + Category field) | Category renders without icon |
| `CategorySelect` dropdown | Option renders without icon |
| `TransactionFormDialog` dropdown | Option renders without icon |
| Budget wizard row | Row renders without icon |
| Dashboard "Spending by Category" legend | Row renders without icon |

Restore the icon on that category afterwards if you intend to keep it.

- [ ] **Step 4: Visual snapshot for sign-off**

Capture a screenshot of the budget detail page and the transactions list (the two surfaces explicitly named in the original request):

```
preview_screenshot  # navigate to /budgets/<id> first
preview_screenshot  # navigate to /transactions first
```

- [ ] **Step 5: Final summary commit (only if any docs/screenshots were added)**

If any documentation or screenshot files were committed in this session, group them into a final commit. Otherwise no commit needed — the per-task commits stand on their own.
