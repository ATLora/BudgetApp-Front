# BudgetApp — UI/UX Design Guide

## 1. Design Philosophy

BudgetApp should feel like a **personal finance companion**, not a corporate dashboard. The experience must be:

- **Fresh** — clean whites, soft backgrounds, vibrant accents that feel modern without being trendy
- **Light** — generous whitespace, uncluttered layouts, content breathing room
- **Fun** — personality in the micro-copy, meaningful use of color, small delightful touches
- **Friendly** — plain language, clear feedback on every action, no dead ends, no confusion

The target user is someone who may find personal finance stressful. The UI should reduce anxiety, not amplify it — celebrate progress, show clear context, and never overwhelm.

---

## 2. Color Palette

**Chosen palette: Violet/Indigo.** All values below are live in `src/index.css`.

### Primary brand color — Indigo-Violet

Energetic but not aggressive. Sits well alongside financial data and gives the app a modern, friendly personality.

```css
--primary: oklch(0.55 0.22 270);           /* light mode — indigo-violet */
--primary-foreground: oklch(0.99 0 0);     /* white */

--primary (dark): oklch(0.70 0.20 270);    /* lighter violet for dark backgrounds */
--primary-foreground (dark): oklch(0.13 0.02 270);
```

### Semantic financial colors

These are used consistently across the entire app to encode meaning at a glance. **Never swap them.**

| Concept | Color | Tailwind classes |
|---|---|---|
| Income / positive | Emerald green | `text-emerald-600`, `bg-emerald-50` |
| Expense / negative | Rose red | `text-rose-600`, `bg-rose-50` |
| Savings | Sky blue | `text-sky-600`, `bg-sky-50` |
| Warning / overdue | Amber | `text-amber-600`, `bg-amber-50` |
| Neutral / info | Muted violet | `text-muted-foreground` |

### Background & surface tokens

| Token | Light value | Use |
|---|---|---|
| `--background` | `oklch(0.98 0.005 270)` | Barely-lavender page background |
| `--card` | `oklch(1 0 0)` | Pure white cards — pop off background |
| `--muted` | `oklch(0.96 0.008 270)` | Section backgrounds, table row stripes |
| `--secondary` | `oklch(0.94 0.03 270)` | Hover surfaces, subtle fills |
| `--border` | `oklch(0.91 0.01 270)` | Violet-tinted borders |
| `--sidebar` | `oklch(0.97 0.008 270)` | Slightly deeper than page background |

### Chart palette — `--chart-1` through `--chart-5`

Vivid, distinct hues so categories are immediately distinguishable. Same values in both light and dark modes.

```
chart-1: oklch(0.65 0.22 270)   violet   (primary brand)
chart-2: oklch(0.65 0.18 160)   emerald
chart-3: oklch(0.65 0.20 220)   sky blue
chart-4: oklch(0.70 0.18  60)   amber
chart-5: oklch(0.60 0.22 340)   rose
```

---

## 3. Typography

**Font:** Geist Variable (already configured) — clean, modern, highly readable at small sizes.

| Role | Size | Weight | Class |
|---|---|---|---|
| Page title | 24px | 600 | `text-2xl font-semibold` |
| Section heading | 18px | 600 | `text-lg font-semibold` |
| Card title | 14px | 500 | `text-sm font-medium` |
| Body / labels | 14px | 400 | `text-sm` |
| Caption / helper | 12px | 400 | `text-xs text-muted-foreground` |
| Large metric | 28–32px | 700 | `text-3xl font-bold` |

### Tone of copy

- **Friendly, first-person** framing: "Your budgets", "You're on track"
- **Short labels**: "Add budget" not "Create a new budget"
- **Positive micro-copy**: empty states say "No transactions yet — add your first one" not "No data found"
- **Numbers first**: put the dollar amount before the label when both appear together

---

## 4. Spacing & Layout

- Use **8px base grid** — all spacing in multiples of 2, 4, 6, 8, 12, 16…
- Page content padding: `p-6` (24px) on all sides
- Cards: `p-5` or `p-6` internal padding
- Gap between cards in a grid: `gap-4` or `gap-6`
- Stack vertical sections with `space-y-6`

### Page layout pattern

Every page follows this structure:

```
<page wrapper — flex flex-col gap-6>
  <page header>             ← title + subtitle + optional action button (top-right)
  <summary/stats row>       ← 2–4 stat cards in a responsive grid (optional)
  <main content area>       ← list, table, or chart
  <secondary content area>  ← detail panel, related data (optional)
</page wrapper>
```

---

## 5. Component Conventions

### Stat / KPI cards

Used on Dashboard and summary rows. Show a single metric with a label and optional trend indicator.

```
┌─────────────────────────┐
│  Total Income           │  ← muted label, text-sm
│  $4,250.00              │  ← large metric, text-3xl font-bold
│  ↑ 12% vs last month    │  ← trend badge (green/red/neutral)
└─────────────────────────┘
```

- Background: `bg-card` with subtle shadow (`shadow-sm`)
- Positive trend: `text-emerald-600` with `↑`
- Negative trend: `text-rose-600` with `↓`
- Neutral: `text-muted-foreground` with `→`

### Progress bars

Used for budget spending and savings goal progress.

- Use the `Progress` shadcn component
- Color the fill with a semantic class: green when on track (< 80%), amber when approaching (80–99%), red when over (≥ 100%)
- Always show the percentage label alongside the bar

### Badges

Use colored badges to display status and type labels:

| Value | Badge style |
|---|---|
| Income / Active | `bg-emerald-100 text-emerald-700` |
| Expense / Overdue | `bg-rose-100 text-rose-700` |
| Savings / Completed | `bg-sky-100 text-sky-700` |
| Paused / Neutral | `bg-slate-100 text-slate-600` |
| Warning | `bg-amber-100 text-amber-700` |

### Action buttons

- **Primary action** (create, save, confirm): `<Button>` default variant — filled primary color
- **Destructive action** (delete, remove): `<Button variant="destructive">`
- **Secondary / cancel**: `<Button variant="outline">` or `<Button variant="ghost">`
- Every page or section that supports creation has a prominent `+ Add [thing]` button in the top-right of its header

### Forms

- Inputs stack vertically with `space-y-4`
- Labels sit directly above inputs with `space-y-1` between label and input
- Validation errors appear immediately below the relevant input in `text-destructive text-sm`
- Submit button is always the last element, full width on mobile, auto width on desktop
- Modals/sheets are used for create/edit forms — do not navigate to a separate page for simple CRUD

### Modals and sheets

- Use `Sheet` (slide-in panel) for create/edit forms — keeps the user in context
- Use `Dialog` for confirmations (delete prompts)
- Always include a clear cancel/close action
- Destructive confirmations must require an explicit button click — no accidental deletes

---

## 6. Loading & Empty States

### Skeleton loading

Show skeleton placeholders — never a blank screen or spinner alone. Match the skeleton to the shape of the real content:

- Stat cards: show 4 skeleton cards of the same dimensions
- Lists/tables: show 5–6 skeleton rows
- Charts: show a grey rectangle of the chart's height

Use Tailwind's `animate-pulse` on `bg-muted rounded` blocks.

### Empty states

Every list or data section must have a designed empty state:

```
┌──────────────────────────────────────┐
│                                      │
│      🐷  (relevant icon, large)      │
│                                      │
│   No savings goals yet               │  ← heading
│   Start saving towards something     │  ← subtext
│   you care about.                    │
│                                      │
│        [ + Add your first goal ]     │  ← CTA button
│                                      │
└──────────────────────────────────────┘
```

- Icon: use a relevant Lucide icon at `h-12 w-12 text-muted-foreground`
- Heading: `text-lg font-medium`
- Subtext: `text-sm text-muted-foreground`
- CTA: primary button linking to the creation action

### Error states

If a query fails, show an inline error message — not a broken blank screen:

```
Could not load your transactions. Try again.   [ Retry ]
```

---

## 7. Responsive Behavior

The app is desktop-first but must be usable on tablet.

- **Sidebar**: always visible on `lg+`, collapses to a hamburger sheet on smaller screens
- **Stat card grids**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- **Tables**: horizontally scrollable on small screens (`overflow-x-auto`)
- **Forms in sheets**: full-width on mobile, `max-w-md` on desktop

---

## 8. Micro-interactions & Delight

Small touches that make the app feel alive:

- **Hover states**: all interactive cards get `hover:shadow-md transition-shadow`
- **Button feedback**: buttons show a loading spinner and disabled state while their mutation is in-flight
- **Progress celebration**: when a savings goal reaches 100%, show a success badge and a congratulatory message instead of the standard progress bar
- **Positive framing on Dashboard**: if the user is under budget, say "You're under budget this month" with a green accent
- **Transition on route change**: use `tw-animate-css` fade-in on page mount

---

## 9. Iconography

Use **Lucide React** exclusively. Icon sizing conventions:

| Context | Size class |
|---|---|
| Navigation sidebar | `h-4 w-4` |
| Button (leading icon) | `h-4 w-4` |
| Stat card indicator | `h-5 w-5` |
| Empty state illustration | `h-12 w-12` |
| Section heading decoration | `h-5 w-5` |

Icons should always be accompanied by a text label or a tooltip — never icon-only controls without accessible labeling.

---

## 10. Accessibility

- All interactive elements must be keyboard-navigable and have visible focus rings
- Color alone must never be the only way to convey meaning — always pair color with text or icon
- All images and icon-only buttons must have `aria-label` or `<span className="sr-only">`
- Minimum touch target size: 44×44px on interactive elements
- Contrast ratio: minimum 4.5:1 for body text against its background
