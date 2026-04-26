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
