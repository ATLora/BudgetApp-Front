# Category Creation — Standalone & Reusable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline category creation (with icon + color) to the "Add Category" sheet on existing budgets, and upgrade the same form used during budget creation to include icon and color fields.

**Architecture:** Two new shared primitive components (`ColorSwatchPicker`, `IconPicker`) are placed in `src/features/categories/components/`. `NewCategoryInlineForm` is upgraded to use them. `BudgetCategoryFormSheet` replaces its plain Select with the existing `CategorySelect` component and conditionally renders `NewCategoryInlineForm` inline when the user requests to create a new category.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui, Lucide React, TanStack Query

> **Note:** No test framework is configured in this project. TDD steps are replaced with TypeScript build checks (`npm run build`) and manual dev-server verification.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/features/categories/components/ColorSwatchPicker.tsx` | Create | 12 preset color swatches, togglable selection |
| `src/features/categories/components/IconPicker.tsx` | Create | 24 curated Lucide icons in a grid, togglable selection; exports `CATEGORY_ICONS` map |
| `src/features/categories/components/NewCategoryInlineForm.tsx` | Modify | Add icon + color fields using the two new pickers |
| `src/features/budgets/components/BudgetCategoryFormSheet.tsx` | Modify | Replace plain Select with `CategorySelect`; show `NewCategoryInlineForm` inline |

---

## Task 1: Create `ColorSwatchPicker`

**Files:**
- Create: `src/features/categories/components/ColorSwatchPicker.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/features/categories/components/ColorSwatchPicker.tsx
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const SWATCHES = [
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Rose',    hex: '#f43f5e' },
  { label: 'Sky',     hex: '#0ea5e9' },
  { label: 'Amber',   hex: '#f59e0b' },
  { label: 'Violet',  hex: '#8b5cf6' },
  { label: 'Orange',  hex: '#f97316' },
  { label: 'Slate',   hex: '#64748b' },
  { label: 'Cyan',    hex: '#06b6d4' },
  { label: 'Pink',    hex: '#ec4899' },
  { label: 'Indigo',  hex: '#6366f1' },
  { label: 'Lime',    hex: '#84cc16' },
  { label: 'Teal',    hex: '#14b8a6' },
];

interface ColorSwatchPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
  disabled?: boolean;
}

export function ColorSwatchPicker({ value, onChange, disabled = false }: ColorSwatchPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SWATCHES.map((swatch) => {
        const selected = value === swatch.hex;
        return (
          <button
            key={swatch.hex}
            type="button"
            disabled={disabled}
            aria-label={swatch.label}
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : swatch.hex)}
            className={cn(
              'size-7 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              selected && 'ring-2 ring-ring ring-offset-2',
              disabled && 'cursor-not-allowed opacity-50',
            )}
            style={{ backgroundColor: swatch.hex }}
          >
            {selected && (
              <Check className="mx-auto size-3.5 text-white drop-shadow-sm" />
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors. (Warnings about unused variables elsewhere are OK — only new errors matter.)

- [ ] **Step 3: Commit**

```bash
git add src/features/categories/components/ColorSwatchPicker.tsx
git commit -m "feat: add ColorSwatchPicker component"
```

---

## Task 2: Create `IconPicker`

**Files:**
- Create: `src/features/categories/components/IconPicker.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/features/categories/components/IconPicker.tsx
import {
  Wallet, ShoppingCart, Home, Car,
  Utensils, Plane, Heart, Dumbbell,
  GraduationCap, Briefcase, TrendingUp, Gift,
  Music, Coffee, Baby, Dog,
  Smartphone, Tv, Fuel, Stethoscope,
  Bus, Landmark, Shirt, Wrench,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Wallet, ShoppingCart, Home, Car,
  Utensils, Plane, Heart, Dumbbell,
  GraduationCap, Briefcase, TrendingUp, Gift,
  Music, Coffee, Baby, Dog,
  Smartphone, Tv, Fuel, Stethoscope,
  Bus, Landmark, Shirt, Wrench,
};

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
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
```

> `CATEGORY_ICONS` is exported so other parts of the app (e.g., a category list) can render the correct Lucide component from the string stored in the API.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/categories/components/IconPicker.tsx
git commit -m "feat: add IconPicker component with curated Lucide icons"
```

---

## Task 3: Upgrade `NewCategoryInlineForm`

**Files:**
- Modify: `src/features/categories/components/NewCategoryInlineForm.tsx`

This file currently has `name` and `categoryType` fields. We add `icon` and `color` states and pass them to `categoriesApi.create()`.

- [ ] **Step 1: Replace the file content**

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
}

export function NewCategoryInlineForm({ onCreated, onCancel }: NewCategoryInlineFormProps) {
  const [name, setName] = useState('');
  const [categoryType, setCategoryType] = useState<string>('');
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Type</Label>
        <Select value={categoryType} onValueChange={(val) => { if (val !== null) setCategoryType(val); }}>
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

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No new errors.

- [ ] **Step 3: Manually verify in budget creation flow**

1. Run `npm run dev`
2. Navigate to the Budgets page → Create Budget
3. In the category builder, click "Add category"
4. In the category row, click the category dropdown → "+ Create new category"
5. Verify the inline form now shows: Name, Type, Icon grid, Color swatches
6. Pick an icon and a color, enter a name and type, click Create
7. Verify the new category is selected in the row with no errors

- [ ] **Step 4: Commit**

```bash
git add src/features/categories/components/NewCategoryInlineForm.tsx
git commit -m "feat: add icon and color fields to NewCategoryInlineForm"
```

---

## Task 4: Wire `BudgetCategoryFormSheet`

**Files:**
- Modify: `src/features/budgets/components/BudgetCategoryFormSheet.tsx`

The add mode currently uses a plain `Select` with a manual `useQuery` + `Controller`. This is replaced with `CategorySelect` (which handles its own fetching and filtering) plus a conditional `NewCategoryInlineForm`. The edit mode is untouched.

- [ ] **Step 1: Replace the file content**

```tsx
// src/features/budgets/components/BudgetCategoryFormSheet.tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { CategorySelect } from '@/features/categories/components/CategorySelect';
import { NewCategoryInlineForm } from '@/features/categories/components/NewCategoryInlineForm';
import type { BudgetCategoryDto, CategoryDto } from '@/types/api';

const addSchema = z.object({
  categoryId: z.string().min(1, 'Select a category'),
  plannedAmount: z.number({ error: 'Enter a number' }).min(0),
  notes: z.string().optional(),
});

const editSchema = z.object({
  plannedAmount: z.number({ error: 'Enter a number' }).min(0),
  notes: z.string().optional(),
});

type AddFormData = z.infer<typeof addSchema>;
type EditFormData = z.infer<typeof editSchema>;

interface BudgetCategoryFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  editTarget?: BudgetCategoryDto;
  existingCategoryIds?: string[];
  onAdd: (data: AddFormData) => void;
  onEdit: (catId: string, data: EditFormData) => void;
  isSubmitting: boolean;
  serverError?: string | null;
}

export function BudgetCategoryFormSheet({
  open,
  onOpenChange,
  editTarget,
  existingCategoryIds = [],
  onAdd,
  onEdit,
  isSubmitting,
  serverError,
}: BudgetCategoryFormSheetProps) {
  const isEditMode = !!editTarget;
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryDto | null>(null);

  const addForm = useForm<AddFormData>({
    resolver: zodResolver(addSchema),
    defaultValues: { categoryId: '', plannedAmount: 0, notes: '' },
  });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      plannedAmount: editTarget?.plannedAmount ?? 0,
      notes: editTarget?.notes ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditMode && editTarget) {
        editForm.reset({ plannedAmount: editTarget.plannedAmount, notes: editTarget.notes ?? '' });
      } else {
        addForm.reset({ categoryId: '', plannedAmount: 0, notes: '' });
        setShowCreateForm(false);
        setSelectedCategory(null);
      }
    }
  }, [open, isEditMode, editTarget, addForm, editForm]);

  function handleCategorySelect(cat: CategoryDto) {
    setSelectedCategory(cat);
    setShowCreateForm(false);
    addForm.setValue('categoryId', cat.id, { shouldValidate: true });
  }

  function handleCategoryCreated(cat: CategoryDto) {
    setShowCreateForm(false);
    handleCategorySelect(cat);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditMode ? 'Edit Category Allocation' : 'Add Category'}</SheetTitle>
        </SheetHeader>

        {isEditMode ? (
          <form
            id="budget-cat-form"
            onSubmit={editForm.handleSubmit((data) => onEdit(editTarget!.id, data))}
            className="flex-1 overflow-y-auto px-4 pb-2"
          >
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">
                  {editTarget!.categoryName}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-planned-amount">Planned Amount</Label>
                <Input
                  id="edit-planned-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  aria-invalid={!!editForm.formState.errors.plannedAmount}
                  {...editForm.register('plannedAmount', { valueAsNumber: true })}
                />
                {editForm.formState.errors.plannedAmount && (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.plannedAmount.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-notes">Notes (optional)</Label>
                <textarea
                  id="edit-notes"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  {...editForm.register('notes')}
                />
              </div>
              {serverError && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </p>
              )}
            </div>
          </form>
        ) : (
          <form
            id="budget-cat-form"
            onSubmit={addForm.handleSubmit(onAdd)}
            className="flex-1 overflow-y-auto px-4 pb-2"
          >
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <CategorySelect
                  value={selectedCategory?.id ?? null}
                  onSelect={handleCategorySelect}
                  onCreateRequest={() => setShowCreateForm(true)}
                  excludeIds={existingCategoryIds}
                  disabled={isSubmitting}
                />
                {showCreateForm && (
                  <NewCategoryInlineForm
                    onCreated={handleCategoryCreated}
                    onCancel={() => setShowCreateForm(false)}
                  />
                )}
                {addForm.formState.errors.categoryId && (
                  <p className="text-xs text-destructive">
                    {addForm.formState.errors.categoryId.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-planned-amount">Planned Amount</Label>
                <Input
                  id="add-planned-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  aria-invalid={!!addForm.formState.errors.plannedAmount}
                  {...addForm.register('plannedAmount', { valueAsNumber: true })}
                />
                {addForm.formState.errors.plannedAmount && (
                  <p className="text-xs text-destructive">
                    {addForm.formState.errors.plannedAmount.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-notes">Notes (optional)</Label>
                <textarea
                  id="add-notes"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  {...addForm.register('notes')}
                />
              </div>
              {serverError && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </p>
              )}
            </div>
          </form>
        )}

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="budget-cat-form" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Add Category'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No new errors.

- [ ] **Step 3: Manually verify — add existing category to existing budget**

1. Run `npm run dev` (backend must be running)
2. Open an existing budget → navigate to its detail page
3. Click "Add Category"
4. Verify the sheet opens and shows the `CategorySelect` dropdown (not the old plain Select)
5. Pick an existing category from the dropdown
6. Verify amount and notes fields appear below
7. Enter an amount → click "Add Category" → verify it saves and the sheet closes

- [ ] **Step 4: Manually verify — create new category from existing budget**

1. Open the "Add Category" sheet on an existing budget
2. In the dropdown, click "+ Create new category"
3. Verify `NewCategoryInlineForm` appears below the dropdown with Name, Type, Icon, Color fields
4. Fill in a name, pick a type, select an icon, pick a color → click Create
5. Verify the form collapses, the new category is auto-selected in the dropdown
6. Enter an amount → click "Add Category" → verify it saves successfully

- [ ] **Step 5: Manually verify — edit mode unchanged**

1. On an existing budget, click the edit/pencil icon on an existing category row
2. Verify the sheet opens in edit mode: category name shown as read-only text, only amount + notes editable
3. Change the amount → save → verify it updates

- [ ] **Step 6: Manually verify — selecting existing dismisses create form**

1. Open "Add Category" sheet
2. Click "+ Create new category" → inline form appears
3. Without submitting, open the dropdown and select an existing category
4. Verify the inline form disappears and the selected category is shown

- [ ] **Step 7: Commit**

```bash
git add src/features/budgets/components/BudgetCategoryFormSheet.tsx
git commit -m "feat: wire CategorySelect and inline category creation into BudgetCategoryFormSheet"
```
