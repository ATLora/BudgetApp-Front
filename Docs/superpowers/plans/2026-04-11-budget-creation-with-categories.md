# Budget Creation with Categories — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework budget creation so the user builds income/expense categories with planned amounts inline — totals auto-calculate and are sent to the API per category, not as manual inputs.

**Architecture:** The `BudgetFormSheet` grows to include a `BudgetCategoryBuilder` section in create mode. Category state is managed locally alongside the react-hook-form fields. A dedicated `useCreateBudgetWithCategories` hook sequences the API calls: create budget → batch-add categories. New categories can be created on the fly via `NewCategoryInlineForm`, which calls the categories API immediately and invalidates the cache.

**Tech Stack:** React 18, TypeScript, react-hook-form + zod, TanStack Query v5, Axios, shadcn/base-ui components (`Select`, `Button`, `Input`, `Label`, `Badge`), Tailwind v4.

> **Note:** This project has no test infrastructure. Each task uses `npx tsc --noEmit` for type-checking and browser verification as the acceptance gate instead of unit tests.

---

## File Map

| Status | File | Role |
|--------|------|------|
| **Modify** | `src/types/api.ts` | Remove planned totals from `CreateBudgetRequest` / `UpdateBudgetRequest` |
| **Create** | `src/features/budgets/types.ts` | `PendingBudgetCategory` frontend-only type |
| **Create** | `src/features/categories/components/CategorySelect.tsx` | Reusable category picker with "Create new" sentinel |
| **Create** | `src/features/categories/components/NewCategoryInlineForm.tsx` | Inline form for creating a category on the fly |
| **Create** | `src/features/budgets/components/BudgetCategoryRow.tsx` | Single row: locked category display + amount + notes + remove |
| **Create** | `src/features/budgets/components/BudgetCategoryBuilder.tsx` | Manages `PendingBudgetCategory[]` + live totals |
| **Modify** | `src/features/budgets/hooks/useBudgetMutations.ts` | Add `useCreateBudgetWithCategories` |
| **Modify** | `src/features/budgets/components/BudgetFormSheet.tsx` | Remove totals fields, add `mode` prop + `BudgetCategoryBuilder` |
| **Modify** | `src/features/budgets/BudgetListPage.tsx` | Wire up new hook + `pendingCategories` state |

---

## Task 1: Update API Types

**Files:**
- Modify: `src/types/api.ts:188-208`

- [ ] **Step 1: Remove planned totals from `CreateBudgetRequest` and `UpdateBudgetRequest`**

In `src/types/api.ts`, replace the two interfaces (lines 188–208) with:

```ts
export interface CreateBudgetRequest {
  name: string;
  startDate: string;
  endDate: string;
  budgetType: BudgetType;
  isRecurring: boolean;
}

export interface UpdateBudgetRequest {
  name: string;
  startDate: string;
  endDate: string;
  budgetType: BudgetType;
  isRecurring: boolean;
}
```

- [ ] **Step 2: Type-check to see what breaks**

```bash
cd "D:/Personal Project/BudgetApp/BudgetApp-Front" && npx tsc --noEmit 2>&1 | head -60
```

Expected: TypeScript errors pointing to `BudgetFormSheet.tsx` (uses `totalIncomePlanned` etc. in schema/JSX) and `BudgetListPage.tsx` (passes those fields in `editDefaultValues`). Those are addressed in Tasks 8 and 9.

- [ ] **Step 3: Commit**

```bash
cd "D:/Personal Project/BudgetApp/BudgetApp-Front"
git add src/types/api.ts
git commit -m "feat: remove planned totals from CreateBudgetRequest and UpdateBudgetRequest"
```

---

## Task 2: Create `PendingBudgetCategory` Type

**Files:**
- Create: `src/features/budgets/types.ts`

- [ ] **Step 1: Create the file**

```ts
// src/features/budgets/types.ts
import type { CategoryDto } from '@/types/api';

/**
 * A budget category row that has been built up in the create-budget form
 * but not yet persisted. `category` is null until the user picks one.
 */
export interface PendingBudgetCategory {
  key: string;               // client-only uuid (crypto.randomUUID())
  category: CategoryDto | null;  // null until the user selects or creates
  plannedAmount: number;
  notes: string;
}
```

- [ ] **Step 2: Type-check**

```bash
cd "D:/Personal Project/BudgetApp/BudgetApp-Front" && npx tsc --noEmit 2>&1 | head -20
```

Expected: same errors as before (none new from this file).

- [ ] **Step 3: Commit**

```bash
git add src/features/budgets/types.ts
git commit -m "feat: add PendingBudgetCategory frontend type"
```

---

## Task 3: Build `CategorySelect`

**Files:**
- Create: `src/features/categories/components/CategorySelect.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/features/categories/components/CategorySelect.tsx
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categoriesApi } from '@/services/api/categories';
import type { CategoryDto, CategoryType } from '@/types/api';

interface CategorySelectProps {
  /** Currently selected category id, or null if nothing selected. */
  value: string | null;
  /** Called when the user picks an existing category. */
  onSelect: (cat: CategoryDto) => void;
  /** Called when the user picks the "Create new category" option. */
  onCreateRequest: () => void;
  /** Optionally restrict which category types are shown. */
  filterType?: CategoryType;
  /** Category ids already used in other rows — excluded from the list. */
  excludeIds?: string[];
  disabled?: boolean;
  placeholder?: string;
}

export function CategorySelect({
  value,
  onSelect,
  onCreateRequest,
  filterType,
  excludeIds = [],
  disabled = false,
  placeholder = 'Select a category',
}: CategorySelectProps) {
  const { data: allCategories = [], isLoading } = useQuery({
    queryKey: ['categories', 'list'],
    queryFn: () => categoriesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const available = allCategories.filter(
    (c) =>
      (!filterType || c.categoryType === filterType) &&
      !excludeIds.includes(c.id),
  );

  function handleChange(val: string) {
    if (val === '__create_new__') {
      onCreateRequest();
      return; // do NOT update value — leave the select at its current display
    }
    const cat = available.find((c) => c.id === val);
    if (cat) onSelect(cat);
  }

  return (
    <Select
      value={value ?? ''}
      onValueChange={handleChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full" aria-label="Select category">
        <SelectValue placeholder={isLoading ? 'Loading…' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {available.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            {cat.name}
          </SelectItem>
        ))}
        <SelectSeparator />
        <SelectItem value="__create_new__">+ Create new category</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd "D:/Personal Project/BudgetApp/BudgetApp-Front" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/features/categories/components/CategorySelect.tsx
git commit -m "feat: add reusable CategorySelect component with create-new sentinel"
```

---

## Task 4: Build `NewCategoryInlineForm`

**Files:**
- Create: `src/features/categories/components/NewCategoryInlineForm.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/features/categories/components/NewCategoryInlineForm.tsx
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categoriesApi } from '@/services/api/categories';
import { CategoryType } from '@/types/api';
import type { CategoryDto } from '@/types/api';

interface NewCategoryInlineFormProps {
  /** Called with the fully-resolved CategoryDto after the API call succeeds. */
  onCreated: (cat: CategoryDto) => void;
  onCancel: () => void;
}

export function NewCategoryInlineForm({ onCreated, onCancel }: NewCategoryInlineFormProps) {
  const [name, setName] = useState('');
  const [categoryType, setCategoryType] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const isValid = name.trim().length > 0 && categoryType !== '';

  async function handleConfirm() {
    if (!isValid) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // create() returns the new category's UUID
      const id = await categoriesApi.create({
        name: name.trim(),
        categoryType: categoryType as CategoryDto['categoryType'],
        icon: null,
        color: null,
      });
      const created = await categoriesApi.getById(id);
      // keep the categories list fresh so CategorySelect shows the new item
      queryClient.invalidateQueries({ queryKey: ['categories', 'list'] });
      onCreated(created);
    } catch {
      setError('Failed to create category. Try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        New category
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="new-cat-name" className="text-xs">
          Name
        </Label>
        <Input
          id="new-cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Housing"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleConfirm();
            }
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Type</Label>
        <Select value={categoryType} onValueChange={setCategoryType}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CategoryType.Income}>Income</SelectItem>
            <SelectItem value={CategoryType.Expense}>Expense</SelectItem>
            <SelectItem value={CategoryType.Savings}>Savings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!isValid || isSubmitting}
          onClick={handleConfirm}
        >
          {isSubmitting ? 'Creating…' : 'Create'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd "D:/Personal Project/BudgetApp/BudgetApp-Front" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/categories/components/NewCategoryInlineForm.tsx
git commit -m "feat: add NewCategoryInlineForm for on-the-fly category creation"
```

---

## Task 5: Build `BudgetCategoryRow`

**Files:**
- Create: `src/features/budgets/components/BudgetCategoryRow.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/features/budgets/components/BudgetCategoryRow.tsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CategorySelect } from '@/features/categories/components/CategorySelect';
import { NewCategoryInlineForm } from '@/features/categories/components/NewCategoryInlineForm';
import type { CategoryDto } from '@/types/api';
import type { PendingBudgetCategory } from '../types';

interface BudgetCategoryRowProps {
  row: PendingBudgetCategory;
  /** IDs already used in other rows — passed to CategorySelect to prevent duplicates. */
  excludeIds: string[];
  onUpdate: (key: string, changes: Partial<Omit<PendingBudgetCategory, 'key'>>) => void;
  onRemove: (key: string) => void;
}

// Map category type to badge variant
const TYPE_VARIANT = {
  Income: 'default',
  Expense: 'secondary',
  Savings: 'outline',
} as const;

export function BudgetCategoryRow({ row, excludeIds, onUpdate, onRemove }: BudgetCategoryRowProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  function handleSelectCategory(cat: CategoryDto) {
    onUpdate(row.key, { category: cat });
    setShowCreateForm(false);
  }

  function handleCreated(cat: CategoryDto) {
    onUpdate(row.key, { category: cat });
    setShowCreateForm(false);
  }

  const hasCategory = row.category !== null;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2.5">
      {/* Top row: category info / picker + remove button */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {hasCategory ? (
            // Category is locked — show badge + name
            <div className="flex items-center gap-2 h-8">
              <Badge variant={TYPE_VARIANT[row.category!.categoryType] ?? 'outline'}>
                {row.category!.categoryType}
              </Badge>
              <span className="text-sm font-medium truncate">{row.category!.name}</span>
            </div>
          ) : showCreateForm ? (
            <NewCategoryInlineForm
              onCreated={handleCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          ) : (
            <CategorySelect
              value={null}
              onSelect={handleSelectCategory}
              onCreateRequest={() => setShowCreateForm(true)}
              excludeIds={excludeIds}
            />
          )}
        </div>

        {/* Remove button — always visible */}
        {!showCreateForm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(row.key)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Amount + Notes — only when category is locked */}
      {hasCategory && (
        <>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Planned amount"
            value={row.plannedAmount > 0 ? row.plannedAmount : ''}
            onChange={(e) =>
              onUpdate(row.key, { plannedAmount: parseFloat(e.target.value) || 0 })
            }
          />
          <textarea
            rows={2}
            placeholder="Notes (optional)"
            value={row.notes}
            onChange={(e) => onUpdate(row.key, { notes: e.target.value })}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd "D:/Personal Project/BudgetApp/BudgetApp-Front" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/budgets/components/BudgetCategoryRow.tsx
git commit -m "feat: add BudgetCategoryRow component"
```

---

## Task 6: Build `BudgetCategoryBuilder`

**Files:**
- Create: `src/features/budgets/components/BudgetCategoryBuilder.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/features/budgets/components/BudgetCategoryBuilder.tsx
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { BudgetCategoryRow } from './BudgetCategoryRow';
import type { PendingBudgetCategory } from '../types';

interface BudgetCategoryBuilderProps {
  /** Called every time the category list changes, so the parent can track state. */
  onChange: (cats: PendingBudgetCategory[]) => void;
}

export function BudgetCategoryBuilder({ onChange }: BudgetCategoryBuilderProps) {
  const [categories, setCategories] = useState<PendingBudgetCategory[]>([]);

  function update(next: PendingBudgetCategory[]) {
    setCategories(next);
    onChange(next);
  }

  function addRow() {
    update([
      ...categories,
      { key: crypto.randomUUID(), category: null, plannedAmount: 0, notes: '' },
    ]);
  }

  function handleUpdate(key: string, changes: Partial<Omit<PendingBudgetCategory, 'key'>>) {
    update(categories.map((c) => (c.key === key ? { ...c, ...changes } : c)));
  }

  function handleRemove(key: string) {
    update(categories.filter((c) => c.key !== key));
  }

  // IDs of categories that have been selected (to exclude from other rows)
  const selectedIds = categories
    .filter((c) => c.category !== null)
    .map((c) => c.category!.id);

  // Live totals — only rows with a selected category count
  const incomePlanned = categories
    .filter((c) => c.category?.categoryType === 'Income')
    .reduce((sum, c) => sum + c.plannedAmount, 0);

  const expensesPlanned = categories
    .filter((c) => c.category?.categoryType === 'Expense')
    .reduce((sum, c) => sum + c.plannedAmount, 0);

  const savingsPlanned = categories
    .filter((c) => c.category?.categoryType === 'Savings')
    .reduce((sum, c) => sum + c.plannedAmount, 0);

  const hasTotals = incomePlanned > 0 || expensesPlanned > 0 || savingsPlanned > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Categories</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          className="h-7 gap-1 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add category
        </Button>
      </div>

      {categories.length > 0 && (
        <div className="space-y-2">
          {categories.map((row) => (
            <BudgetCategoryRow
              key={row.key}
              row={row}
              // pass all selected IDs except this row's own category
              excludeIds={selectedIds.filter((id) => id !== row.category?.id)}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {hasTotals && (
        <div className="rounded-lg bg-muted/50 px-3 py-2 space-y-1 text-sm">
          {incomePlanned > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Income planned</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatCurrency(incomePlanned)}
              </span>
            </div>
          )}
          {expensesPlanned > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expenses planned</span>
              <span className="font-medium">{formatCurrency(expensesPlanned)}</span>
            </div>
          )}
          {savingsPlanned > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Savings planned</span>
              <span className="font-medium">{formatCurrency(savingsPlanned)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd "D:/Personal Project/BudgetApp/BudgetApp-Front" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors from these new files. Still the existing errors in `BudgetFormSheet.tsx` and `BudgetListPage.tsx` from Task 1.

- [ ] **Step 3: Commit**

```bash
git add src/features/budgets/components/BudgetCategoryBuilder.tsx
git commit -m "feat: add BudgetCategoryBuilder with live planned-total summary"
```

---

## Task 7: Add `useCreateBudgetWithCategories` Hook

**Files:**
- Modify: `src/features/budgets/hooks/useBudgetMutations.ts`

- [ ] **Step 1: Add the import and new hook**

Add this import at the top of `useBudgetMutations.ts`:

```ts
import type { PendingBudgetCategory } from '../types';
```

Then append the following hook at the bottom of the file (after `useRollForwardBudget`):

```ts
interface CreateBudgetWithCategoriesInput {
  budgetData: CreateBudgetRequest;
  categories: PendingBudgetCategory[];
}

export function useCreateBudgetWithCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ budgetData, categories }: CreateBudgetWithCategoriesInput) => {
      // Step 1: create the budget — backend calculates totals from categories
      const budgetId = await budgetsApi.create(budgetData);

      // Step 2: add all pending categories that have a category selected
      const committed = categories.filter((c) => c.category !== null);
      await Promise.all(
        committed.map((c) =>
          budgetsApi.addCategory(budgetId, {
            categoryId: c.category!.id,
            plannedAmount: c.plannedAmount,
            notes: c.notes || null,
          }),
        ),
      );

      return budgetId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
```

The full file after edits:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi } from '@/services/api/budgets';
import type { CreateBudgetRequest, UpdateBudgetRequest } from '@/types/api';
import type { PendingBudgetCategory } from '../types';

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBudgetRequest) => budgetsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBudgetRequest }) =>
      budgetsApi.update(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => budgetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRollForwardBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => budgetsApi.rollForward(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

interface CreateBudgetWithCategoriesInput {
  budgetData: CreateBudgetRequest;
  categories: PendingBudgetCategory[];
}

export function useCreateBudgetWithCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ budgetData, categories }: CreateBudgetWithCategoriesInput) => {
      const budgetId = await budgetsApi.create(budgetData);
      const committed = categories.filter((c) => c.category !== null);
      await Promise.all(
        committed.map((c) =>
          budgetsApi.addCategory(budgetId, {
            categoryId: c.category!.id,
            plannedAmount: c.plannedAmount,
            notes: c.notes || null,
          }),
        ),
      );
      return budgetId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
```

- [ ] **Step 2: Type-check**

```bash
cd "D:/Personal Project/BudgetApp/BudgetApp-Front" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/features/budgets/hooks/useBudgetMutations.ts
git commit -m "feat: add useCreateBudgetWithCategories orchestration hook"
```

---

## Task 8: Rework `BudgetFormSheet`

**Files:**
- Modify: `src/features/budgets/components/BudgetFormSheet.tsx`

This task removes the three planned-total fields and adds the `BudgetCategoryBuilder` in create mode.

- [ ] **Step 1: Replace the entire file with the updated version**

```tsx
// src/features/budgets/components/BudgetFormSheet.tsx
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BudgetType } from '@/types/api';
import { BudgetCategoryBuilder } from './BudgetCategoryBuilder';
import type { PendingBudgetCategory } from '../types';

const budgetSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(200, 'Max 200 characters'),
    budgetType: z.enum(['Monthly', 'Weekly', 'Biweekly', 'Quarterly', 'Annual', 'Custom'] as const),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    isRecurring: z.boolean(),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate > d.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export type BudgetFormData = z.infer<typeof budgetSchema>;

function toDateInputStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function defaultStartDate(): string {
  const d = new Date();
  return toDateInputStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

function defaultEndDate(): string {
  const d = new Date();
  return toDateInputStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

const DEFAULT_VALUES: BudgetFormData = {
  name: '',
  budgetType: BudgetType.Monthly,
  startDate: defaultStartDate(),
  endDate: defaultEndDate(),
  isRecurring: true,
};

interface BudgetFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  defaultValues?: Partial<BudgetFormData>;
  onSubmit: (data: BudgetFormData) => void;
  isSubmitting: boolean;
  serverError?: string | null;
  /** 'create' shows the category builder; 'edit' hides it. Defaults to 'edit'. */
  mode?: 'create' | 'edit';
  /** Called whenever the pending categories change (create mode only). */
  onCategoriesChange?: (cats: PendingBudgetCategory[]) => void;
}

export function BudgetFormSheet({
  open,
  onOpenChange,
  title,
  submitLabel,
  defaultValues,
  onSubmit,
  isSubmitting,
  serverError,
  mode = 'edit',
  onCategoriesChange,
}: BudgetFormSheetProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  // Incrementing this key forces BudgetCategoryBuilder to remount (and reset)
  // each time the sheet opens in create mode.
  const [builderKey, setBuilderKey] = useState(0);

  useEffect(() => {
    if (open) {
      reset({ ...DEFAULT_VALUES, ...defaultValues });
      if (mode === 'create') setBuilderKey((k) => k + 1);
    }
  }, [open, defaultValues, reset, mode]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <form
          id="budget-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-4 pb-2"
        >
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="budget-name">Name</Label>
              <Input
                id="budget-name"
                placeholder="e.g. April 2026"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Budget Type */}
            <div className="space-y-1.5">
              <Label>Budget Type</Label>
              <Controller
                control={control}
                name="budgetType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={BudgetType.Monthly}>Monthly</SelectItem>
                      <SelectItem value={BudgetType.Weekly}>Weekly</SelectItem>
                      <SelectItem value={BudgetType.Biweekly}>Biweekly</SelectItem>
                      <SelectItem value={BudgetType.Quarterly}>Quarterly</SelectItem>
                      <SelectItem value={BudgetType.Annual}>Annual</SelectItem>
                      <SelectItem value={BudgetType.Custom}>Custom</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.budgetType && (
                <p className="text-xs text-destructive">{errors.budgetType.message}</p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  aria-invalid={!!errors.startDate}
                  {...register('startDate')}
                />
                {errors.startDate && (
                  <p className="text-xs text-destructive">{errors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  aria-invalid={!!errors.endDate}
                  {...register('endDate')}
                />
                {errors.endDate && (
                  <p className="text-xs text-destructive">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            {/* Recurring toggle */}
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Repeat automatically</p>
                <p className="text-xs text-muted-foreground">
                  Enables rolling this budget forward to the next period
                </p>
              </div>
              <input
                id="is-recurring"
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-primary"
                {...register('isRecurring')}
              />
            </div>

            {/* Category builder — create mode only */}
            {mode === 'create' && (
              <>
                <div className="border-t pt-4">
                  <BudgetCategoryBuilder
                    key={builderKey}
                    onChange={onCategoriesChange ?? (() => {})}
                  />
                </div>
              </>
            )}

            {serverError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </p>
            )}
          </div>
        </form>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="budget-form" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : submitLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd "D:/Personal Project/BudgetApp/BudgetApp-Front" && npx tsc --noEmit 2>&1 | head -40
```

Expected: errors only in `BudgetListPage.tsx` (still passes `totalIncomePlanned` etc. in `editDefaultValues`). No errors in `BudgetFormSheet.tsx` itself.

- [ ] **Step 3: Commit**

```bash
git add src/features/budgets/components/BudgetFormSheet.tsx
git commit -m "feat: rework BudgetFormSheet — remove planned totals, add category builder in create mode"
```

---

## Task 9: Wire Up `BudgetListPage`

**Files:**
- Modify: `src/features/budgets/BudgetListPage.tsx`

- [ ] **Step 1: Replace the entire file with the updated version**

```tsx
// src/features/budgets/BudgetListPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BudgetType } from '@/types/api';
import type { BudgetSummaryDto, BudgetType as BudgetTypeValue } from '@/types/api';
import { useBudgetList } from './hooks/useBudgetList';
import {
  useCreateBudgetWithCategories,
  useUpdateBudget,
  useDeleteBudget,
  useRollForwardBudget,
} from './hooks/useBudgetMutations';
import { BudgetCard } from './components/BudgetCard';
import { BudgetListSkeleton } from './components/BudgetListSkeleton';
import { BudgetFormSheet } from './components/BudgetFormSheet';
import type { BudgetFormData } from './components/BudgetFormSheet';
import type { PendingBudgetCategory } from './types';

export function BudgetListPage() {
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState<BudgetTypeValue | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<BudgetSummaryDto | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingCategories, setPendingCategories] = useState<PendingBudgetCategory[]>([]);
  const [rollingForwardId, setRollingForwardId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const listQuery = useBudgetList(filterType ? { budgetType: filterType } : undefined);
  const createWithCategories = useCreateBudgetWithCategories();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();
  const rollForwardMutation = useRollForwardBudget();

  const budgets = listQuery.data ?? [];

  function openCreate() {
    setEditTarget(undefined);
    setFormMode('create');
    setFormError(null);
    setPendingCategories([]);
    setFormOpen(true);
  }

  function openEdit(budget: BudgetSummaryDto) {
    setEditTarget(budget);
    setFormMode('edit');
    setFormError(null);
    setFormOpen(true);
  }

  function handleFormSubmit(data: BudgetFormData) {
    setFormError(null);
    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, data },
        {
          onSuccess: () => setFormOpen(false),
          onError: (err) => {
            setFormError(
              axios.isAxiosError(err)
                ? err.response?.data?.detail || err.response?.data?.title || err.message
                : 'Failed to update budget.',
            );
          },
        },
      );
    } else {
      createWithCategories.mutate(
        { budgetData: data, categories: pendingCategories },
        {
          onSuccess: () => setFormOpen(false),
          onError: (err) => {
            setFormError(
              axios.isAxiosError(err)
                ? err.response?.data?.detail || err.response?.data?.title || err.message
                : 'Failed to create budget.',
            );
          },
        },
      );
    }
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    deleteMutation.mutate(id, {
      onSettled: () => setDeletingId(null),
    });
  }

  function handleRollForward(id: string) {
    setRollingForwardId(id);
    rollForwardMutation.mutate(id, {
      onSuccess: (newId) => navigate(`/budgets/${newId}`),
      onSettled: () => setRollingForwardId(null),
    });
  }

  // Edit form only needs the basic fields (no planned totals)
  const editDefaultValues: Partial<BudgetFormData> | undefined = editTarget
    ? {
        name: editTarget.name,
        budgetType: editTarget.budgetType,
        startDate: editTarget.startDate,
        endDate: editTarget.endDate,
        isRecurring: editTarget.isRecurring,
      }
    : undefined;

  const isSubmitting = createWithCategories.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Budgets</h1>
          <p className="text-sm text-muted-foreground">Manage and track your budgets</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Budget
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          value={filterType ?? 'all'}
          onValueChange={(v) =>
            setFilterType(v === 'all' ? undefined : (v as BudgetTypeValue))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value={BudgetType.Monthly}>Monthly</SelectItem>
            <SelectItem value={BudgetType.Weekly}>Weekly</SelectItem>
            <SelectItem value={BudgetType.Biweekly}>Biweekly</SelectItem>
            <SelectItem value={BudgetType.Quarterly}>Quarterly</SelectItem>
            <SelectItem value={BudgetType.Annual}>Annual</SelectItem>
            <SelectItem value={BudgetType.Custom}>Custom</SelectItem>
          </SelectContent>
        </Select>
        {listQuery.data && (
          <p className="text-sm text-muted-foreground">
            {budgets.length} {budgets.length === 1 ? 'budget' : 'budgets'}
          </p>
        )}
      </div>

      {/* Content */}
      {listQuery.isLoading && <BudgetListSkeleton />}

      {listQuery.isError && (
        <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4 shadow-sm text-sm">
          <p className="text-muted-foreground">Could not load budgets.</p>
          <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!listQuery.isLoading && !listQuery.isError && budgets.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card py-12 text-center shadow-sm">
          <LayoutDashboard className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">No budgets yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first budget to start tracking your finances.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Budget
          </Button>
        </div>
      )}

      {!listQuery.isLoading && !listQuery.isError && budgets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={openEdit}
              onDelete={handleDelete}
              onRollForward={handleRollForward}
              isRollingForward={rollingForwardId === budget.id}
              isDeleting={deletingId === budget.id}
            />
          ))}
        </div>
      )}

      <BudgetFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editTarget ? 'Edit Budget' : 'New Budget'}
        submitLabel={editTarget ? 'Save Changes' : 'Create Budget'}
        defaultValues={editDefaultValues}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        serverError={formError}
        mode={formMode}
        onCategoriesChange={setPendingCategories}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check — expect zero errors**

```bash
cd "D:/Personal Project/BudgetApp/BudgetApp-Front" && npx tsc --noEmit 2>&1
```

Expected: **no output** (zero TypeScript errors). If errors remain, read them carefully and fix before committing.

- [ ] **Step 3: Commit**

```bash
git add src/features/budgets/BudgetListPage.tsx
git commit -m "feat: wire up budget creation with inline category builder"
```

---

## Task 10: Browser Verification

- [ ] **Step 1: Start the dev server**

```bash
cd "D:/Personal Project/BudgetApp/BudgetApp-Front" && npm run dev
```

- [ ] **Step 2: Verify create flow — happy path**

1. Navigate to Budgets page.
2. Click **New Budget** — the sheet should open WITHOUT the three planned-total number inputs.
3. Fill in Name, Budget Type, Start/End Date.
4. Click **Add category** — a row appears with a category dropdown.
5. Select an existing category from the dropdown — the row locks and shows the category name + type badge.
6. An amount input and notes field appear. Enter a planned amount.
7. Add a second category of a different type.
8. Verify the totals summary at the bottom updates live as you change amounts.
9. Click **Create Budget** — the sheet closes, the new budget appears in the list.
10. Click into the budget — verify the categories and their planned amounts appear on the detail page.
11. Verify `totalIncomePlanned` / `totalExpensesPlanned` on the budget card/detail reflect the category sums.

- [ ] **Step 3: Verify create-new-category flow**

1. Open **New Budget**, click **Add category**.
2. In the dropdown, pick **+ Create new category** — the `NewCategoryInlineForm` appears.
3. Type a name (e.g. "Side Income"), select type **Income**, click **Create**.
4. The form disappears; the row locks with the new category.
5. Enter a planned amount and click **Create Budget**.
6. The budget is created; the new category is now available in future rows.

- [ ] **Step 4: Verify edit flow is unchanged**

1. Click **Edit** on an existing budget.
2. The sheet opens with only: Name, Budget Type, Start/End Date, Recurring.
3. No category builder visible.
4. Save — budget details update; categories on the detail page are unaffected.

- [ ] **Step 5: Commit any fixes found during verification**

If any issues were found and fixed in the above steps, commit them:

```bash
git add -p
git commit -m "fix: address issues found during browser verification"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All spec sections have corresponding tasks (types ✓, CategorySelect ✓, NewCategoryInlineForm ✓, BudgetCategoryRow ✓, BudgetCategoryBuilder ✓, hook ✓, form rework ✓, page wiring ✓)
- [x] **No placeholders:** All steps contain complete code
- [x] **Type consistency:** `PendingBudgetCategory` defined in Task 2, imported in Tasks 5, 6, 7, 8, 9 — all use `category: CategoryDto | null`, `plannedAmount: number`, `notes: string`, `key: string`
- [x] **`budgetsApi.addCategory`** already exists in `src/services/api/budgets.ts` — no changes needed there
- [x] **`AddBudgetCategoryRequest`** already exists in `src/types/api.ts` — no changes needed there
- [x] **Edit mode:** `BudgetListPage` still uses `useUpdateBudget`; `editDefaultValues` no longer passes the three removed fields
- [x] **Builder reset:** `builderKey` increment in `BudgetFormSheet` ensures `BudgetCategoryBuilder` remounts fresh on each open
