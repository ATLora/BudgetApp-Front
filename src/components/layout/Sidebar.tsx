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
