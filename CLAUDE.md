# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Coding Standards Reference

Vault: D:\ProjectSharedBase\ProjectShareBase
Standards: Coding Standards/_Standards Index.md
Project tier: 2
Project docs: Projects/BudgetApp/

When making code decisions, reference ALL standards up to and including this project's tier.
Use obsidian MCP tools to search the vault, or read files directly from the vault path.

## Project Overview

Personal finance SPA (React + TypeScript + Vite) that communicates with a .NET REST API backend. JWT auth with silent token refresh. Feature-based folder structure.

## Commands

```bash
npm run dev       # Start Vite dev server (default: http://localhost:5173)
npm run build     # Type-check (tsc -b) then Vite production build
npm run lint      # ESLint across the project
npm run preview   # Serve production build locally
```

The backend .NET API must be running at `VITE_API_URL` (default `https://localhost:7115`, set in `.env`).

No test framework is configured yet.

## Architecture

### Layered data flow

```
Component (page/feature UI)
  └─ TanStack Query hook  (features/<name>/hooks/)
       └─ API service      (services/api/<name>.ts)
            └─ Axios client (services/api/client.ts — attaches JWT, handles 401 refresh)
```

Components never call API services directly — always through a TanStack Query hook. API services always `.then(r => r.data)` to unwrap Axios responses.

### Feature folder structure

Each domain lives under `src/features/` with its own pages, components, and hooks:

```
features/<name>/
├── <Name>Page.tsx          # Route-level page component
├── components/             # Feature-scoped UI components
├── hooks/                  # TanStack Query hooks (useXxxList, useXxxDetail, useXxxMutations)
└── types.ts                # Feature-local types (rare — prefer types/api.ts)
```

Budget create/edit dialogs are opened from BOTH `BudgetListPage` and `BudgetDetailPage`. Refactors to either dialog must update both call sites.

### State management — two layers, never mixed

- **Server state** (API data): TanStack Query. Query hooks live in `features/<name>/hooks/`. Global defaults: `staleTime: 5min`, `retry: 1`.
- **Client state** (auth only): Zustand store in `stores/authStore.ts`. Do not add new Zustand stores for server data.

### Query key convention

`['resource', 'sub']` for lists, `['resource', 'detail', id]` for single items, `['resource', 'sub', id, ...]` for nested. Mutations invalidate related keys including `['dashboard']` when data changes affect summaries.

### Auth token storage

Access token: in-memory only (never localStorage). Refresh token + userId: localStorage under keys `budget_refresh_token` and `budget_user_id`. The Axios response interceptor in `client.ts` handles silent 401 refresh with request queuing. Do not modify `client.ts` for routine feature work.

## Key Conventions

### TypeScript

- **No `enum` keyword** — `erasableSyntaxOnly` is enabled. Use `as const` objects (all defined in `types/api.ts`).
- All API types live in `src/types/api.ts` — single source of truth derived from the backend OpenAPI contract (`Docs/BudgetApp.API.json`).
- All enum values are **string-serialized** (backend uses `JsonStringEnumConverter`): e.g. `"Monthly"`, `"Expense"`, not numeric.
- Always use `import type` for type-only imports.
- `categoriesApi.list()` returns inactive categories too — filter by `c.isActive` when building UI lists/pickers.

### Components & styling

- **Named exports only** — no default exports anywhere.
- Use `@/` path alias for all imports (maps to `src/`). Never use relative paths that go up more than one level.
- Tailwind utility classes directly in JSX. Use `cn()` from `@/lib/utils` for conditional classes.
- Use shadcn/ui primitives (style: `base-nova`). Add new ones via `npx shadcn@latest add <component>`.
- Semantic color tokens (`bg-background`, `text-muted-foreground`), not raw values.
- Financial color semantics: emerald = income/positive, rose = expense/negative, sky = savings, amber = warning.

### Forms

React Hook Form + Zod. Schema first, derive type with `z.infer`. Use `z.coerce.number()` for numeric inputs. Use `zodResolver` from `@hookform/resolvers/zod`. For base-ui Select with react-hook-form, use `Controller` with `value` + `onValueChange` (not `onChange`).

Number inputs that allow sub-1 decimals: keep a local raw-string state and parse on change — driving `value` directly from a parsed number blanks out partial inputs like `0.` and `0.5`.

### Formatting

Always use helpers from `@/lib/formatters.ts` — never format inline:
- `formatCurrency(n)`, `formatCompactCurrency(n)`, `formatVariance(n)`, `formatPercent(n)`, `formatDate(str)`, `formatMonthYear(str)`

For date-input strings (`yyyy-MM-dd`), build from `getFullYear/getMonth/getDate`, not `toISOString().split('T')[0]` — the latter UTC-shifts and rolls back a day for users in negative offsets.

## Reference docs

- `Docs/ARCHITECTURE.md` — full architecture and code standards document
- `Docs/UI-UX.md` — design philosophy, color palette, layout patterns
- `Docs/BudgetApp.API.json` — OpenAPI spec for the backend API
- `Docs/backend-features.md` — backend feature documentation
