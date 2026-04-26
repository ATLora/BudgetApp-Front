# Collapsible Sidebar — Design

**Date:** 2026-04-25
**Status:** Approved
**Scope:** UI — `src/components/layout/`

## Goal

Make the app sidebar collapsible. Users on desktop can manually toggle between a full sidebar (icons + labels) and an icons-only rail. The sidebar also responds to viewport size: it auto-collapses to icons-only on tablet widths, and becomes a slide-out drawer on mobile.

## Behavior

### Desktop (≥1024px / Tailwind `lg`)
- Sidebar always visible.
- Manual toggle in the header switches between **expanded** (`w-60`, icons + labels) and **collapsed** (`w-14`, icons only).
- Collapsed/expanded state persists to `localStorage` under the key `budget_sidebar_collapsed` (boolean).
- Width transitions smoothly via `transition-[width] duration-200`.

### Tablet (640px–1023px / `sm`–`md`)
- Sidebar auto-renders in icons-only mode regardless of stored preference.
- Manual toggle in the header is hidden at this breakpoint (no room for full labels, no need for a drawer).
- Stored preference is preserved untouched and re-applies when the viewport returns to desktop width.

### Mobile (<640px)
- Sidebar removed from the document flow; replaced by a slide-out drawer.
- Header shows a hamburger button. Tapping it opens the drawer.
- Drawer renders the **expanded** sidebar content (icons + labels) since space allows it inside the overlay.
- Drawer auto-closes on route change so that navigating away dismisses the overlay.

## Components

### 1. `SidebarContext.tsx` (new)
Path: `src/components/layout/SidebarContext.tsx`

Provides:
```ts
{
  collapsed: boolean;          // desktop user preference
  setCollapsed: (v: boolean) => void;
  toggle: () => void;          // toggles collapsed
  isMobileOpen: boolean;       // drawer state
  setMobileOpen: (v: boolean) => void;
}
```

Responsibilities:
- Initial `collapsed` value read from `localStorage` (key: `budget_sidebar_collapsed`); defaults to `false` (expanded) on absence or parse error.
- `setCollapsed` writes to `localStorage`.
- `isMobileOpen` is in-memory only.

### 2. `useMediaQuery.ts` (new)
Path: `src/hooks/useMediaQuery.ts`

Small util hook returning a boolean for a given media query string. Used by `Header` and `MobileSidebar` to branch on `(min-width: 1024px)` and `(min-width: 640px)`.

### 3. `Sidebar.tsx` (modified)
Path: `src/components/layout/Sidebar.tsx`

Changes:
- Width controlled by `cn('transition-[width] duration-200', collapsed ? 'w-14' : 'w-60')`.
- On tablet (`sm` to before `lg`), force `w-14` via responsive class regardless of context — desktop behavior only kicks in at `lg`.
- Brand label (`BudgetApp` text) hidden when effective width is collapsed; show a single-letter mark (`B`) instead.
- Each `NavLink` wrapped in a `Tooltip` from `@/components/ui/tooltip`. Tooltip content is the link label, anchored to the right side. Tooltip renders only when sidebar is in collapsed/icons-only mode (both manually-collapsed desktop and auto-collapsed tablet).
- Label text inside `NavLink` hidden when collapsed.
- Existing `NavLink` active styling and `cn` usage preserved.

### 4. `MobileSidebar.tsx` (new)
Path: `src/components/layout/MobileSidebar.tsx`

Wraps the sidebar contents inside the existing `<Sheet>` primitive (`@/components/ui/sheet`). Visible only on mobile (`<sm`). Reads `isMobileOpen` and `setMobileOpen` from `SidebarContext`. Renders the full expanded sidebar content (no collapse logic inside the drawer).

Auto-closes on route change: subscribes to `useLocation()` from `react-router-dom` and calls `setMobileOpen(false)` when pathname changes.

### 5. `Header.tsx` (modified)
Path: `src/components/layout/Header.tsx`

Changes:
- New left-aligned button before the existing right-aligned avatar.
  - On mobile (`<sm`): renders `Menu` (lucide) icon, `onClick` calls `setMobileOpen(true)`.
  - On desktop (`≥lg`): renders `PanelLeft` (lucide) icon, `onClick` calls `toggle()`.
  - On tablet (`sm`–`md`): button hidden (icon rail is enough; no toggle path).
- Header layout updates from `justify-end` to `justify-between` to accommodate the new left-side control.

### 6. `AppLayout.tsx` (modified)
Path: `src/components/layout/AppLayout.tsx`

Changes:
- Wraps the entire layout tree in `<SidebarProvider>`.
- Renders both `<Sidebar />` (hidden `<sm`) and `<MobileSidebar />` (hidden `≥sm`). CSS handles which one is visible at the current breakpoint.

## Data flow

```
AppLayout
└─ SidebarProvider             # collapsed state (persisted) + drawer state
   ├─ Sidebar                  # desktop/tablet, width responds to context + breakpoint
   ├─ MobileSidebar            # <sm: Sheet wrapper around sidebar content
   └─ main column
      └─ Header                # toggle button reads context, dispatches toggle / setMobileOpen
```

## Edge cases

- **localStorage missing or invalid**: default to `false` (expanded).
- **Tablet override**: tablet always shows icons-only regardless of stored preference. Stored preference is not mutated.
- **Tooltip noise**: tooltips render only when the sidebar is in icons-only mode. In expanded mode the labels are already visible.
- **Drawer + route change**: drawer closes automatically when `useLocation().pathname` changes, preventing it from staying open after navigation.
- **Active link styling**: existing active/hover styling on `NavLink` preserved unchanged.

## Files touched

**New**
- `src/components/layout/SidebarContext.tsx`
- `src/components/layout/MobileSidebar.tsx`
- `src/hooks/useMediaQuery.ts`

**Modified**
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/AppLayout.tsx`

**No new shadcn primitives required** — `tooltip` and `sheet` are already in the project.

## Out of scope

- Sidebar-edge floating chevron (rejected during brainstorming).
- Drawer for tablet width (icon-rail is sufficient).
- Per-user persistence on the backend (localStorage is enough).
- Any change to existing nav items, routing, or auth header behavior.
