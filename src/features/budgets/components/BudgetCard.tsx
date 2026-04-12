import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Pencil, Trash2, RotateCcw } from 'lucide-react';
import { parseISO } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { BudgetSummaryDto } from '@/types/api';
import { BudgetTypeBadge } from './BudgetTypeBadge';

interface BudgetCardProps {
  budget: BudgetSummaryDto;
  onEdit: (budget: BudgetSummaryDto) => void;
  onDelete: (id: string) => void;
  onRollForward: (id: string) => void;
  isRollingForward: boolean;
  isDeleting: boolean;
}

export function BudgetCard({
  budget,
  onEdit,
  onDelete,
  onRollForward,
  isRollingForward,
  isDeleting,
}: BudgetCardProps) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const periodEnded = parseISO(budget.endDate) < new Date();
  const canRollForward = budget.isRecurring && periodEnded;

  function handleDelete() {
    setDeleteError(null);
    onDelete(budget.id);
  }

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => navigate(`/budgets/${budget.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <BudgetTypeBadge budgetType={budget.budgetType} />
            {budget.isRecurring && (
              <Badge variant="outline" className="text-xs">
                Recurring
              </Badge>
            )}
          </div>
          {/* Stop card click propagation for the menu */}
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Budget actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(budget)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
                {budget.isRecurring && (
                  <DropdownMenuItem
                    onClick={() => canRollForward && onRollForward(budget.id)}
                    disabled={!canRollForward}
                  >
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    Roll Forward
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    setConfirmDelete(true);
                    setDeleteError(null);
                  }}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div>
          <h3 className="font-semibold">{budget.name}</h3>
          <p className="text-xs text-muted-foreground">
            {formatDate(budget.startDate, 'MMM d')} – {formatDate(budget.endDate, 'MMM d, yyyy')}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="font-medium text-emerald-700">
              {formatCurrency(budget.totalIncomePlanned)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="font-medium text-rose-700">
              {formatCurrency(budget.totalExpensesPlanned)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Savings</p>
            <p className="font-medium text-sky-700">
              {formatCurrency(budget.totalSavingsPlanned)}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {budget.categoryCount} {budget.categoryCount === 1 ? 'category' : 'categories'}
        </p>

        {/* Roll Forward quick action */}
        {budget.isRecurring && (
          <div onClick={(e) => e.stopPropagation()}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-block w-full" />}>
                  <span className="inline-block w-full">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={!canRollForward || isRollingForward}
                      onClick={() => onRollForward(budget.id)}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      {isRollingForward ? 'Rolling…' : 'Roll Forward →'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canRollForward && (
                  <TooltipContent>
                    {budget.isRecurring
                      ? 'Available after the current period ends'
                      : 'Only recurring budgets can be rolled forward'}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Inline delete confirm */}
        {confirmDelete && (
          <div
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-medium text-destructive">Delete this budget?</p>
            <p className="text-xs text-muted-foreground">
              Cannot delete if it has transactions.
            </p>
            {deleteError && <p className="mt-1 text-xs text-destructive">{deleteError}</p>}
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setConfirmDelete(false);
                  setDeleteError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
