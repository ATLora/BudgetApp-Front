# Budget Creation Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the side-Sheet budget create/edit form with a centered Dialog. Create flow becomes a 2-step wizard (basics → categories) that pre-populates the user's seeded categories, groups them by type with color coding, and shows live totals.

**Architecture:** A new `BudgetWizardDialog` (create only) owns wizard state and renders `BudgetBasicsStep` then `BudgetCategoryWizardStep`. A separate `BudgetEditDialog` handles edit (basics-only, single screen). Both call existing mutation hooks unchanged. Pre-population uses the cached `categoriesApi.list()` query.

**Tech Stack:** React + TypeScript + Vite, react-hook-form + zod, TanStack Query, shadcn/ui (base-ui Dialog), Tailwind v4, lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-04-25-budget-creation-wizard-design.md`

**Notes for the implementer:**
- No test framework is configured (per `CLAUDE.md`). Verification is via `npm run lint`, `npm run build` (type check), and the browser preview tools after wiring is complete.
- Use `import type` for type-only imports. Named exports only. `@/` alias for all imports.
- Tailwind classes inline; use `cn()` from `@/lib/utils` for conditional classes.
- All currency / date display must use helpers in `@/lib/formatters`.

---

## File map

**New files:**
- `src/features/budgets/components/BudgetWizardDialog.tsx` — orchestrator, owns wizard state.
- `src/features/budgets/components/BudgetBasicsStep.tsx` — step 1 form.
- `src/features/budgets/components/BudgetCategoryWizardStep.tsx` — step 2 layout.
- `src/features/budgets/components/BudgetCategoryWizardRow.tsx` — single category row.
- `src/features/budgets/components/BudgetEditDialog.tsx` — basics-only edit dialog.

**Modified files:**
- `src/features/categories/components/NewCategoryInlineForm.tsx` — add optional `lockedType` prop.
- `src/features/budgets/BudgetListPage.tsx` — use the two new dialogs instead of `BudgetFormSheet`.
- `src/features/budgets/types.ts` — no change to existing type; the wizard internally uses a Map but maps to `PendingBudgetCategory[]` for the mutation.

**Deleted files (after wiring):**
- `src/features/budgets/components/BudgetFormSheet.tsx`
- `src/features/budgets/components/BudgetCategoryBuilder.tsx`
- `src/features/budgets/components/BudgetCategoryRow.tsx`

---

## Task 1: Add `lockedType` prop to NewCategoryInlineForm

The wizard needs to create new categories with the type pre-set per section. Add an optional prop that hides the type selector and locks the value.

**Files:**
- Modify: `src/features/categories/components/NewCategoryInlineForm.tsx`

- [ ] **Step 1: Update component to accept `lockedType` prop and conditionally render the type selector**

Replace the entire file contents with:

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
import { IconPicker } from './IconPicker';
import { ColorSwatchPicker } from './ColorSwatchPicker';

interface NewCategoryInlineFormProps {
  /** Called with the fully-resolved CategoryDto after the API call succeeds. */
  onCreated: (cat: CategoryDto) => void;
  onCancel: () => void;
  /** If provided, the type selector is hidden and the new category is forced to this type. */
  lockedType?: CategoryType;
}

export function NewCategoryInlineForm({
  onCreated,
  onCancel,
  lockedType,
}: NewCategoryInlineFormProps) {
  const [name, setName] = useState('');
  const [categoryType, setCategoryType] = useState<string>(lockedType ?? '');
  const [icon, setIcon] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const isValid = name.trim().length > 0 && categoryType !== '';

  async function handleConfirm() {
    if (!isValid) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const id = await categoriesApi.create({
        name: name.trim(),
        categoryType: categoryType as CategoryDto['categoryType'],
        icon,
        color,
      });
      const created = await categoriesApi.getById(id);
      queryClient.invalidateQueries({ queryKey: ['categories', 'list'] });
      onCreated(created);
    } catch {
      setError('Failed to create category. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        New category
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="new-cat-name" className="text-xs">Name</Label>
        <Input
          id="new-cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Housing"
          autoFocus
          disabled={isSubmitting}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
          }}
        />
      </div>

      {!lockedType && (
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select value={categoryType} onValueChange={(val) => { if (val !== null) setCategoryType(val); }}>
            <SelectTrigger className="w-full" disabled={isSubmitting}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CategoryType.Income}>Income</SelectItem>
              <SelectItem value={CategoryType.Expense}>Expense</SelectItem>
              <SelectItem value={CategoryType.Savings}>Savings</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Icon (optional)</Label>
        <IconPicker value={icon} onChange={setIcon} disabled={isSubmitting} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Color (optional)</Label>
        <ColorSwatchPicker value={color} onChange={setColor} disabled={isSubmitting} />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

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

- [ ] **Step 2: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: no errors. Existing callers (no `lockedType` prop) still compile because the prop is optional.

- [ ] **Step 3: Commit**

```bash
git add src/features/categories/components/NewCategoryInlineForm.tsx
git commit -m "feat(categories): allow NewCategoryInlineForm to lock category type"
```

---

## Task 2: Build BudgetCategoryWizardRow

A leaf component for one category in step 2: name + planned-amount input + expandable note.

**Files:**
- Create: `src/features/budgets/components/BudgetCategoryWizardRow.tsx`

- [ ] **Step 1: Create the component file**

```tsx
// src/features/budgets/components/BudgetCategoryWizardRow.tsx
import { Input } from '@/components/ui/input';

export interface BudgetCategoryWizardRowValue {
  plannedAmount: number;
  notes: string;
  noteOpen: boolean;
}

interface BudgetCategoryWizardRowProps {
  categoryId: string;
  categoryName: string;
  value: BudgetCategoryWizardRowValue;
  onChange: (next: BudgetCategoryWizardRowValue) => void;
}

export function BudgetCategoryWizardRow({
  categoryId,
  categoryName,
  value,
  onChange,
}: BudgetCategoryWizardRowProps) {
  const inputId = `budget-cat-amount-${categoryId}`;
  const hasNote = value.notes.trim().length > 0;

  function setAmount(raw: string) {
    const parsed = parseFloat(raw);
    onChange({ ...value, plannedAmount: Number.isFinite(parsed) ? parsed : 0 });
  }

  function toggleNote() {
    onChange({ ...value, noteOpen: !value.noteOpen });
  }

  function setNotes(text: string) {
    onChange({ ...value, notes: text });
  }

  let noteButtonLabel = '+ Add note';
  if (value.noteOpen) noteButtonLabel = 'Hide note';
  else if (hasNote) noteButtonLabel = 'Edit note';

  return (
    <div className="space-y-1.5 py-1.5">
      <div className="flex items-center gap-3">
        <label htmlFor={inputId} className="flex-1 text-sm">
          {categoryName}
        </label>
        <Input
          id={inputId}
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={value.plannedAmount > 0 ? value.plannedAmount : ''}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32 text-right"
        />
      </div>
      <div className="pl-0.5">
        <button
          type="button"
          onClick={toggleNote}
          aria-expanded={value.noteOpen}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {noteButtonLabel}
          {!value.noteOpen && hasNote && (
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
          )}
        </button>
        {value.noteOpen && (
          <textarea
            rows={2}
            placeholder="Notes (optional)"
            value={value.notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: no errors. New file is unused so far — that's fine.

- [ ] **Step 3: Commit**

```bash
git add src/features/budgets/components/BudgetCategoryWizardRow.tsx
git commit -m "feat(budgets): add BudgetCategoryWizardRow component"
```

---

## Task 3: Build BudgetCategoryWizardStep

The step 2 layout: three colored sections (Income/Expense/Savings), pre-populated rows, per-section totals, sticky summary, server error display.

**Files:**
- Create: `src/features/budgets/components/BudgetCategoryWizardStep.tsx`

- [ ] **Step 1: Create the component file**

```tsx
// src/features/budgets/components/BudgetCategoryWizardStep.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { categoriesApi } from '@/services/api/categories';
import { CategoryType } from '@/types/api';
import type { CategoryDto } from '@/types/api';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { NewCategoryInlineForm } from '@/features/categories/components/NewCategoryInlineForm';
import {
  BudgetCategoryWizardRow,
  type BudgetCategoryWizardRowValue,
} from './BudgetCategoryWizardRow';

export type DraftMap = Map<string, BudgetCategoryWizardRowValue>;

interface BudgetCategoryWizardStepProps {
  /** Drafts keyed by category id. */
  drafts: DraftMap;
  /** Categories created during this wizard session (rendered alongside server-loaded ones). */
  customCategoriesAdded: CategoryDto[];
  /** Replace the entire drafts map (component is fully controlled). */
  onDraftsChange: (next: DraftMap) => void;
  /** Append a custom category. The wizard parent owns this list. */
  onCustomCategoryAdded: (cat: CategoryDto) => void;
  /** Validation / server error to render above the step (controlled by parent). */
  errorMessage?: string | null;
}

const SECTION_ORDER: CategoryType[] = [
  CategoryType.Income,
  CategoryType.Expense,
  CategoryType.Savings,
];

const SECTION_LABEL: Record<CategoryType, string> = {
  [CategoryType.Income]: 'Income',
  [CategoryType.Expense]: 'Expense',
  [CategoryType.Savings]: 'Savings',
};

const SECTION_BORDER: Record<CategoryType, string> = {
  [CategoryType.Income]: 'border-l-emerald-500',
  [CategoryType.Expense]: 'border-l-rose-500',
  [CategoryType.Savings]: 'border-l-sky-500',
};

const SECTION_TEXT: Record<CategoryType, string> = {
  [CategoryType.Income]: 'text-emerald-600',
  [CategoryType.Expense]: 'text-rose-600',
  [CategoryType.Savings]: 'text-sky-600',
};

const EMPTY_ROW: BudgetCategoryWizardRowValue = {
  plannedAmount: 0,
  notes: '',
  noteOpen: false,
};

function getRowValue(drafts: DraftMap, categoryId: string): BudgetCategoryWizardRowValue {
  return drafts.get(categoryId) ?? EMPTY_ROW;
}

function setRowValue(
  drafts: DraftMap,
  categoryId: string,
  next: BudgetCategoryWizardRowValue,
): DraftMap {
  const copy = new Map(drafts);
  copy.set(categoryId, next);
  return copy;
}

export function BudgetCategoryWizardStep({
  drafts,
  customCategoriesAdded,
  onDraftsChange,
  onCustomCategoryAdded,
  errorMessage,
}: BudgetCategoryWizardStepProps) {
  const categoriesQuery = useQuery({
    queryKey: ['categories', 'list'],
    queryFn: () => categoriesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  // null = no section currently showing the inline create form
  const [creatingFor, setCreatingFor] = useState<CategoryType | null>(null);

  const allCategories = categoriesQuery.data ?? [];

  // Server-loaded active categories + any added during this session.
  // De-dupe by id (in case the cache invalidation re-fetches the new one).
  const merged: CategoryDto[] = (() => {
    const map = new Map<string, CategoryDto>();
    for (const c of allCategories) {
      if (c.isActive) map.set(c.id, c);
    }
    for (const c of customCategoriesAdded) {
      map.set(c.id, c);
    }
    return Array.from(map.values());
  })();

  function categoriesForSection(type: CategoryType): CategoryDto[] {
    return merged.filter((c) => c.categoryType === type);
  }

  function sectionTotal(type: CategoryType): number {
    return categoriesForSection(type).reduce(
      (sum, c) => sum + getRowValue(drafts, c.id).plannedAmount,
      0,
    );
  }

  const incomeTotal = sectionTotal(CategoryType.Income);
  const expenseTotal = sectionTotal(CategoryType.Expense);
  const savingsTotal = sectionTotal(CategoryType.Savings);
  const netTotal = incomeTotal - expenseTotal - savingsTotal;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Enter an amount to include a category. Empty rows are skipped.
      </p>

      {categoriesQuery.isError && (
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Could not load categories.
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => categoriesQuery.refetch()}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {categoriesQuery.isLoading && (
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      )}

      {!categoriesQuery.isLoading && (
        <div className="space-y-5">
          {SECTION_ORDER.map((type) => {
            const sectionCats = categoriesForSection(type);
            const total = sectionTotal(type);
            const isCreating = creatingFor === type;
            return (
              <section
                key={type}
                className={cn('border-l-4 pl-4', SECTION_BORDER[type])}
              >
                <header className="mb-2 flex items-center justify-between">
                  <h3 className={cn('text-sm font-semibold', SECTION_TEXT[type])}>
                    {SECTION_LABEL[type]}
                  </h3>
                  <span className={cn('text-sm font-medium', SECTION_TEXT[type])}>
                    {formatCurrency(total)}
                  </span>
                </header>

                {sectionCats.length === 0 && !isCreating && (
                  <p className="py-1.5 text-xs text-muted-foreground">
                    No {SECTION_LABEL[type].toLowerCase()} categories yet.
                  </p>
                )}

                <div className="divide-y divide-border/60">
                  {sectionCats.map((c) => (
                    <BudgetCategoryWizardRow
                      key={c.id}
                      categoryId={c.id}
                      categoryName={c.name}
                      value={getRowValue(drafts, c.id)}
                      onChange={(next) =>
                        onDraftsChange(setRowValue(drafts, c.id, next))
                      }
                    />
                  ))}
                </div>

                {isCreating ? (
                  <div className="mt-3">
                    <NewCategoryInlineForm
                      lockedType={type}
                      onCreated={(cat) => {
                        onCustomCategoryAdded(cat);
                        setCreatingFor(null);
                      }}
                      onCancel={() => setCreatingFor(null)}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCreatingFor(type)}
                    className="mt-2 text-xs font-medium text-primary hover:underline"
                  >
                    + Add custom {SECTION_LABEL[type].toLowerCase()} category
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}

      {errorMessage && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      {/* Sticky summary bar — sits at the bottom of the scroll area */}
      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-2 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
          <span className="text-emerald-600">
            Income <span className="font-semibold">{formatCurrency(incomeTotal)}</span>
          </span>
          <span className="text-rose-600">
            Expense <span className="font-semibold">{formatCurrency(expenseTotal)}</span>
          </span>
          <span className="text-sky-600">
            Savings <span className="font-semibold">{formatCurrency(savingsTotal)}</span>
          </span>
          <span
            className={cn(
              'font-semibold',
              netTotal >= 0 ? 'text-emerald-600' : 'text-rose-600',
            )}
          >
            Net {formatCurrency(netTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/budgets/components/BudgetCategoryWizardStep.tsx
git commit -m "feat(budgets): add BudgetCategoryWizardStep with type sections and totals"
```

---

## Task 4: Build BudgetBasicsStep

Step 1 form. Uses react-hook-form + zod, same fields and validation as today's `BudgetFormSheet` basics. Fully controlled by parent (parent owns the form instance).

**Files:**
- Create: `src/features/budgets/components/BudgetBasicsStep.tsx`

- [ ] **Step 1: Create the component file**

```tsx
// src/features/budgets/components/BudgetBasicsStep.tsx
import { Controller, type UseFormReturn } from 'react-hook-form';
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
import type { BudgetFormData } from './budgetFormSchema';

interface BudgetBasicsStepProps {
  form: UseFormReturn<BudgetFormData>;
}

export function BudgetBasicsStep({ form }: BudgetBasicsStepProps) {
  const { register, control, formState: { errors } } = form;

  return (
    <div className="space-y-4">
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
    </div>
  );
}
```

- [ ] **Step 2: Extract the shared zod schema into a sibling file**

This file is referenced by `BudgetBasicsStep`, the wizard, and the edit dialog.

Create: `src/features/budgets/components/budgetFormSchema.ts`

```ts
// src/features/budgets/components/budgetFormSchema.ts
import { z } from 'zod';
import { BudgetType } from '@/types/api';

export const budgetSchema = z
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

export const BUDGET_FORM_DEFAULTS: BudgetFormData = {
  name: '',
  budgetType: BudgetType.Monthly,
  startDate: defaultStartDate(),
  endDate: defaultEndDate(),
  isRecurring: true,
};
```

- [ ] **Step 3: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: no errors. The old `BudgetFormSheet` still imports the duplicated schema locally — that's fine until it's deleted in Task 8.

- [ ] **Step 4: Commit**

```bash
git add src/features/budgets/components/BudgetBasicsStep.tsx src/features/budgets/components/budgetFormSchema.ts
git commit -m "feat(budgets): extract budget form schema and add BudgetBasicsStep"
```

---

## Task 5: Build BudgetWizardDialog

The orchestrator. Owns the wizard state, renders step 1 or step 2, handles validation flow and submission.

**Files:**
- Create: `src/features/budgets/components/BudgetWizardDialog.tsx`

- [ ] **Step 1: Create the component file**

```tsx
// src/features/budgets/components/BudgetWizardDialog.tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CategoryDto } from '@/types/api';
import type { PendingBudgetCategory } from '../types';
import { useCreateBudgetWithCategories } from '../hooks/useBudgetMutations';
import {
  budgetSchema,
  BUDGET_FORM_DEFAULTS,
  type BudgetFormData,
} from './budgetFormSchema';
import { BudgetBasicsStep } from './BudgetBasicsStep';
import {
  BudgetCategoryWizardStep,
  type DraftMap,
} from './BudgetCategoryWizardStep';
import type { BudgetCategoryWizardRowValue } from './BudgetCategoryWizardRow';

interface BudgetWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful create. */
  onCreated?: (newBudgetId: string) => void;
}

type Step = 1 | 2;

function emptyDraft(): BudgetCategoryWizardRowValue {
  return { plannedAmount: 0, notes: '', noteOpen: false };
}

function draftsToPending(
  drafts: DraftMap,
  categoryById: Map<string, CategoryDto>,
): PendingBudgetCategory[] {
  const out: PendingBudgetCategory[] = [];
  for (const [id, value] of drafts.entries()) {
    if (value.plannedAmount <= 0) continue;
    const cat = categoryById.get(id);
    if (!cat) continue;
    out.push({
      key: id,
      category: cat,
      plannedAmount: value.plannedAmount,
      notes: value.notes,
    });
  }
  return out;
}

export function BudgetWizardDialog({
  open,
  onOpenChange,
  onCreated,
}: BudgetWizardDialogProps) {
  const [step, setStep] = useState<Step>(1);
  const [drafts, setDrafts] = useState<DraftMap>(() => new Map());
  const [customCategoriesAdded, setCustomCategoriesAdded] = useState<CategoryDto[]>([]);
  const [stepError, setStepError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: BUDGET_FORM_DEFAULTS,
  });

  const createMutation = useCreateBudgetWithCategories();

  // Reset everything when the dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setDrafts(new Map());
      setCustomCategoriesAdded([]);
      setStepError(null);
      setServerError(null);
      form.reset(BUDGET_FORM_DEFAULTS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleAddCustomCategory(cat: CategoryDto) {
    setCustomCategoriesAdded((prev) => [...prev, cat]);
    // Pre-create an empty draft so the row is wired and ready
    setDrafts((prev) => {
      const copy = new Map(prev);
      if (!copy.has(cat.id)) copy.set(cat.id, emptyDraft());
      return copy;
    });
  }

  async function goToStep2() {
    const ok = await form.trigger();
    if (ok) {
      setStepError(null);
      setStep(2);
    }
  }

  function goBackToStep1() {
    setStepError(null);
    setStep(1);
  }

  async function handleCreate() {
    setStepError(null);
    setServerError(null);

    // Defensive: re-validate basics
    const basicsOk = await form.trigger();
    if (!basicsOk) {
      setStep(1);
      return;
    }

    // Read the cached categories list (the step 2 component populated it
    // via useQuery on the same key). Combine with any custom categories
    // added during this wizard session to build a complete lookup.
    const cached = queryClient.getQueryData<CategoryDto[]>(['categories', 'list']) ?? [];
    const allKnown = [...cached, ...customCategoriesAdded];
    const categoryById = new Map(allKnown.map((c) => [c.id, c]));

    const categories = draftsToPending(drafts, categoryById);
    if (categories.length === 0) {
      setStepError('Add at least one category to your budget.');
      return;
    }

    createMutation.mutate(
      { budgetData: form.getValues(), categories },
      {
        onSuccess: (newId) => {
          onCreated?.(newId);
          onOpenChange(false);
        },
        onError: (err) => {
          setServerError(
            axios.isAxiosError(err)
              ? err.response?.data?.detail ||
                  err.response?.data?.title ||
                  err.message
              : 'Failed to create budget.',
          );
        },
      },
    );
  }

  const isSubmitting = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[90vh] flex-col gap-4',
          step === 1 ? 'sm:max-w-lg' : 'sm:max-w-2xl',
        )}
      >
        <DialogHeader>
          <DialogTitle>New Budget</DialogTitle>
          <Stepper step={step} onJumpToStep1={goBackToStep1} />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          {step === 1 && <BudgetBasicsStep form={form} />}
          {step === 2 && (
            <BudgetCategoryWizardStep
              drafts={drafts}
              customCategoriesAdded={customCategoriesAdded}
              onDraftsChange={setDrafts}
              onCustomCategoryAdded={handleAddCustomCategory}
              errorMessage={stepError ?? serverError}
            />
          )}
        </div>

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={goToStep2} disabled={isSubmitting}>
                Next →
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={goBackToStep1} disabled={isSubmitting}>
                ← Back
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create Budget'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface StepperProps {
  step: Step;
  onJumpToStep1: () => void;
}

function Stepper({ step, onJumpToStep1 }: StepperProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={onJumpToStep1}
        className={cn(
          'h-1.5 w-12 rounded-full transition-colors',
          step >= 1 ? 'bg-primary' : 'bg-muted',
          step === 2 && 'cursor-pointer hover:bg-primary/80',
        )}
        aria-label="Go to step 1"
        disabled={step === 1}
      />
      <span
        className={cn(
          'h-1.5 w-12 rounded-full',
          step >= 2 ? 'bg-primary' : 'bg-muted',
        )}
        aria-hidden="true"
      />
      <span className="ml-1">Step {step} of 2 · {step === 1 ? 'Basics' : 'Categories'}</span>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/budgets/components/BudgetWizardDialog.tsx
git commit -m "feat(budgets): add BudgetWizardDialog with two-step flow"
```

---

## Task 6: Build BudgetEditDialog

A simpler centered Dialog for the edit case (basics-only). Mirrors the wizard's step 1 styling but submits via `useUpdateBudget`.

**Files:**
- Create: `src/features/budgets/components/BudgetEditDialog.tsx`

- [ ] **Step 1: Create the component file**

```tsx
// src/features/budgets/components/BudgetEditDialog.tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUpdateBudget } from '../hooks/useBudgetMutations';
import {
  budgetSchema,
  BUDGET_FORM_DEFAULTS,
  type BudgetFormData,
} from './budgetFormSchema';
import { BudgetBasicsStep } from './BudgetBasicsStep';

interface BudgetEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  defaultValues: BudgetFormData;
}

export function BudgetEditDialog({
  open,
  onOpenChange,
  budgetId,
  defaultValues,
}: BudgetEditDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { ...BUDGET_FORM_DEFAULTS, ...defaultValues },
  });

  const updateMutation = useUpdateBudget();

  useEffect(() => {
    if (open) {
      setServerError(null);
      form.reset({ ...BUDGET_FORM_DEFAULTS, ...defaultValues });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultValues]);

  function handleSubmit(data: BudgetFormData) {
    setServerError(null);
    updateMutation.mutate(
      { id: budgetId, data },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => {
          setServerError(
            axios.isAxiosError(err)
              ? err.response?.data?.detail ||
                  err.response?.data?.title ||
                  err.message
              : 'Failed to update budget.',
          );
        },
      },
    );
  }

  const isSubmitting = updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Budget</DialogTitle>
        </DialogHeader>

        <form
          id="budget-edit-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <BudgetBasicsStep form={form} />

          {serverError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="budget-edit-form" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/budgets/components/BudgetEditDialog.tsx
git commit -m "feat(budgets): add BudgetEditDialog (basics-only centered modal)"
```

---

## Task 7: Wire the new dialogs into BudgetListPage

Switch the page over to render `BudgetWizardDialog` for create and `BudgetEditDialog` for edit. Remove all logic that was specific to the old `BudgetFormSheet` (mode prop, pendingCategories state, single submit handler that branched on edit vs create).

**Files:**
- Modify: `src/features/budgets/BudgetListPage.tsx`

- [ ] **Step 1: Replace the file contents**

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
  useDeleteBudget,
  useRollForwardBudget,
} from './hooks/useBudgetMutations';
import { BudgetCard } from './components/BudgetCard';
import { BudgetListSkeleton } from './components/BudgetListSkeleton';
import { BudgetWizardDialog } from './components/BudgetWizardDialog';
import { BudgetEditDialog } from './components/BudgetEditDialog';
import type { BudgetFormData } from './components/budgetFormSchema';
import { DeleteBudgetDialog } from './components/DeleteBudgetDialog';

export function BudgetListPage() {
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState<BudgetTypeValue | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetSummaryDto | null>(null);
  const [rollingForwardId, setRollingForwardId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetSummaryDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useBudgetList(filterType ? { budgetType: filterType } : undefined);
  const deleteMutation = useDeleteBudget();
  const rollForwardMutation = useRollForwardBudget();

  const budgets = listQuery.data ?? [];

  function openCreate() {
    setCreateOpen(true);
  }

  function openEdit(budget: BudgetSummaryDto) {
    setEditTarget(budget);
  }

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

  function handleRollForward(id: string) {
    setRollingForwardId(id);
    rollForwardMutation.mutate(id, {
      onSuccess: (newId) => navigate(`/budgets/${newId}`),
      onSettled: () => setRollingForwardId(null),
    });
  }

  const editDefaults: BudgetFormData | null = editTarget
    ? {
        name: editTarget.name,
        budgetType: editTarget.budgetType,
        startDate: editTarget.startDate,
        endDate: editTarget.endDate,
        isRecurring: editTarget.isRecurring,
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
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
              onDeleteRequest={handleDeleteRequest}
              onRollForward={handleRollForward}
              isRollingForward={rollingForwardId === budget.id}
            />
          ))}
        </div>
      )}

      <BudgetWizardDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editTarget && editDefaults && (
        <BudgetEditDialog
          open={editTarget !== null}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          budgetId={editTarget.id}
          defaultValues={editDefaults}
        />
      )}

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
    </div>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: no errors. (The old `BudgetFormSheet` and friends are still on disk but no longer imported here — they'll be deleted in Task 8.)

- [ ] **Step 3: Commit**

```bash
git add src/features/budgets/BudgetListPage.tsx
git commit -m "feat(budgets): use new wizard and edit dialogs in budget list page"
```

---

## Task 8: Delete obsolete components

`BudgetFormSheet`, `BudgetCategoryBuilder`, and `BudgetCategoryRow` are no longer referenced anywhere. Remove them.

**Files:**
- Delete: `src/features/budgets/components/BudgetFormSheet.tsx`
- Delete: `src/features/budgets/components/BudgetCategoryBuilder.tsx`
- Delete: `src/features/budgets/components/BudgetCategoryRow.tsx`

- [ ] **Step 1: Confirm nothing imports them**

Run: `npm run build && npm run lint`
Then check imports explicitly to be safe — using the Grep tool, search for `BudgetFormSheet`, `BudgetCategoryBuilder`, `BudgetCategoryRow` across `src/`. Expected: no matches.

If anything else imports them (it shouldn't), update that file first.

- [ ] **Step 2: Delete the files**

```bash
rm src/features/budgets/components/BudgetFormSheet.tsx
rm src/features/budgets/components/BudgetCategoryBuilder.tsx
rm src/features/budgets/components/BudgetCategoryRow.tsx
```

- [ ] **Step 3: Type-check and lint to confirm clean state**

Run: `npm run build && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -u src/features/budgets/components/
git commit -m "refactor(budgets): remove old BudgetFormSheet and category builder components"
```

---

## Task 9: Browser verification

End-to-end smoke test of the new flow using the preview tools (per `CLAUDE.md` — no test framework, so verification happens in the browser).

**Pre-req:** the .NET API must be running at `VITE_API_URL`. The implementer should already have it running from prior work; if not, ask the user to start it before this task.

- [ ] **Step 1: Start the dev server**

Use the preview tooling (`preview_start`). The dev server will run `npm run dev` against the existing Vite config.

- [ ] **Step 2: Verify create wizard happy path**

Navigate to `/budgets`. Click `New Budget`. Confirm:
- Dialog opens centered, not from the side.
- Stepper shows "Step 1 of 2 · Basics", first segment filled.
- Footer has `Cancel` and `Next →` only.

Fill in name "Verify Wizard", keep Monthly/current month/recurring. Click `Next →`. Confirm:
- Stepper advances to "Step 2 of 2 · Categories", both segments filled.
- Dialog widens (`sm:max-w-2xl`).
- Three sections appear: Income (emerald border), Expense (rose border), Savings (sky border) with the user's existing categories listed.
- Per-section totals start at $0.00.
- Sticky bar at bottom shows `Income $0.00 · Expense $0.00 · Savings $0.00 · Net $0.00`.

Type amounts in two Expense rows and one Income row. Confirm:
- Per-section totals update live.
- Sticky bar Net updates.

Click an "+ Add note" button. Confirm a textarea expands and the button label flips to "Hide note". Type a note, click "Hide note", confirm the indicator dot appears next to "Edit note".

Click `Create Budget`. Confirm:
- Dialog closes.
- New budget "Verify Wizard" appears on the list.
- Click into it; the Categories card on the detail page shows the rows you entered with the right amounts.

- [ ] **Step 3: Verify validation**

Open `New Budget` again. Click `Next →` without entering a name. Confirm:
- Stays on step 1.
- Inline error appears under the Name field.

Fill name, click `Next →`. On step 2, immediately click `Create Budget` without entering any amount. Confirm:
- Stays on step 2.
- Error message appears: "Add at least one category to your budget."

- [ ] **Step 4: Verify Back preserves drafts**

From step 2 with some amounts entered, click `← Back`. Edit the name. Click `Next →`. Confirm:
- Returns to step 2 with the amounts you'd entered still in place.

- [ ] **Step 5: Verify custom-category mid-wizard**

On step 2, click `+ Add custom expense category`. Inline form appears (no Type selector — locked to Expense). Fill name, click Create. Confirm:
- New row appears in the Expense section.
- You can enter an amount on it and it counts toward the section total.

- [ ] **Step 6: Verify edit flow**

From the budget list, click the edit action on an existing budget. Confirm:
- Centered Dialog opens (not a side sheet).
- Title is "Edit Budget".
- Fields are pre-filled from the budget.
- Footer: `Cancel` and `Save Changes`.

Change the name, click `Save Changes`. Confirm dialog closes and the new name appears on the card.

- [ ] **Step 7: Verify mobile width**

Use `preview_resize` to set a mobile viewport (~375px wide). Open the wizard. Confirm:
- Dialog goes near full-width.
- Both steps remain usable; rows don't overflow horizontally.
- Sticky bar wraps cleanly.

- [ ] **Step 8: Final commit (verification artifacts only, if any)**

There are typically no code changes from this task. If you discover issues and fix them, commit those fixes with descriptive messages and re-run the affected verification steps. Otherwise, no commit needed for this task.

---

## Self-review summary (for the implementer)

Each task is self-contained, references exact files and exact code, and ends with a commit. Type-check + lint replaces the failing-test step since this project has no test framework. Browser verification (Task 9) is the final gate — do not declare completion before it passes end-to-end.
