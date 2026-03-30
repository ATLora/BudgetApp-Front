import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Tag,
  PiggyBank,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Budgets', to: '/budgets', icon: Wallet },
  { label: 'Transactions', to: '/transactions', icon: ArrowLeftRight },
  { label: 'Categories', to: '/categories', icon: Tag },
  { label: 'Savings', to: '/savings', icon: PiggyBank },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r bg-sidebar px-3 py-6">
      <div className="mb-8 px-3">
        <span className="text-xl font-semibold tracking-tight text-foreground">BudgetApp</span>
      </div>

      <nav className="flex flex-col gap-1">
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
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
