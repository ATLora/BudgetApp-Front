# BudgetApp Frontend — Architecture & Code Standards

## 1. Overview

Single-page application (SPA) built with React + TypeScript + Vite. It communicates with a .NET REST API at `VITE_API_URL` (default: `http://localhost:5000`). The app uses JWT authentication with silent token refresh and a feature-based folder structure.

---

## 2. Tech Stack

| Concern | Library |
|---|---|
| UI framework | React 18 |
| Language | TypeScript (strict, `erasableSyntaxOnly`) |
| Build | Vite |
| Routing | React Router v7 |
| Server state | TanStack Query v5 |
| Client state | Zustand |
| Component library | shadcn/ui |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| HTTP | Axios |
| Forms | React Hook Form + Zod |
| Date utilities | date-fns |
| Icons | Lucide React |

---

## 3. Folder Structure

```
src/
├── app/
│   ├── providers.tsx       # QueryClient + TooltipProvider + RouterProvider
│   └── router.tsx          # All routes, RequireAuth, GuestOnly guards
│
├── features/               # One folder per domain feature
│   ├── auth/               # LoginPage, RegisterPage
│   ├── dashboard/          # DashboardPage (and future sub-components)
│   ├── budgets/            # BudgetListPage, BudgetDetailPage
│   ├── transactions/       # TransactionsPage
│   ├── categories/         # CategoriesPage
│   └── savings/            # SavingsListPage, SavingsDetailPage
│
├── components/
│   ├── layout/             # AppLayout, Sidebar, Header — shell components only
│   └── ui/                 # shadcn-generated primitives (Button, Card, Input…)
│
├── services/
│   └── api/
│       ├── client.ts       # Axios instance, token store, refresh interceptor
│       ├── auth.ts
│       ├── budgets.ts
│       ├── categories.ts
│       ├── transactions.ts
│       ├── savings.ts
│       └── dashboard.ts
│
├── stores/
│   └── authStore.ts        # Zustand store — auth state only
│
├── hooks/
│   └── useAuth.ts          # Thin hook wrapping authStore + authApi
│
├── types/
│   └── api.ts              # All TypeScript types and const-enums (single source of truth)
│
└── lib/
    ├── utils.ts            # cn() helper (Tailwind class merging)
    └── formatters.ts       # formatCurrency, formatDate, formatPercent, etc.
```

### Feature folder conventions

When a feature grows beyond a single page file, expand it like this:

```
features/budgets/
├── BudgetListPage.tsx
├── BudgetDetailPage.tsx
├── components/             # Components used only within this feature
│   ├── BudgetCard.tsx
│   └── BudgetForm.tsx
└── hooks/                  # TanStack Query hooks for this feature
    ├── useBudgets.ts
    └── useBudgetDetail.ts
```

Do **not** create `components/` or `hooks/` sub-folders until there is more than one file to put in them.

---

## 4. State Management

Two distinct layers — never mix them.

### Server state → TanStack Query

All data that comes from or goes to the API is server state. It lives in TanStack Query hooks inside `features/<name>/hooks/`.

```ts
// features/budgets/hooks/useBudgets.ts
import { useQuery } from '@tanstack/react-query';
import { budgetsApi } from '@/services/api/budgets';
import type { BudgetListParams } from '@/types/api';

export function useBudgets(params?: BudgetListParams) {
  return useQuery({
    queryKey: ['budgets', params],
    queryFn: () => budgetsApi.list(params),
  });
}
```

Mutation hooks follow the same pattern using `useMutation`:

```ts
// features/budgets/hooks/useCreateBudget.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi } from '@/services/api/budgets';

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: budgetsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}
```

**Query key convention:** `[resource]` for lists, `[resource, id]` for single items, `[resource, id, sub-resource]` for nested. Examples:
- `['budgets']`
- `['budgets', id]`
- `['budgets', id, 'report']`
- `['transactions', params]`
- `['dashboard', 'summary', params]`

**Global defaults** (set in `providers.tsx`):
- `staleTime: 5 minutes` — avoid redundant refetches on tab focus
- `retry: 1`

### Client state → Zustand

Only used for auth state (`useAuthStore`). Do not add other global client state unless there is a clear reason it cannot live in a component or TanStack Query.

```ts
// Correct: read auth state directly from the store
const user = useAuthStore((s) => s.user);

// Correct: trigger auth actions via the useAuth hook
const { logout } = useAuth();
```

---

## 5. API Service Layer

Each resource has a dedicated file in `services/api/`. Services are plain objects with typed functions — no classes, no hooks.

```ts
// services/api/budgets.ts  (example pattern)
export const budgetsApi = {
  list: (params?: BudgetListParams) =>
    client.get<BudgetSummaryDto[]>('/api/v1/budgets', { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get<BudgetDetailDto>(`/api/v1/budgets/${id}`).then((r) => r.data),

  create: (data: CreateBudgetRequest) =>
    client.post<string>('/api/v1/budgets', data).then((r) => r.data),
};
```

Rules:
- Always `.then((r) => r.data)` — return the payload, not the Axios response.
- Type the generic on `client.get<T>` / `client.post<T>` with the exact DTO from `types/api.ts`.
- Never call the API directly from a component — always go through a service function.

### Auth & token management (`services/api/client.ts`)

- **Access token**: kept in module-level memory (`_accessToken`), never written to `localStorage` (XSS protection).
- **Refresh token**: stored in `localStorage` under `budget_refresh_token`.
- **Silent refresh**: the response interceptor catches 401s, pauses concurrent requests, calls `/auth/refresh`, then replays the queue.
- If refresh fails, `tokenStore.clear()` is called and the user is redirected to `/login` via `window.location.href`.

Do not touch `client.ts` for routine feature work.

---

## 6. TypeScript Conventions

### No TypeScript enums — use `as const` objects

The project uses `erasableSyntaxOnly`, which forbids TypeScript `enum` declarations.

```ts
// WRONG
enum BudgetType { Monthly = 0, Weekly = 1 }

// CORRECT — defined in types/api.ts
export const BudgetType = {
  Monthly: 0,
  Weekly: 1,
  Annual: 2,
  Custom: 3,
} as const;
export type BudgetType = (typeof BudgetType)[keyof typeof BudgetType];
```

Usage:

```ts
import { BudgetType } from '@/types/api';

const type: BudgetType = BudgetType.Monthly; // 0
```

### All types live in `types/api.ts`

This file is the single source of truth, derived from the backend OpenAPI contract. Do not redeclare types inline in components or hooks.

### Type imports

Always use `import type` for type-only imports:

```ts
import type { BudgetSummaryDto } from '@/types/api';
```

---

## 7. Component Conventions

### Named exports only

```ts
// CORRECT
export function BudgetCard() { ... }

// WRONG
export default function BudgetCard() { ... }
```

### Component anatomy

```tsx
// 1. Imports
// 2. Types / schema (if file-local)
// 3. Component function
// 4. Sub-components or helpers (only if trivially small and only used here)
```

### Props

Inline the props type on small components. Extract an interface for reusable ones:

```ts
// simple — inline
function StatusBadge({ status }: { status: SavingsGoalStatus }) { ... }

// reusable — named interface
interface BudgetCardProps {
  budget: BudgetSummaryDto;
  onDelete: (id: string) => void;
}
export function BudgetCard({ budget, onDelete }: BudgetCardProps) { ... }
```

### Avoid useEffect for derived state

Compute values inline or with `useMemo`. Only reach for `useEffect` for genuine side effects (subscriptions, imperative DOM APIs).

---

## 8. Forms

All forms use **React Hook Form + Zod**. Define the schema first, derive the type from it.

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.coerce.number().positive('Must be positive'),
});

type FormData = z.infer<typeof schema>;

export function BudgetForm({ onSubmit }: { onSubmit: (data: FormData) => Promise<void> }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      ...
      <Button type="submit" disabled={isSubmitting}>Save</Button>
    </form>
  );
}
```

- Use `z.coerce.number()` for numeric inputs since HTML inputs always return strings.
- Disable the submit button while `isSubmitting` is true.
- Display field errors via `errors.field?.message` below the relevant input.
- API errors (from catch blocks) go into local `useState<string | null>` and render separately.

---

## 9. Routing & Guards

All routes are defined in `app/router.tsx`. There are two guard wrappers:

- **`RequireAuth`** — renders `<Outlet>` if authenticated, redirects to `/login` otherwise.
- **`GuestOnly`** — renders `<Outlet>` if not authenticated, redirects to `/` otherwise.

When adding a new page:
1. Create the page component in `features/<name>/`.
2. Import it in `router.tsx`.
3. Add the route inside the appropriate guard tree.

Do not add navigation items to `Sidebar.tsx` until the page is actually implemented.

---

## 10. Styling

- Use **Tailwind CSS utility classes** directly in JSX. No separate CSS files per component.
- Use `cn()` from `lib/utils.ts` to merge conditional classes:
  ```ts
  import { cn } from '@/lib/utils';
  className={cn('base-classes', isActive && 'active-classes')}
  ```
- Use **shadcn/ui primitives** (`Button`, `Card`, `Input`, `Badge`, `Progress`, etc.) for all common UI elements. Do not hand-roll components that shadcn already provides.
- When adding a new shadcn component, use the CLI: `npx shadcn@latest add <component>`. Do not copy-paste manually.
- Color tokens (`bg-background`, `text-muted-foreground`, `text-destructive`, etc.) come from the Tailwind CSS v4 theme. Use semantic tokens, not raw color values like `text-gray-500`.

---

## 11. Data Display

### Formatting helpers (`lib/formatters.ts`)

Always use these — never format values inline:

| Function | Use for |
|---|---|
| `formatCurrency(n)` | Dollar amounts (`$1,234.56`) |
| `formatCompactCurrency(n)` | Chart axis labels (`$1.5K`) |
| `formatVariance(n)` | Signed variance (`+$50.00`, `-$20.00`) |
| `formatPercent(n)` | Percentages (`42.3%`) |
| `formatDate(str)` | ISO date → `Mar 29, 2026` |
| `formatMonthYear(str)` | ISO date → `March 2026` |

### Charts (Recharts)

- Use `ResponsiveContainer` to fill available width.
- Use `formatCompactCurrency` on Y-axis ticks.
- Use category `color` field from the API when rendering per-category charts (fall back to a Tailwind palette if null).

---

## 12. Path Aliases

The `@/` alias maps to `src/`. Always use it — never use relative paths that traverse up more than one level.

```ts
// CORRECT
import { formatCurrency } from '@/lib/formatters';

// WRONG
import { formatCurrency } from '../../lib/formatters';
```

---

## 13. What NOT to Do

- **Do not use TypeScript `enum`** — the compiler is configured to reject them. Use `as const` objects.
- **Do not use React Context** for state that TanStack Query or Zustand already handle.
- **Do not call `services/api/*` directly from components** — always via a hook in `features/<name>/hooks/`.
- **Do not store the access token in `localStorage`** — it lives in memory only. The refresh token is in `localStorage`.
- **Do not add new global Zustand stores** for server data — that is TanStack Query's job.
- **Do not create ad-hoc utility files** — check `lib/formatters.ts` and `lib/utils.ts` first.
- **Do not create default exports** — all exports are named.
- **Do not add comments** to explain straightforward code. Only comment non-obvious logic.
- **Do not add speculative abstractions** — build only what the current feature needs.
