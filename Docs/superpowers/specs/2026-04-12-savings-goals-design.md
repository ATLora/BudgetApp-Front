# Savings Goals Feature — Design Spec

## Overview

Full CRUD Savings Goals feature with a card-grid list page, progress-focused detail page, contribution management, and integration with the existing TransactionFormDialog for linking savings transactions to goals.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Goal status management | Auto-complete when target reached; manual Pause/Resume | User controls pausing; completion is automatic when `currentAmount >= targetAmount` |
| Contribution creation | Dialog on detail page | Consistent with TransactionFormDialog pattern; keeps detail page clean |
| Transaction-to-goal linking | At transaction creation via dropdown | Transaction is source of truth for money movement; backend creates contribution automatically |
| Detail page density | Progress-focused (minimal) | Key stats only: target, saved, remaining, days left. Avoid overwhelming the user |
| List page layout | Card grid | Better visual fit for goals with progress bars; responsive 1/2/3 column grid |
| Architecture | Feature-contained | Everything in `src/features/savings/` except one small TransactionFormDialog modification |

## Components

### SavingsListPage (`src/features/savings/SavingsListPage.tsx`)

Replace existing stub. Layout:

- **Header:** "Savings Goals" title + "New Goal" button (opens SavingsGoalFormDialog in create mode)
- **Summary bar:** 4 stat cards using DashboardSavingsDto — Total Saved, Total Target, Active Goals, Completed Goals
- **Status filter:** dropdown to filter by All / Active / Completed / Paused (client-side filtering)
- **Card grid:** responsive grid — 1 column mobile, 2 columns tablet, 3 columns desktop
- **Empty state:** friendly CTA to create first goal
- **Loading state:** 6 skeleton cards in grid layout
- **Error state:** error message with "Try again" button

### SavingsDetailPage (`src/features/savings/SavingsDetailPage.tsx`)

Replace existing stub. Layout:

- **Back link** to `/savings`
- **Header:** goal name + status badge + Edit button + Delete button
- **Progress section:** large progress bar with percentage, stats row — Target Amount, Saved, Remaining, Days Left (from progress endpoint)
- **Pause/Resume button:** toggles between Active and Paused status
- **Overdue warning:** rose-colored banner if `isOverdue === true`
- **Description:** displayed below progress if present
- **Contributions section:**
  - "Add Contribution" button (opens ContributionFormDialog)
  - Vertical list of contributions from the detail DTO
  - Each contribution shows: amount, date, notes (if any), linked budget name (if any)
  - Delete button on each contribution with inline confirmation
- **Delete goal:** inline danger section at bottom, click to reveal confirmation

### SavingsGoalCard (`src/features/savings/components/SavingsGoalCard.tsx`)

Reusable card for the list grid. Accepts `SavingsGoalSummaryDto`. Displays:

- Goal name
- Progress bar with percentage
- "Saved / Target" amounts (e.g., "$500 / $1,000")
- Status badge (Active=sky, Completed=emerald, Paused=amber)
- Target date (if set)
- Overdue indicator (if applicable, based on targetDate vs today + status)
- Clickable — navigates to `/savings/:id`

### SavingsGoalFormDialog (`src/features/savings/components/SavingsGoalFormDialog.tsx`)

Dialog for creating and editing savings goals. Uses react-hook-form + zod.

Fields:
- **Name** — text input, required
- **Target amount** — number input (step 0.01), required, must be > 0
- **Target date** — date input, optional
- **Description** — textarea, optional

Modes:
- **Create:** empty form, calls `useCreateSavingsGoal`
- **Edit:** pre-filled with `SavingsGoalDetailDto` values, calls `useUpdateSavingsGoal`

### ContributionFormDialog (`src/features/savings/components/ContributionFormDialog.tsx`)

Dialog for adding contributions from the detail page. Uses react-hook-form + zod.

Fields:
- **Amount** — number input (step 0.01), required, must be > 0
- **Date** — date input, required, defaults to today
- **Notes** — textarea, optional
- **Budget** — optional Select dropdown populated with user's budgets

No `transactionId` field — that link is created from the transaction side.

## Hooks

### Query Hooks (`src/features/savings/hooks/`)

- **`useSavingsGoalList()`** — `savingsApi.list()`, queryKey: `['savings', 'list']`, staleTime: 5 min
- **`useSavingsGoalDetail(id: string)`** — `savingsApi.getById(id)`, queryKey: `['savings', 'detail', id]`, staleTime: 5 min, enabled: `!!id`
- **`useSavingsGoalProgress(id: string)`** — `savingsApi.getProgress(id)`, queryKey: `['savings', 'progress', id]`, staleTime: 5 min, enabled: `!!id`

### Mutation Hooks (`src/features/savings/hooks/`)

- **`useCreateSavingsGoal()`** — invalidates `['savings', 'list']`, `['dashboard']`
- **`useUpdateSavingsGoal()`** — invalidates `['savings', 'list']`, `['savings', 'detail', id]`, `['dashboard']`
- **`useDeleteSavingsGoal()`** — invalidates `['savings', 'list']`, `['dashboard']`; navigates to `/savings`
- **`useUpdateSavingsGoalStatus()`** — invalidates `['savings', 'detail', id]`, `['savings', 'list']`, `['savings', 'progress', id]`, `['dashboard']`
- **`useAddContribution()`** — invalidates `['savings', 'detail', id]`, `['savings', 'list']`, `['savings', 'progress', id]`, `['dashboard']`
- **`useDeleteContribution()`** — same invalidation as `useAddContribution`

## TransactionFormDialog Integration

Modify existing `TransactionFormDialog` (`src/features/transactions/components/TransactionFormDialog.tsx`):

- When transaction type is `SavingsDeposit` or `SavingsWithdrawal`, show an optional "Link to savings goal" Select dropdown
- Populate with active savings goals from `useSavingsGoalList()` (filtered to Active status)
- Two-step process on submit (frontend-orchestrated):
  1. Create the transaction via the existing mutation
  2. If a savings goal was selected, create a contribution on that goal via `savingsApi.addContribution()`, passing the new transaction's ID as `transactionId`
- This is necessary because `CreateTransactionRequest` has no `savingsGoalId` field — the link is established via the contribution's `transactionId` field
- If step 1 succeeds but step 2 fails, show an error indicating the transaction was created but the goal link failed, so the user can manually add the contribution

## Color Coding

| Element | Color |
|---------|-------|
| Progress bar (default) | Sky |
| Progress bar (>= 100%) | Emerald |
| Active status badge | Sky |
| Completed status badge | Emerald |
| Paused status badge | Amber |
| Overdue warning | Rose |
| Saved amount text | Sky |
| Remaining amount text | Muted foreground |

## Error Handling

- **List/detail pages:** error message with "Try again" button
- **Form dialogs:** per-field zod validation errors + server error banner at top
- **Mutations:** inline error display
- **Loading:** skeleton cards (list) / skeleton blocks (detail)

## Empty States

- **List page (no goals):** "Create your first savings goal" with CTA button
- **Detail page (no contributions):** "No contributions yet. Add your first one!" with CTA button

## File Structure

```
src/features/savings/
  SavingsListPage.tsx          (replace stub)
  SavingsDetailPage.tsx        (replace stub)
  hooks/
    useSavingsGoalList.ts
    useSavingsGoalDetail.ts
    useSavingsGoalProgress.ts
    useSavingsGoalMutations.ts  (all 6 mutation hooks)
  components/
    SavingsGoalCard.tsx
    SavingsGoalFormDialog.tsx
    ContributionFormDialog.tsx
```

Existing files modified:
- `src/features/transactions/components/TransactionFormDialog.tsx` — add savings goal dropdown
