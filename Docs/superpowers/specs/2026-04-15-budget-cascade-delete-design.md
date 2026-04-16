# Budget Cascade Delete — Frontend Update

**Date:** 2026-04-15
**Status:** Draft

## Context

The backend API now supports cascade deletion for budgets — deleting a budget also deletes all its associated transactions. The frontend currently warns users that budgets **cannot** be deleted if they have transactions. This spec covers updating the frontend to reflect the new cascade behavior.

## Decision Summary

- **Warning style:** Generic cascade warning (no transaction count fetch)
- **Confirmation UI:** Upgrade from inline confirmation to shadcn `AlertDialog` modal
- **Scope:** Budget deletion only (other delete flows unchanged)

## Changes

### 1. Add shadcn AlertDialog Component

Run `npx shadcn@latest add alert-dialog` to install the component at `src/components/ui/alert-dialog.tsx`.

### 2. Create `DeleteBudgetDialog` Component

**File:** `src/features/budgets/components/DeleteBudgetDialog.tsx`

A reusable, presentational AlertDialog for budget deletion confirmation.

**Props:**

| Prop            | Type                          | Description                          |
| --------------- | ----------------------------- | ------------------------------------ |
| `open`          | `boolean`                     | Controlled open state                |
| `onOpenChange`  | `(open: boolean) => void`     | Close handler                        |
| `budgetName`    | `string`                      | Displayed in the warning message     |
| `onConfirm`     | `() => void`                  | Triggers the delete mutation         |
| `isPending`     | `boolean`                     | Loading state from the mutation      |
| `error`         | `string \| null`              | API error message to display         |

**UI structure:**

- **Title:** "Delete Budget"
- **Description:** "This will permanently delete **{budgetName}** and all its associated transactions. This action cannot be undone."
- **Error:** Displayed below description when non-null, styled with `text-destructive`
- **Cancel button:** Outline variant, closes the dialog
- **Confirm button:** Destructive variant, text "Delete Budget" (or "Deleting..." when pending), disabled when pending

The dialog is purely presentational — the parent component owns the mutation and passes state as props.

### 3. Update `BudgetDetailPage`

**File:** `src/features/budgets/BudgetDetailPage.tsx`

- Remove inline confirmation state (`showDeleteConfirm`, `deleteError`) and the inline `<div>` block (lines ~209-236)
- Replace with controlled `DeleteBudgetDialog` using a single `deleteDialogOpen` boolean state
- The delete button opens the dialog instead of toggling inline confirmation
- On successful deletion, navigate to `/budgets` (unchanged behavior)

### 4. Update `BudgetCard`

**File:** `src/features/budgets/components/BudgetCard.tsx`

- Remove inline confirmation state (`confirmDelete`, `deleteError`) and the inline `<div>` block (lines ~165-196)
- Replace with controlled `DeleteBudgetDialog`
- The dropdown menu "Delete" item opens the dialog instead of toggling inline confirmation
- On successful deletion, parent list re-renders via cache invalidation (unchanged behavior)

### 5. Update Cache Invalidation in `useDeleteBudget`

**File:** `src/features/budgets/hooks/useBudgetMutations.ts`

Add two query invalidations to the `onSuccess` callback:

- `['transactions']` — transactions linked to the deleted budget are cascade-deleted server-side
- `['savings']` — contributions can reference budgets via `budgetId`

**Updated invalidation list:**

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['budgets', 'list'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
  queryClient.invalidateQueries({ queryKey: ['savings'] });
},
```

## Out of Scope

- No changes to the API service layer (`budgetsApi.delete` call is unchanged)
- No changes to other delete confirmations (transactions, savings goals, contributions keep inline pattern)
- No pre-check API call for transaction count
- No changes to budget create/edit flows
