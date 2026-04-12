# Transactions Feature — Design Spec

**Date:** 2026-04-12  
**Status:** Approved

---

## Overview

Implement the Transactions feature as a full CRUD page pair (`/transactions` list + `/transactions/:id` detail), with a **reusable `TransactionFormDialog`** that can be embedded anywhere in the app (dashboard, budget detail, etc.) so users have quick access to record transactions from any context.

---

## Routes

| Route | Component | Purpose |
|---|---|---|
| `/transactions` | `TransactionsPage` | Filter, summary stats, card list, add button |
| `/transactions/:id` | `TransactionDetailPage` | Full detail view, edit, delete |

---

## Architecture

### Key Principle: Portable Form Dialog

`TransactionFormDialog` is self-contained. It owns its form state, calls the mutation internally, and notifies the parent via `onSuccess`. It accepts optional pre-fill values (e.g. `budgetId` when opened from a budget detail page, or `transactionType` from a quick-add button on the dashboard). Any page can import and use it without wiring up query state.

---

## Files

### Hooks — `src/features/transactions/hooks/`

**`useTransactionList.ts`**  
TanStack Query hook wrapping `transactionsApi.list(params)`. Query key: `['transactions', 'list', params]`. `staleTime: 5 * 60 * 1000`. Accepts `TransactionListParams` (budgetId, categoryId, transactionType, from, to).

**`useTransactionSummary.ts`**  
TanStack Query hook wrapping `transactionsApi.getSummary(params)`. Query key: `['transactions', 'summary', params]`. `staleTime: 5 * 60 * 1000`. Accepts `TransactionSummaryParams` (budgetId, from, to). Used by `TransactionsPage` to feed `TransactionSummaryBar`.

**`useTransactionDetail.ts`**  
Query hook wrapping `transactionsApi.getById(id)`. Query key: `['transactions', 'detail', id]`.

**`useTransactionMutations.ts`**  
Three named exports:
- `useCreateTransaction()` — calls `transactionsApi.create`. On success invalidates: `['transactions', 'list']`, `['transactions', 'summary']`, `['dashboard']`, `['budgets', 'detail', budgetId]` (budgetId from the mutation input).
- `useUpdateTransaction()` — calls `transactionsApi.update(id, data)`. On success invalidates: `['transactions', 'list']`, `['transactions', 'summary']`, `['transactions', 'detail', id]`, `['dashboard']`, `['budgets', 'detail', budgetId]`.
- `useDeleteTransaction()` — calls `transactionsApi.delete(id)`. On success invalidates: `['transactions', 'list']`, `['transactions', 'summary']`, `['dashboard']`, `['budgets', 'detail', budgetId]`.

---

### Components — `src/features/transactions/components/`

**`TransactionFormDialog.tsx`**

Props:
```ts
interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  defaultValues?: Partial<TransactionFormData>;  // pre-fills form (budgetId, transactionType, etc.)
  transactionId?: string;                        // required when mode === 'edit'
  onSuccess?: () => void;                        // called after successful mutation
}
```

Form fields (react-hook-form + zod):
- `budgetId` — required Select (list from `useBudgetList`); hidden/disabled in edit mode (backend doesn't allow changing)
- `transactionType` — required Select (`Income | Expense | SavingsDeposit | SavingsWithdrawal`)
- `categoryId` — required Select; uses an inline `useQuery(['categories', 'list'], () => categoriesApi.list())` (shares the cache with the existing `CategorySelect` component) and client-side filters by the `categoryType` that matches the selected `transactionType`. Does **not** reuse `CategorySelect` — that component's interface (`onSelect: (cat: CategoryDto) => void`, `onCreateRequest`) is built for the budget builder flow and is incompatible with react-hook-form Controller. A plain shadcn `Select` is used instead.
- `amount` — required number input (positive, > 0)
- `description` — required text input
- `transactionDate` — required date input (ISO string, defaults to today)
- `notes` — optional textarea

Validation schema (zod):
- `budgetId`: non-empty string
- `categoryId`: non-empty string
- `transactionType`: one of the four TransactionType values
- `amount`: positive number
- `description`: non-empty string (min 1 char)
- `transactionDate`: non-empty string (date format)
- `notes`: optional string or null

The `categoryId` Select re-filters when `transactionType` changes; the selected category is cleared if it no longer matches the new type.

Server errors displayed below the submit button (same pattern as BudgetFormSheet).

**`TransactionCard.tsx`**

Displays a single `TransactionDto` as a card row. Shows:
- Left: category icon placeholder (colored circle using `categoryType` for color), description (bold), category name + formatted date (muted)
- Right: amount with sign and color (green for Income, red for Expense, blue for Savings)

Clicking the card navigates to `/transactions/:id`.

**`TransactionSummaryBar.tsx`**

Four stat cards in a responsive grid (2-col on mobile, 4-col on md+):
- Income (green)
- Expenses (red)
- Savings Deposits (blue)
- Net Cash Flow (purple, positive = green / negative = red)

Accepts `data: TransactionSummaryDto | undefined` and `isLoading: boolean`. Shows skeleton placeholders while loading.

---

### Pages

**`TransactionsPage.tsx`** (`src/features/transactions/TransactionsPage.tsx`)

Layout (top → bottom):
1. Page header ("Transactions") + "Add Transaction" button → opens `TransactionFormDialog` in create mode
2. Filter row: Type select, Budget select, date range (from/to date inputs)
3. `TransactionSummaryBar` — driven by summary query using current filter state (budgetId + from/to; type not included in summary params)
4. Transaction card list — driven by list query using all filter state
5. Empty state if no transactions match filters

Filter state is local `useState` in `TransactionsPage`. Both the list query and summary query receive the current filter state so stats always reflect what's shown.

**`TransactionDetailPage.tsx`** (`src/features/transactions/TransactionDetailPage.tsx`)

Layout:
1. Back link → `/transactions`
2. Header: description + TransactionType badge + amount
3. Detail fields: budget, category, date, notes
4. Edit button → opens `TransactionFormDialog` in edit mode with pre-filled values
5. Delete button with inline confirm (same pattern as BudgetDetailPage)

On delete success, navigate to `/transactions`.

---

## Data Flow

```
TransactionsPage
  ├── filter state (useState) ──→ useTransactionList(params)  → card list
  │                          ──→ useTransactionSummary(params) → TransactionSummaryBar
  └── "Add" button            → TransactionFormDialog (create mode)
                                  └── useCreateTransaction → invalidates queries

TransactionDetailPage
  ├── useTransactionDetail(id) → display fields
  ├── Edit button             → TransactionFormDialog (edit mode, defaultValues from detail)
  │                               └── useUpdateTransaction → invalidates queries
  └── Delete button           → useDeleteTransaction → navigate('/transactions')

Dashboard (future)
  └── "Add Transaction" button → TransactionFormDialog (create mode, standalone)
```

---

## Router Update

Add two routes to `router.tsx` under the protected/authenticated section:
```tsx
{ path: 'transactions', element: <TransactionsPage /> }
{ path: 'transactions/:id', element: <TransactionDetailPage /> }
```

(Routes already exist in the sidebar — only the page components need wiring up.)

---

## Category Filtering Logic

`transactionType` maps to `categoryType` for filtering the category dropdown:
- `Income` → `CategoryType.Income`
- `Expense` → `CategoryType.Expense`
- `SavingsDeposit` → `CategoryType.Savings`
- `SavingsWithdrawal` → `CategoryType.Savings`

The category Select resets its value when `transactionType` changes and the current category no longer matches.

---

## Query Keys

| Data | Key |
|---|---|
| Transaction list | `['transactions', 'list', params]` |
| Transaction summary | `['transactions', 'summary', params]` |
| Transaction detail | `['transactions', 'detail', id]` |

Mutations invalidate the list and summary keys broadly (no params) so all active filter combinations refresh.

---

## Out of Scope

- Pagination (fetch all, no server-side pagination UI)
- CSV export
- Bulk delete
- Transaction search by description text (API doesn't support it)
- Linking transactions to savings goals (handled in the Savings feature)
