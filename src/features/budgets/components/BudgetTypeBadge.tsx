import { Badge } from '@/components/ui/badge';
import { BudgetType } from '@/types/api';
import type { BudgetType as BudgetTypeValue } from '@/types/api';

const BUDGET_TYPE_LABELS: Record<BudgetTypeValue, string> = {
  [BudgetType.Monthly]: 'Monthly',
  [BudgetType.Weekly]: 'Weekly',
  [BudgetType.Biweekly]: 'Biweekly',
  [BudgetType.Quarterly]: 'Quarterly',
  [BudgetType.Annual]: 'Annual',
  [BudgetType.Custom]: 'Custom',
};

interface BudgetTypeBadgeProps {
  budgetType: BudgetTypeValue;
}

export function BudgetTypeBadge({ budgetType }: BudgetTypeBadgeProps) {
  return (
    <Badge variant="secondary">{BUDGET_TYPE_LABELS[budgetType] ?? budgetType}</Badge>
  );
}
