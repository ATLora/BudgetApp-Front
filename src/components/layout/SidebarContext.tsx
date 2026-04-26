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

function writeStoredCollapsed(v: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    // ignore quota / disabled storage
  }
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState<boolean>(readStoredCollapsed);
  const [isMobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    writeStoredCollapsed(v);
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      writeStoredCollapsed(next);
      return next;
    });
  }, []);

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
