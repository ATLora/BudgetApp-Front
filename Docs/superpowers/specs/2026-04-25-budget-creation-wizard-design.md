# Budget Creation Wizard — Design Spec

**Date:** 2026-04-25
**Status:** Approved (pending implementation plan)
**Scope:** `src/features/budgets/` — create and edit budget UI only

## 1. Goals

Improve the budget creation flow to:

1. Use a centered modal (Dialog), matching transactions and savings goals.
2. Guide users through a 2-step wizard (basics → categories) instead of one tall scrollable form.
3. Pre-populate the categories step with the user's seeded default categories so they have a visual example to follow.
4. Group categories by type (Income / Expense / Savings) using the same color coding as the budget detail's category report (emerald / rose / sky).
5. Show running totals per category type plus a net summary, so users can see the budget's shape as they fill it in.

Edit mode also moves to a centered Dialog (basics-only, single screen) for consistency with the new create modal style.

## 2. Non-goals

- No backend API changes. The existing `useCreateBudgetWithCategories` mutation already accepts basics + categories in one call.
- No changes to category management on the budget detail page (`BudgetCategoryBreakdown` and friends are unchanged).
- No category icons/colors in the wizard rows — the type-section coloring is sufficient visual structure.
- No "save draft" / persistence across dialog close. Closing the dialog discards wizard state.

## 3. Component changes

### New components (under `src/features/budgets/components/`)

- `BudgetWizardDialog.tsx` — centered Dialog wrapper that owns wizard state (current step, basics form, draft categories, server error). Used for **create only**. Replaces the create-mode usage of `BudgetFormSheet`.
- `BudgetBasicsStep.tsx` — step 1 form: name, type, dates, recurring toggle. Receives form values + change handlers, renders inline zod errors.
- `BudgetCategoryWizardStep.tsx` — step 2 layout: three colored sections (Income / Expense / Savings), pre-populated rows from `categoriesApi.list()`, per-section totals, sticky summary bar.
- `BudgetCategoryWizardRow.tsx` — single category row: name, planned-amount input, expandable "Add note" textarea.

### Renamed / converted

- `BudgetFormSheet.tsx` → `BudgetEditDialog.tsx`. Converted from `Sheet` to `Dialog`. Used for **edit only**, single screen, basics-only fields. Drops the `mode`, `onCategoriesChange`, and category-builder logic.

### Removed

- `BudgetCategoryBuilder.tsx` — replaced by `BudgetCategoryWizardStep`.
- `BudgetCategoryRow.tsx` — replaced by `BudgetCategoryWizardRow` (different layout: pre-populated rows, no inline category picker).

### Caller changes

- `BudgetListPage.tsx`: render `BudgetWizardDialog` for create, `BudgetEditDialog` for edit. Both still call into the existing mutations (`useCreateBudgetWithCategories`, `useUpdateBudget`).

### Reused as-is

- `NewCategoryInlineForm` (from `features/categories/components/`) — used inside the wizard's per-section "+ Add custom category" affordance, with `categoryType` pre-set per section.
- All budget mutation hooks. No hook changes.
- All zod schema fields for basics. The basics validation moves into `BudgetBasicsStep` but uses the same rules as today.

## 4. Step 1 — Basics

**Trigger:** clicking "New Budget" on `BudgetListPage`.

**Modal:** centered `Dialog`, `sm:max-w-lg` (matches `TransactionFormDialog`).

**Header:**
- Title: "New Budget"
- Stepper indicator below title: two segments, current step filled. Clicking a completed segment navigates to that step (same as the Back button on step 2).
- Subline: "Step 1 of 2 · Basics".

**Fields (same as today):**
- Name (text, required, max 200)
- Type (Select: Monthly / Weekly / Biweekly / Quarterly / Annual / Custom)
- Start date / End date (date inputs, end > start)
- "Repeat automatically" toggle

**Defaults:** name empty, Monthly, current month start/end, recurring=true.

**Footer buttons:** `Cancel` (closes dialog), `Next →` (validates step 1 fields with zod; on success advances to step 2).

**Validation:** runs on Next click. Inline errors shown beside fields. No server call yet.

## 5. Step 2 — Categories

**Modal:** same `Dialog` instance, but width grows to `sm:max-w-2xl` to fit columns. Mobile: full-width.

**Header:** title stays "New Budget"; stepper updates to step 2; subline becomes "Step 2 of 2 · Categories".

**Body layout:**

A short tip at the top: "Enter an amount to include a category. Empty rows are skipped."

Then three sections in fixed order — Income, Expense, Savings — each with:

- A section header containing:
  - 4px left border in the type's color (emerald-500 / rose-500 / sky-500), matching `BudgetCategoryBreakdown`'s `TYPE_BORDER_CLASS`.
  - Type label in matching color.
  - Right-aligned per-section total (sum of `plannedAmount` across that section's rows). Uses `formatCurrency`.
- A list of category rows, one per existing active category of that type, fetched from `categoriesApi.list()`.
- A "+ Add custom <type> category" link at the bottom, which inline-renders `NewCategoryInlineForm` with `categoryType` pre-set. On create, the new category appears as a new row at the bottom of the section with focus on its amount input.

If a section has zero existing categories, render a muted "No <type> categories yet" line above the add-custom link.

**Row layout (`BudgetCategoryWizardRow`):**
- Category name on the left (no badge — section already conveys type).
- Planned-amount input on the right (number, min 0, step 0.01). Empty by default.
- Below the amount input: a small "+ Add note" button. Clicking reveals a 2-line textarea inline below the amount. The button's label switches to "Hide note" while open. When the textarea is closed but contains text, the button label becomes "Edit note" with a subtle dot indicator. Note text persists across open/close while the dialog is open.
- No remove button. Setting amount to 0 (or clearing it) excludes the category from submission. Custom categories added in this session stay visible even at $0 until dialog close.

**Sticky summary bar (above footer):**
- Three totals: `Income $X · Expense $Y · Savings $Z`.
- A `Net` value: `Income − Expense − Savings`. Helps users see if the budget balances.
- Stays visible while the body scrolls.

**Footer buttons:** `← Back` (returns to step 1, drafts preserved), `Cancel` (closes and discards), `Create Budget` (validates and submits).

## 6. Wizard state

State lives in `BudgetWizardDialog`:

```ts
type WizardState = {
  step: 1 | 2;
  basics: BudgetFormData;        // step-1 fields
  drafts: Map<string, {          // keyed by categoryId
    plannedAmount: number;
    notes: string;
    noteOpen: boolean;
  }>;
  customCategoriesAdded: CategoryDto[];
};
```

- `drafts` keyed by category id ensures values persist when the user navigates between steps.
- `customCategoriesAdded` tracks categories created during this session so they render in the appropriate section.
- Dialog open → reset to defaults (drafts cleared, basics defaults, step=1, customs cleared).

## 7. Data flow

**Categories pre-population:**
- On wizard open, the existing `categoriesApi.list()` query (already cached at `['categories', 'list']` with `staleTime: 10min` by `CategorySelect` and others) is reused.
- Filter: `c.isActive === true`. Group by `c.categoryType`.
- For users with no seeded categories yet, the affected section shows the empty-state message.

**Submit flow (Create Budget click on step 2):**
1. Re-validate basics with zod (defensive — covers the case where a user navigates back, edits, then forward without clicking Next).
2. Build `categories: PendingBudgetCategory[]` from drafts where `plannedAmount > 0`. For each, include `notes` only if non-empty.
3. Call `useCreateBudgetWithCategories.mutate({ budgetData: basics, categories })`.
4. On success → close dialog. On error → show server error inline above footer; stay on step 2 so user can fix and retry without losing data.

**Why the data shape doesn't change:** `PendingBudgetCategory` already supports the `{ category, plannedAmount, notes }` shape. The wizard just builds it differently (from a Map keyed by id, rather than an append-only list).

## 8. Validation rules

| Step | Rule | Error location |
|------|------|----------------|
| 1 | Name required, max 200 chars | inline beside Name |
| 1 | Start date required | inline beside Start date |
| 1 | End date required, must be > start | inline beside End date |
| 2 | At least one row with `plannedAmount > 0` | inline above footer: "Add at least one category to your budget" |
| 2 | Custom category creation errors | inline within `NewCategoryInlineForm` (existing behavior) |
| Submit | Categories list fetch failed | retry banner inside step 2 body, custom-category creation still works |
| Submit | Server error (4xx/5xx) | inline above footer, drafts preserved |

## 9. Edit mode (`BudgetEditDialog`)

Edit is a separate, simpler component:

- Centered `Dialog`, `sm:max-w-lg`.
- Title: "Edit Budget".
- Same basics fields as step 1 of the wizard. No category section (categories are managed on the detail page).
- Footer: `Cancel`, `Save Changes`.
- Calls existing `useUpdateBudget` mutation. No behavior change vs. today, just a Sheet → Dialog conversion.

## 10. Color coding reference

Matches `BudgetCategoryBreakdown.TYPE_BORDER_CLASS`:

| Type | Tailwind border | Tailwind text |
|------|-----------------|---------------|
| Income | `border-l-emerald-500` | `text-emerald-600` |
| Expense | `border-l-rose-500` | `text-rose-600` |
| Savings | `border-l-sky-500` | `text-sky-600` |

These match the established financial color semantics in the project (see `CLAUDE.md`).

## 11. Accessibility

- Stepper uses `role="tablist"` semantics with focusable, clickable segments for completed steps.
- Each step's heading uses an appropriate landmark.
- Amount inputs have visible labels (the row's category name acts as the label, wired via `htmlFor` / `aria-labelledby`).
- The "+ Add note" link is a real button with `aria-expanded` reflecting whether the textarea is open.
- Server / validation errors use `aria-live="polite"` regions so screen readers announce them.
- Sticky summary bar is an `aside` with `aria-label="Budget totals"`.

## 12. Mobile considerations

- Dialog goes full-width on `< sm` breakpoint.
- Amount input on each row stays right-aligned and fixed-width (e.g., `w-32`) so labels can truncate on narrow screens.
- Sticky summary bar stacks totals on one line; if it overflows, totals wrap to a second line. No collapse / "tap to reveal" — keeps the implementation simple. Will be re-evaluated after dev-server testing.

## 13. Verification (no test framework)

Per `CLAUDE.md`, no test framework is configured. Verification will be done via the dev server using the preview tools:

1. Create a new budget end-to-end with multiple categories filled in. Confirm it appears on the list and detail pages.
2. Try advancing past step 1 with invalid fields → inline errors appear, no advance.
3. Try submitting step 2 with no amounts entered → "add at least one category" error.
4. Add a custom category mid-wizard → row appears in the right section, focuses the amount input.
5. Navigate Back from step 2 to step 1, edit the name, go forward → drafts preserved.
6. Edit an existing budget → centered Dialog opens, basics editable, Save Changes works.
7. Resize to mobile width → dialog goes full-width, layout still usable.

## 14. Out of scope (possible follow-ups)

- "Save draft" persistence across dialog close.
- Drag-to-reorder categories within a section.
- Per-category icons in wizard rows.
- A "use last budget as template" option (could be added as a third opening choice on step 1).
