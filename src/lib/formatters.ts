import { format, parseISO } from 'date-fns';

// Currency formatter — defaults to USD, can be overridden
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Format an ISO date string (YYYY-MM-DD or full ISO) to a display string
export function formatDate(dateStr: string, pattern = 'MMM d, yyyy'): string {
  return format(parseISO(dateStr), pattern);
}

export function formatMonthYear(dateStr: string): string {
  return format(parseISO(dateStr), 'MMMM yyyy');
}

// Compact number for axis labels (e.g. 1500 → "$1.5K")
export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return formatCurrency(value);
}

// Returns a sign-prefixed string for variance display (+$50.00 or -$50.00)
export function formatVariance(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatCurrency(value)}`;
}
