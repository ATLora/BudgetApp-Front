# Category Creation — Standalone & Reusable Design

**Date:** 2026-04-19
**Status:** Approved

## Problem

The "Add Category" sheet on an existing budget (`BudgetCategoryFormSheet`) only allows selecting from existing categories. Users cannot create a new category from there. Meanwhile, budget *creation* already supports inline category creation via `NewCategoryInlineForm` + `CategorySelect`, but that form is limited to name + type — icon and color are not exposed even though the API supports them.

The goal is to:
1. Enable category creation from `BudgetCategoryFormSheet` (inline, same UX as budget creation)
2. Upgrade `NewCategoryInlineForm` to include icon and color fields
3. Extract icon and color selection as standalone reusable components

## Approach

**Approach C — Upgrade `NewCategoryInlineForm` + extract shared pickers**

Create `IconPicker` and `ColorSwatchPicker` as standalone shared components. Upgrade `NewCategoryInlineForm` to use them. Wire `CategorySelect` into `BudgetCategoryFormSheet` using the same pattern `BudgetCategoryRow` already uses.

This avoids over-engineering a full abstraction layer (no new sheet/dialog wrappers), keeps changes targeted, and produces two genuinely reusable primitives.

## Components

### New: `IconPicker`

**Path:** `src/features/categories/components/IconPicker.tsx`

A 6×4 grid of 24 curated Lucide icons relevant to personal finance and daily life:

```
Wallet, ShoppingCart, Home, Car,
Utensils, Plane, Heart, Dumbbell,
GraduationCap, Briefcase, TrendingUp, Gift,
Music, Coffee, Baby, Dog,
Smartphone, Tv, Fuel, Stethoscope,
Bus, Landmark, Shirt, Wrench
```

- Clicking an icon selects it (highlighted ring); clicking the selected icon deselects it (icon is optional)
- The stored value is the Lucide icon name string (e.g. `"Wallet"`)
- Props: `value: string | null`, `onChange: (icon: string | null) => void`, optional `disabled?: boolean`

### New: `ColorSwatchPicker`

**Path:** `src/features/categories/components/ColorSwatchPicker.tsx`

A row of 12 circular color swatches drawn from the app's Tailwind semantic palette:

| Token | Hex |
|-------|-----|
| emerald | `#10b981` |
| rose | `#f43f5e` |
| sky | `#0ea5e9` |
| amber | `#f59e0b` |
| violet | `#8b5cf6` |
| orange | `#f97316` |
| slate | `#64748b` |
| cyan | `#06b6d4` |
| pink | `#ec4899` |
| indigo | `#6366f1` |
| lime | `#84cc16` |
| teal | `#14b8a6` |

- Stored value is the hex string (e.g. `"#10b981"`) — format-agnostic for the backend
- Selected swatch has a ring + checkmark; color is optional (null)
- Props: `value: string | null`, `onChange: (color: string | null) => void`, optional `disabled?: boolean`

### Modified: `NewCategoryInlineForm`

**Path:** `src/features/categories/components/NewCategoryInlineForm.tsx`

Adds icon and color fields after the existing type selector:

**Field order:**
1. Name input *(existing)*
2. Category type select *(existing)*
3. `IconPicker` — label "Icon (optional)"
4. `ColorSwatchPicker` — label "Color (optional)"
5. Cancel / Save buttons *(existing)*

**API change:** `categoriesApi.create()` call gains `icon` and `color` from the new fields. The `icon` value is the Lucide icon name string or null; `color` is the hex string or null.

**Props unchanged:** `onCreated(cat: CategoryDto)`, `onCancel()` — callers (`BudgetCategoryRow`) need no changes and get the upgrade for free.

### Modified: `BudgetCategoryFormSheet`

**Path:** `src/features/budgets/components/BudgetCategoryFormSheet.tsx`

**Add mode only** (edit mode is untouched).

Replace the current plain Select with `CategorySelect`. Add `showCreateForm: boolean` local state.

**Add mode flow:**
1. `CategorySelect` renders with `excludeIds={existingCategoryIds}` and `onCreateRequest={() => setShowCreateForm(true)}`
2. **Existing category selected** → amount/notes fields appear → submit unchanged
3. **"+ Create new category" clicked** → `showCreateForm = true` → `NewCategoryInlineForm` appears below the dropdown
4. **Creation completed** (`onCreated(cat)`) → `showCreateForm = false`, new category auto-selected in form state, amount/notes appear
5. **Creation cancelled** (`onCancel`) → `showCreateForm = false`, selection cleared

`showCreateForm` resets to `false` whenever the sheet closes (`onOpenChange(false)`).

No new props are added to `BudgetCategoryFormSheet`.

## Data Flow

```
BudgetCategoryFormSheet (add mode)
  └─ CategorySelect
       ├─ onSelect(cat)           → set selected category, show amount/notes
       └─ onCreateRequest()       → setShowCreateForm(true)
            └─ NewCategoryInlineForm
                 ├─ onCreated(cat) → setShowCreateForm(false), auto-select cat
                 └─ onCancel()    → setShowCreateForm(false)
```

Category creation API call (inside `NewCategoryInlineForm`):
```
categoriesApi.create({ name, categoryType, icon, color })
  → categoriesApi.getById(newId)
  → invalidate ['categories', 'list']
  → onCreated(fullCategoryDto)
```

## What Does NOT Change

- `BudgetCategoryRow` — already wires `CategorySelect` + `NewCategoryInlineForm`; gets icon/color upgrade automatically
- `CategorySelect` — no changes; `onCreateRequest` callback already exists
- `useBudgetCategoryMutations` hooks — no changes
- `budgetsApi` — no changes
- `categoriesApi` — no changes (already accepts icon/color)
- Edit mode of `BudgetCategoryFormSheet` — no changes

## File Summary

| File | Action |
|------|--------|
| `src/features/categories/components/IconPicker.tsx` | Create |
| `src/features/categories/components/ColorSwatchPicker.tsx` | Create |
| `src/features/categories/components/NewCategoryInlineForm.tsx` | Modify |
| `src/features/budgets/components/BudgetCategoryFormSheet.tsx` | Modify |
