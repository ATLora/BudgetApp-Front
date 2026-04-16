# Budget Cascade Delete — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the budget deletion UI to use an AlertDialog modal with cascade warning, and invalidate transaction/savings caches after deletion.

**Architecture:** Create a reusable `AlertDialog` UI component built on `@base-ui/react/dialog` (matching existing Dialog pattern), then a `DeleteBudgetDialog` feature component that wraps it. Replace the inline confirmation blocks in BudgetDetailPage and BudgetCard with the new dialog. Update cache invalidation in the delete mutation hook.

**Tech Stack:** React, TypeScript, @base-ui/react, TanStack Query, Tailwind CSS v4

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/ui/alert-dialog.tsx` | Generic AlertDialog UI primitives (modal with destructive intent) |
| Create | `src/features/budgets/components/DeleteBudgetDialog.tsx` | Budget-specific delete confirmation dialog |
| Modify | `src/features/budgets/BudgetDetailPage.tsx` | Replace inline confirm with DeleteBudgetDialog |
| Modify | `src/features/budgets/components/BudgetCard.tsx` | Replace inline confirm with DeleteBudgetDialog |
| Modify | `src/features/budgets/BudgetListPage.tsx` | Move delete mutation ownership, add error/dialog state |
| Modify | `src/features/budgets/hooks/useBudgetMutations.ts` | Add transactions + savings cache invalidation |

---

### Task 1: Create `AlertDialog` UI Component

**Files:**
- Create: `src/components/ui/alert-dialog.tsx`

This builds the generic AlertDialog primitives following the same pattern as the existing `src/components/ui/dialog.tsx` which wraps `@base-ui/react/dialog`. The key difference from Dialog: no close (X) button, no dismiss-on-overlay-click (the user must choose an action), and a footer layout for action buttons.

- [ ] **Step 1: Create `src/components/ui/alert-dialog.tsx`**

```tsx
import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import { cn } from '@/lib/utils';

function AlertDialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        'fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <DialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        '-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn('font-heading text-base leading-none font-medium', className)}
      {...props}
    />
  );
}

function AlertDialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function AlertDialogAction({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="alert-dialog-action" {...props} />;
}

function AlertDialogCancel({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="alert-dialog-cancel" {...props} />;
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `alert-dialog.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/alert-dialog.tsx
git commit -m "feat: add AlertDialog UI component based on @base-ui/react"
```

---

### Task 2: Create `DeleteBudgetDialog` Component

**Files:**
- Create: `src/features/budgets/components/DeleteBudgetDialog.tsx`

A presentational component that wraps AlertDialog with the budget cascade delete warning. The parent owns the mutation — this dialog only receives props for state display and callbacks.

- [ ] **Step 1: Create `src/features/budgets/components/DeleteBudgetDialog.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetName: string;
  onConfirm: () => void;
  isPending: boolean;
  error: string | null;
}

export function DeleteBudgetDialog({
  open,
  onOpenChange,
  budgetName,
  onConfirm,
  isPending,
  error,
}: DeleteBudgetDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Budget</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{budgetName}</strong> and all its
            associated transactions. This action cannot be undone.
          </AlertDialogDescription>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="outline" />} disabled={isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            render={<Button variant="destructive" />}
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? 'Deleting…' : 'Delete Budget'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Key detail: `AlertDialogAction` uses `e.preventDefault()` in `onClick` to prevent the dialog from auto-closing on click (since `AlertDialogAction` wraps `DialogPrimitive.Close`). The dialog stays open during the async mutation and only closes when the parent sets `open` to `false` on success.

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `DeleteBudgetDialog.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/features/budgets/components/DeleteBudgetDialog.tsx
git commit -m "feat: add DeleteBudgetDialog component with cascade warning"
```

---

### Task 3: Update `BudgetDetailPage` — Replace Inline Confirm with Dialog

**Files:**
- Modify: `src/features/budgets/BudgetDetailPage.tsx`

Replace `showDeleteConfirm` + `deleteError` state and the inline `<div>` block (lines 26-27, 198-199, 208-236) with a single `deleteDialogOpen` boolean and the `DeleteBudgetDialog` component.

- [ ] **Step 1: Update imports**

At the top of `BudgetDetailPage.tsx`, add the import for `DeleteBudgetDialog`:

```tsx
import { DeleteBudgetDialog } from './components/DeleteBudgetDialog';
```

- [ ] **Step 2: Replace state variables**

Replace these two state lines:

```tsx
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [deleteError, setDeleteError] = useState<string | null>(null);
```

With:

```tsx
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [deleteError, setDeleteError] = useState<string | null>(null);
```

- [ ] **Step 3: Update `handleDelete` to close dialog on success**

Replace the existing `handleDelete` function:

```tsx
function handleDelete() {
  if (!id) return;
  setDeleteError(null);
  deleteMutation.mutate(id, {
    onSuccess: () => navigate('/budgets'),
    onError: (err) => {
      setDeleteError(
        axios.isAxiosError(err)
          ? err.response?.data?.detail || err.response?.data?.title || err.message
          : 'Failed to delete budget.',
      );
    },
  });
}
```

No change needed here — `navigate('/budgets')` on success unmounts the page, which implicitly closes the dialog. The error stays displayed in the dialog via the `error` prop.

- [ ] **Step 4: Update the Delete button to open the dialog**

Replace the Delete button's `onClick`:

```tsx
onClick={() => {
  setShowDeleteConfirm(true);
  setDeleteError(null);
}}
```

With:

```tsx
onClick={() => {
  setDeleteDialogOpen(true);
  setDeleteError(null);
}}
```

- [ ] **Step 5: Replace inline confirmation block with `DeleteBudgetDialog`**

Remove the entire inline confirmation block (the `{/* Delete confirm inline */}` comment and the `{showDeleteConfirm && (...)}` block, lines 208-236).

In its place (or at the end of the JSX, before the closing `</div>`), add:

```tsx
<DeleteBudgetDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  budgetName={budget.name}
  onConfirm={handleDelete}
  isPending={deleteMutation.isPending}
  error={deleteError}
/>
```

- [ ] **Step 6: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/features/budgets/BudgetDetailPage.tsx
git commit -m "refactor: use DeleteBudgetDialog in BudgetDetailPage"
```

---

### Task 4: Update `BudgetCard` and `BudgetListPage` — Replace Inline Confirm with Dialog

**Files:**
- Modify: `src/features/budgets/components/BudgetCard.tsx`
- Modify: `src/features/budgets/BudgetListPage.tsx`

Currently, BudgetCard owns inline confirmation state (`confirmDelete`, `deleteError`) and calls `onDelete(budget.id)` directly. The parent `BudgetListPage` owns the mutation in `handleDelete`.

With the dialog approach, we need to lift the dialog to `BudgetListPage` (since the dialog is a modal that shouldn't live inside a card). The flow becomes:

1. BudgetCard dropdown "Delete" calls a new callback `onDeleteRequest(budget)` passing the full budget object (we need `budget.name` for the dialog)
2. BudgetListPage opens the `DeleteBudgetDialog` with the selected budget's info
3. BudgetListPage owns the mutation, error state, and dialog state

- [ ] **Step 1: Simplify `BudgetCard` — remove inline confirmation**

Replace the full content of `src/features/budgets/components/BudgetCard.tsx`:

The changes are:
- Remove `useState` import (no longer needed)
- Remove `confirmDelete`, `deleteError` state
- Remove `handleDelete` function
- Rename prop `onDelete` to `onDeleteRequest` and change type from `(id: string) => void` to `(budget: BudgetSummaryDto) => void`
- Remove `isDeleting` prop (no longer needed — card doesn't show loading state)
- Remove the entire inline delete confirm block (lines 164-196)
- Update the DropdownMenuItem for Delete to call `onDeleteRequest(budget)` instead of toggling state

Updated interface:

```tsx
interface BudgetCardProps {
  budget: BudgetSummaryDto;
  onEdit: (budget: BudgetSummaryDto) => void;
  onDeleteRequest: (budget: BudgetSummaryDto) => void;
  onRollForward: (id: string) => void;
  isRollingForward: boolean;
}
```

Updated component signature:

```tsx
export function BudgetCard({
  budget,
  onEdit,
  onDeleteRequest,
  onRollForward,
  isRollingForward,
}: BudgetCardProps) {
  const navigate = useNavigate();
```

Remove the `useState` import if it's no longer used. Remove the `confirmDelete`, `deleteError` state lines, and the `handleDelete` function.

Update the Delete dropdown menu item:

```tsx
<DropdownMenuItem
  className="text-destructive focus:text-destructive"
  onClick={() => onDeleteRequest(budget)}
>
  <Trash2 className="mr-2 h-3.5 w-3.5" />
  Delete
</DropdownMenuItem>
```

Remove the entire `{/* Inline delete confirm */}` block (lines 164-196).

- [ ] **Step 2: Update `BudgetListPage` — add dialog state and render `DeleteBudgetDialog`**

In `src/features/budgets/BudgetListPage.tsx`:

Add the import:

```tsx
import { DeleteBudgetDialog } from './components/DeleteBudgetDialog';
```

Replace the `deletingId` state with dialog-oriented state:

```tsx
// Remove this:
const [deletingId, setDeletingId] = useState<string | null>(null);

// Add these:
const [deleteTarget, setDeleteTarget] = useState<BudgetSummaryDto | null>(null);
const [deleteError, setDeleteError] = useState<string | null>(null);
```

Replace the `handleDelete` function:

```tsx
function handleDeleteRequest(budget: BudgetSummaryDto) {
  setDeleteTarget(budget);
  setDeleteError(null);
}

function handleDeleteConfirm() {
  if (!deleteTarget) return;
  setDeleteError(null);
  deleteMutation.mutate(deleteTarget.id, {
    onSuccess: () => setDeleteTarget(null),
    onError: (err) => {
      setDeleteError(
        axios.isAxiosError(err)
          ? err.response?.data?.detail || err.response?.data?.title || err.message
          : 'Failed to delete budget.',
      );
    },
  });
}
```

Update the `BudgetCard` usage in the JSX — replace:

```tsx
<BudgetCard
  key={budget.id}
  budget={budget}
  onEdit={openEdit}
  onDelete={handleDelete}
  onRollForward={handleRollForward}
  isRollingForward={rollingForwardId === budget.id}
  isDeleting={deletingId === budget.id}
/>
```

With:

```tsx
<BudgetCard
  key={budget.id}
  budget={budget}
  onEdit={openEdit}
  onDeleteRequest={handleDeleteRequest}
  onRollForward={handleRollForward}
  isRollingForward={rollingForwardId === budget.id}
/>
```

Add `DeleteBudgetDialog` at the end of the JSX, alongside `BudgetFormSheet`:

```tsx
<DeleteBudgetDialog
  open={deleteTarget !== null}
  onOpenChange={(open) => {
    if (!open) {
      setDeleteTarget(null);
      setDeleteError(null);
    }
  }}
  budgetName={deleteTarget?.name ?? ''}
  onConfirm={handleDeleteConfirm}
  isPending={deleteMutation.isPending}
  error={deleteError}
/>
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/features/budgets/components/BudgetCard.tsx src/features/budgets/BudgetListPage.tsx
git commit -m "refactor: use DeleteBudgetDialog in BudgetListPage and BudgetCard"
```

---

### Task 5: Update Cache Invalidation in `useDeleteBudget`

**Files:**
- Modify: `src/features/budgets/hooks/useBudgetMutations.ts`

- [ ] **Step 1: Add transaction and savings cache invalidation**

In `src/features/budgets/hooks/useBudgetMutations.ts`, update the `useDeleteBudget` function's `onSuccess` callback.

Replace:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['budgets', 'list'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
},
```

With:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['budgets', 'list'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
  queryClient.invalidateQueries({ queryKey: ['savings'] });
},
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/budgets/hooks/useBudgetMutations.ts
git commit -m "fix: invalidate transactions and savings cache on budget cascade delete"
```

---

### Task 6: Manual Smoke Test

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Test BudgetDetailPage delete flow**

1. Navigate to a budget detail page
2. Click the "Delete" button in the top-right action bar
3. Verify the AlertDialog modal appears with:
   - Title: "Delete Budget"
   - Description mentioning the budget name and "all its associated transactions"
   - Cancel and "Delete Budget" buttons
4. Click Cancel — verify the dialog closes
5. Click Delete again, then click "Delete Budget" — verify the budget is deleted and you're navigated to `/budgets`

- [ ] **Step 3: Test BudgetListPage delete flow**

1. Navigate to the budgets list
2. Click the three-dot menu on a budget card
3. Click "Delete"
4. Verify the same AlertDialog appears with the correct budget name
5. Click Cancel — verify it closes
6. Repeat and confirm — verify deletion works and the card disappears from the list

- [ ] **Step 4: Verify no stale transaction data**

1. Before deleting, navigate to the transactions page and note existing transactions
2. Go back and delete a budget that has transactions
3. Navigate to transactions — verify the cascade-deleted transactions are gone (not showing stale cached data)
