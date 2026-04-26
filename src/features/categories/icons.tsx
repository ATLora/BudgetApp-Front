// src/features/categories/icons.tsx
import {
  Wallet, ShoppingCart, Home, Car,
  Utensils, Plane, Heart, Dumbbell,
  GraduationCap, Briefcase, TrendingUp, Gift,
  Music, Coffee, Baby, Dog,
  Smartphone, Tv, Fuel, Stethoscope,
  Bus, Landmark, Shirt, Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Wallet, ShoppingCart, Home, Car,
  Utensils, Plane, Heart, Dumbbell,
  GraduationCap, Briefcase, TrendingUp, Gift,
  Music, Coffee, Baby, Dog,
  Smartphone, Tv, Fuel, Stethoscope,
  Bus, Landmark, Shirt, Wrench,
};

interface CategoryIconProps {
  iconName: string | null | undefined;
  className?: string;
  fallback?: ReactNode;
}

/**
 * Renders the Lucide icon corresponding to a category's `icon` field.
 * Falls back to the `fallback` node when the icon name is null/undefined or not in the map.
 */
export function CategoryIcon({ iconName, className, fallback = null }: CategoryIconProps): ReactNode {
  if (!iconName) return fallback;
  const Icon = CATEGORY_ICONS[iconName];
  if (!Icon) return fallback;
  return <Icon aria-hidden="true" className={className} />;
}
