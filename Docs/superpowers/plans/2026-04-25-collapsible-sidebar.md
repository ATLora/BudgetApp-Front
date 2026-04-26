# Collapsible Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app sidebar manually collapsible on desktop (full ↔ icons-only), auto-collapsed on tablet, and replaced by a slide-out drawer on mobile, with the user's desktop preference persisted to localStorage.

**Architecture:** A new `SidebarProvider` context owns two pieces of state — a persisted `collapsed` boolean (desktop preference) and an in-memory `isMobileOpen` boolean (drawer state). The provider also exposes a derived `effectiveCollapsed` boolean: `true` whenever the viewport is below `lg` OR when the user has manually collapsed on desktop. The existing `Sidebar` reads `effectiveCollapsed` to render full vs icons-only — no responsive class juggling inside. A new `MobileSidebar` wraps the same nav content in a `<Sheet>` and is visible only on mobile. The `Header` gets a single left-side toggle button whose icon and behavior swap at the breakpoint.

**Tech Stack:** React 18 + TypeScript, Tailwind v4, base-ui (shadcn `Sheet`, `Tooltip`), react-router-dom, lucide-react.

**Verification approach:** This project has no test framework. Each task verifies via (a) `npm run build` for type safety, (b) `npm run lint` for style, and (c) browser preview checks at the natural integration points. Granular verification points are listed inline.

**Spec reference:** [docs/superpowers/specs/2026-04-25-collapsible-sidebar-design.md](../specs/2026-04-25-collapsible-sidebar-design.md)

---

## File Structure

**New files:**
- `src/hooks/useMediaQuery.ts` — small hook returning a boolean for a CSS media query string. Listens to `matchMedia` changes.
- `src/components/layout/SidebarContext.tsx` — React context + provider. Owns `collapsed` (persisted user preference), `setCollapsed`, `toggle`, `isMobileOpen`, `setMobileOpen`, plus derived `isDesktop` and `effectiveCollapsed`.
- `src/components/layout/navItems.ts` — shared nav items array used by both `Sidebar` and `MobileSidebar`.
- `src/components/layout/MobileSidebar.tsx` — `<Sheet>`-wrapped sidebar nav for mobile. Reads `isMobileOpen` from context, auto-closes on route change.

**Modified files:**
- `src/components/layout/Sidebar.tsx` — extract nav items, support `collapsed` mode (icons-only with tooltips), add responsive width classes.
- `src/components/layout/Header.tsx` — add left-side toggle button with breakpoint-aware icon and behavior; switch layout to `justify-between`.
- `src/components/layout/AppLayout.tsx` — wrap tree in `SidebarProvider`, render `MobileSidebar` alongside desktop `Sidebar`, add `TooltipProvider`.

**Responsibility split:** `SidebarContext` owns state + persistence only. `Sidebar` owns the desktop/tablet visual presentation. `MobileSidebar` owns the drawer-specific composition. `Header` owns the toggle UI. This keeps each file focused on a single concern; the existing `Sidebar` is small enough that adding collapsed-mode logic in place doesn't push it over the line.

---

## Task 1: `useMediaQuery` hook

**Files:**
- Create: `src/hooks/useMediaQuery.ts`

- [ ] **Step 1: Create the hook file**

Write `src/hooks/useMediaQuery.ts`:

```ts
import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: passes (file has no consumers yet, just compiles cleanly).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMediaQuery.ts
git commit -m "feat(layout): add useMediaQuery hook"
```

---

## Task 2: `SidebarContext` provider

**Files:**
- Create: `src/components/layout/SidebarContext.tsx`

- [ ] **Step 1: Write the context + provider**

Create `src/components/layout/SidebarContext.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const STORAGE_KEY = 'budget_sidebar_collapsed';

type SidebarContextValue = {
  /** User's manual desktop preference. Persisted to localStorage. */
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  /** Toggles `collapsed`. No-op semantics on tablet (button is hidden). */
  toggle: () => void;
  /** True when viewport is `lg` (>=1024px) or wider. */
  isDesktop: boolean;
  /** Convenience: true when sidebar should render in icons-only mode. */
  effectiveCollapsed: boolean;
  /** Mobile drawer open/close. */
  isMobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readStoredCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return false;
    return JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState<boolean>(readStoredCollapsed);
  const [isMobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    } catch {
      // ignore quota / disabled storage
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setCollapsedState(readStoredCollapsed());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Desktop: respect user preference. Tablet (sm-md): always collapsed.
  // Mobile is handled separately by MobileSidebar — Sidebar itself is hidden.
  const effectiveCollapsed = isDesktop ? collapsed : true;

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed,
        toggle,
        isDesktop,
        effectiveCollapsed,
        isMobileOpen,
        setMobileOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used inside SidebarProvider');
  return ctx;
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/SidebarContext.tsx
git commit -m "feat(layout): add SidebarProvider context with localStorage persistence"
```

---

## Task 3: Refactor `Sidebar` to support collapsed mode

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Extract nav items into a shared module**

Create `src/components/layout/navItems.ts`:

```ts
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Tag,
  PiggyBank,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
};

export const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Budgets', to: '/budgets', icon: Wallet },
  { label: 'Transactions', to: '/transactions', icon: ArrowLeftRight },
  { label: 'Categories', to: '/categories', icon: Tag },
  { label: 'Savings', to: '/savings', icon: PiggyBank },
];
```

- [ ] **Step 2: Rewrite `Sidebar.tsx` with collapsed support**

Replace the entire contents of `src/components/layout/Sidebar.tsx`:

```tsx
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from './SidebarContext';
import { navItems, type NavItem } from './navItems';

export function Sidebar() {
  const { effectiveCollapsed } = useSidebar();

  return (
    <aside
      className={cn(
        'hidden h-full flex-col border-r bg-sidebar py-6 transition-[width] duration-200 sm:flex',
        effectiveCollapsed ? 'w-14 px-2' : 'w-60 px-3',
      )}
      data-collapsed={effectiveCollapsed}
    >
      <div
        className={cn(
          'mb-8 flex h-8 items-center',
          effectiveCollapsed ? 'justify-center' : 'px-3',
        )}
      >
        <span className="text-xl font-semibold tracking-tight text-foreground">
          {effectiveCollapsed ? 'B' : 'BudgetApp'}
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <SidebarNavLink
            key={item.to}
            item={item}
            collapsed={effectiveCollapsed}
          />
        ))}
      </nav>
    </aside>
  );
}

function SidebarNavLink({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const { label, to, icon: Icon, end } = item;

  const link = (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-0' : 'px-3',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );

  // Only wrap in a tooltip when collapsed — when expanded, the visible label
  // already conveys the same information.
  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
```

> **Note for the implementing engineer:** base-ui's `TooltipTrigger` accepts a `render` prop that takes a React element and merges trigger props into it — this preserves the `NavLink`'s active styling and routing behavior. See [src/components/ui/tooltip.tsx](src/components/ui/tooltip.tsx) for the primitives.

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: passes. The `useSidebar` import will fail until the provider is wired up in `AppLayout` at runtime, but compilation succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/components/layout/navItems.ts
git commit -m "feat(layout): add collapsed/icons-only mode to Sidebar"
```

---

## Task 4: `MobileSidebar` drawer

**Files:**
- Create: `src/components/layout/MobileSidebar.tsx`

- [ ] **Step 1: Create the mobile drawer**

Create `src/components/layout/MobileSidebar.tsx`:

```tsx
import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useSidebar } from './SidebarContext';
import { navItems } from './navItems';

export function MobileSidebar() {
  const { isMobileOpen, setMobileOpen } = useSidebar();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    // Close drawer whenever the route changes.
    // setMobileOpen identity is stable from useCallback in the provider.
  }, [location.pathname, setMobileOpen]);

  return (
    <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent
        side="left"
        className="flex w-60 flex-col bg-sidebar p-0 sm:max-w-sm"
      >
        <div className="mb-8 px-6 pt-6">
          <span className="text-xl font-semibold tracking-tight text-foreground">
            BudgetApp
          </span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/MobileSidebar.tsx
git commit -m "feat(layout): add MobileSidebar drawer for small screens"
```

---

## Task 5: Update `Header` with toggle button

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Add toggle button**

Replace the entire contents of `src/components/layout/Header.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, PanelLeft, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from './SidebarContext';

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toggle, setMobileOpen } = useSidebar();

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '?';

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      {/* Left: toggle button — Menu (drawer) on mobile, PanelLeft (collapse) on desktop, hidden on tablet */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="hidden lg:inline-flex"
          onClick={toggle}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: user menu (unchanged) */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 hover:bg-accent outline-none">
          <span className="sr-only">User menu</span>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          {user && (
            <span className="hidden text-sm font-medium sm:block">
              {user.firstName} {user.lastName}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem disabled className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="flex items-center gap-2 text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat(layout): add sidebar toggle button to Header"
```

---

## Task 6: Wire it all together in `AppLayout`

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Wrap the layout in providers**

Replace the entire contents of `src/components/layout/AppLayout.tsx`:

```tsx
import { Outlet } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from './Sidebar';
import { MobileSidebar } from './MobileSidebar';
import { Header } from './Header';
import { SidebarProvider } from './SidebarContext';

export function AppLayout() {
  return (
    <SidebarProvider>
      <TooltipProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar />
          <MobileSidebar />

          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />

            <main className="flex-1 overflow-y-auto p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </TooltipProvider>
    </SidebarProvider>
  );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npm run build && npm run lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat(layout): wire SidebarProvider and MobileSidebar into AppLayout"
```

---

## Task 7: Browser preview verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Use `preview_start` to launch `npm run dev`.

- [ ] **Step 2: Verify desktop expanded (default)**

- Resize preview to 1280×800 via `preview_resize`.
- Sign in (or use existing session) and land on `/`.
- `preview_snapshot` — confirm sidebar is full width with both icons and text labels visible (`Dashboard`, `Budgets`, etc.).
- `preview_screenshot` — capture for the user.

- [ ] **Step 3: Verify desktop manual collapse**

- `preview_click` on the `PanelLeft` button in the header (aria-label `Toggle sidebar`).
- `preview_snapshot` — confirm sidebar is now ~`w-14`, labels hidden, icons centered.
- `preview_hover` over an icon (e.g. Budgets) — `preview_snapshot` should show a tooltip with the label.
- `preview_screenshot` — capture.

- [ ] **Step 4: Verify persistence**

- With sidebar still collapsed, run `preview_eval` with `window.location.reload()`.
- After reload, `preview_snapshot` — sidebar should still be collapsed.
- `preview_eval` with `window.localStorage.getItem('budget_sidebar_collapsed')` — expect `"true"`.

- [ ] **Step 5: Verify tablet auto-collapse**

- `preview_resize` to 800×900.
- `preview_snapshot` — sidebar should be icons-only regardless of stored preference.
- Toggle button in header should be hidden (no `Toggle sidebar` button visible).
- Hamburger should also be hidden.

- [ ] **Step 6: Verify mobile drawer**

- `preview_resize` to 375×800.
- `preview_snapshot` — sidebar (aside) should be hidden; hamburger button (`Open menu`) visible in header.
- `preview_click` on the hamburger.
- `preview_snapshot` — drawer should slide in from the left with full nav (icons + labels).
- `preview_click` on a nav link (e.g. Budgets).
- `preview_snapshot` — drawer should auto-close, route changed to `/budgets`.

- [ ] **Step 7: Re-expand on desktop**

- `preview_resize` back to 1280×800.
- Sidebar should restore to collapsed (per stored preference).
- `preview_click` the toggle — sidebar expands.
- `preview_eval` `window.localStorage.getItem('budget_sidebar_collapsed')` — expect `"false"`.

- [ ] **Step 8: Check console for errors**

Run `preview_console_logs` — expect no errors related to sidebar/context/tooltip.

- [ ] **Step 9: Final commit (only if any tweaks were made)**

If steps 2-8 surfaced any issues, fix them in the relevant file and commit:

```bash
git add <files>
git commit -m "fix(layout): <specific fix>"
```

If no tweaks were needed, skip this step — verification doesn't need its own commit.

---

## Self-review notes

**Spec coverage:**
- Desktop expand/collapse with persistence → Tasks 2, 3, 5, 6
- Tablet auto icons-only → Task 3 (responsive classes), Task 5 (toggle hidden)
- Mobile drawer with hamburger → Tasks 4, 5
- Drawer auto-close on route change → Task 4
- Tooltips on collapsed icons → Task 3
- localStorage edge cases (missing, invalid) → Task 2 (`readStoredCollapsed`)
- Brand mark swap (`BudgetApp` ↔ `B`) → Task 3 (`BrandMark`)

All spec sections are covered.

**Type consistency:** Hook is `useSidebar`, context is `SidebarContext`, provider is `SidebarProvider`. Storage key `budget_sidebar_collapsed` used consistently in Task 2 and verification step 4 + 7. `setMobileOpen`, `toggle`, `collapsed` all match between Tasks 2, 3, 4, 5.

**No placeholders:** every code step contains the actual code; every command step contains the actual command and expected outcome.
