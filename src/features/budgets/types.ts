// src/features/budgets/types.ts
import type { CategoryDto } from '@/types/api';

/**
 * A budget category row that has been built up in the create-budget form
 * but not yet persisted. `category` is null until the user picks one.
 */
export interface PendingBudgetCategory {
  key: string;               // client-only uuid (crypto.randomUUID())
  category: CategoryDto | null;  // null until the user selects or creates
  plannedAmount: number;
  notes: string;
}
