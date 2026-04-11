# Budget Creation with Categories — Design Spec

**Date:** 2026-04-11
**Status:** Approved

## Background

The API was updated so that `totalIncomePlanned`, `totalExpensesPlanned`, and `totalSavingsPlanned`
are no longer accepted in `CreateBudgetRequest`. The backend now derives these totals automatically
from the budget's categories. The frontend must be reworked so that users define their income and
expense categories (with planned amounts) during budget creation, and the totals auto-calculate.

## Goal

Replace the manual planned-total number inputs in the budget creation sheet with an inline category
builder. Users pick from existing categories or create new ones on the fly. Running totals (Income,
Expenses, Savings) update live as categories are added. On submit, the frontend creates the budget
then batch-adds all categories.

## Approach

**Extended single sheet with local category state (Approach B + eager category creation)**

- The `BudgetFormSheet` grows to include a `BudgetCategoryBuilder` section in create mode.
- Category rows are managed in local state (`PendingBudgetCategory[]`) separate from the
  react-hook-form fields.
- When a user creates a new category on the fly, `categoriesApi.create()` is called immediately
  so the category is real and reusable in the same session.
- A dedicated `useCreateBudgetWithCategories` hook orchestrates the multi-step submit sequence.
- Edit mode is unchanged — the category builder is hidden and categories continue to be managed
  from the budget detail page.

## Component Tree

```
BudgetListPage
  ├── useCreateBudgetWithCategories   (new orchestration hook)
  └── BudgetFormSheet (mode="create" | "edit")
        ├── react-hook-form: name, budgetType, startDate, endDate, isRecurring
        └── BudgetCategoryBuilder    (create mode only)
              ├── PendingBudgetCategory[] (local state)
              ├── live totals: Income / Expenses / Savings
              └── BudgetCategoryRow × N
                    ├── CategoryCombobox
                    │     └── NewCategoryInlineForm (popover)
                    ├── planned amount input
                    ├── notes input (optional)
                    └── remove button
```

## Key Type

```ts
interface PendingBudgetCategory {
  key: string;           // client-only uuid for React key
  category: CategoryDto; // fully resolved (existing or just-created)
  plannedAmount: number;
  notes: string;
}
```

## New Components

All category components live in `src/features/categories/components/` for reusability.

### `CategoryCombobox`
- Shadcn `Popover` + `Command` — searchable list of `CategoryDto[]`
- When the search string has no match, shows a "Create '{name}'" option
- Props: `categories`, `value`, `onSelect`, `onCreateRequest`, `disabled?`, `filterType?`
- `filterType` optionally restricts which category types are shown

### `NewCategoryInlineForm`
- A `Popover` anchored to the combobox trigger
- Fields: pre-filled name input + `CategoryType` selector (Income / Expense / Savings)
- On confirm: calls `categoriesApi.create({ name, categoryType, icon: null, color: null })`
- Invalidates `['categories', 'list']` on success
- Calls `onCreated(CategoryDto)` with the newly created category
- Shows spinner while API call is in-flight

### `BudgetCategoryRow` (`src/features/budgets/components/`)
- Props: `row: PendingBudgetCategory`, `existingCategoryIds: string[]`, `onAmountChange`,
  `onNotesChange`, `onRemove`
- Renders: category type badge, `CategoryCombobox` (disabled — locked once row is added),
  planned-amount `Input`, optional notes field, remove button

### `BudgetCategoryBuilder` (`src/features/budgets/components/`)
- Manages `PendingBudgetCategory[]` in local state
- Exposes current list to parent via `onChange: (cats: PendingBudgetCategory[]) => void`
- "Add category" button appends a blank row
- Bottom summary: read-only Income planned / Expenses planned / Savings planned, summed live

## Modified Files

### `BudgetFormSheet`
- Remove `totalIncomePlanned`, `totalExpensesPlanned`, `totalSavingsPlanned` from zod schema
  and all JSX inputs
- Add `mode: 'create' | 'edit'` prop (defaults to `'edit'`)
- In create mode, render `BudgetCategoryBuilder` below the recurring toggle
- Add `onCategoriesChange: (cats: PendingBudgetCategory[]) => void` prop (create mode only)
- `BudgetFormData` type loses the three planned-total fields

### `BudgetListPage`
- Replaces `useCreateBudget` with `useCreateBudgetWithCategories`
- Adds `const [pendingCategories, setPendingCategories] = useState<PendingBudgetCategory[]>([])`
- Passes `mode="create"` + `onCategoriesChange={setPendingCategories}` when opening create sheet
- Edit path unchanged — still uses `useUpdateBudget`

### `useBudgetMutations`
- Adds `useCreateBudgetWithCategories` hook
- Submit sequence:
  1. `POST /api/v1/budgets` → `budgetId`
  2. `Promise.all` — one `POST /api/v1/budgets/{budgetId}/categories` per pending category
  3. Invalidate `['budgets', 'list']` and `['dashboard']`

### `src/types/api.ts`
- `CreateBudgetRequest` loses planned-total fields
- `AddBudgetCategoryRequest` added if not already present

### `src/services/api/budgets.ts`
- Add `addCategory(budgetId: string, data: AddBudgetCategoryRequest): Promise<void>` if missing

## Data Flow on Submit (Create)

```
user clicks "Create Budget"
  → handleFormSubmit(formData) in BudgetListPage
  → createWithCategories.mutate({ formData, categories: pendingCategories })
    → POST /api/v1/budgets                          (step 1)
    → Promise.all POST /api/v1/budgets/{id}/categories  (step 2, one per row)
    → invalidate queries                            (step 3)
    → setFormOpen(false)
```

## Out of Scope

- Icon and color selection when creating a new category on the fly (deferred to category management page)
- Edit-mode category management (already handled on the budget detail page)
- Validation that at least one category must be added before submitting (budget can have zero categories)
