import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categoriesApi } from '@/services/api/categories';
import type { BudgetCategoryDto } from '@/types/api';

const addSchema = z.object({
  categoryId: z.string().min(1, 'Select a category'),
  plannedAmount: z.number({ invalid_type_error: 'Enter a number' }).min(0),
  notes: z.string().optional(),
});

const editSchema = z.object({
  plannedAmount: z.number({ invalid_type_error: 'Enter a number' }).min(0),
  notes: z.string().optional(),
});

type AddFormData = z.infer<typeof addSchema>;
type EditFormData = z.infer<typeof editSchema>;

interface BudgetCategoryFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  editTarget?: BudgetCategoryDto;
  existingCategoryIds?: string[];
  onAdd: (data: AddFormData) => void;
  onEdit: (catId: string, data: EditFormData) => void;
  isSubmitting: boolean;
  serverError?: string | null;
}

export function BudgetCategoryFormSheet({
  open,
  onOpenChange,
  editTarget,
  existingCategoryIds = [],
  onAdd,
  onEdit,
  isSubmitting,
  serverError,
}: BudgetCategoryFormSheetProps) {
  const isEditMode = !!editTarget;

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'list'],
    queryFn: () => categoriesApi.list(),
    staleTime: 10 * 60 * 1000,
    enabled: open && !isEditMode,
  });

  const availableCategories = (categoriesQuery.data ?? []).filter(
    (c) => !existingCategoryIds.includes(c.id),
  );

  const addForm = useForm<AddFormData>({
    resolver: zodResolver(addSchema),
    defaultValues: { categoryId: '', plannedAmount: 0, notes: '' },
  });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      plannedAmount: editTarget?.plannedAmount ?? 0,
      notes: editTarget?.notes ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditMode && editTarget) {
        editForm.reset({ plannedAmount: editTarget.plannedAmount, notes: editTarget.notes ?? '' });
      } else {
        addForm.reset({ categoryId: '', plannedAmount: 0, notes: '' });
      }
    }
  }, [open, isEditMode, editTarget, addForm, editForm]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditMode ? 'Edit Category Allocation' : 'Add Category'}</SheetTitle>
        </SheetHeader>

        {isEditMode ? (
          <form
            id="budget-cat-form"
            onSubmit={editForm.handleSubmit((data) => onEdit(editTarget!.id, data))}
            className="flex-1 overflow-y-auto px-4 pb-2"
          >
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">
                  {editTarget!.categoryName}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-planned-amount">Planned Amount</Label>
                <Input
                  id="edit-planned-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  aria-invalid={!!editForm.formState.errors.plannedAmount}
                  {...editForm.register('plannedAmount', { valueAsNumber: true })}
                />
                {editForm.formState.errors.plannedAmount && (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.plannedAmount.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-notes">Notes (optional)</Label>
                <textarea
                  id="edit-notes"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  {...editForm.register('notes')}
                />
              </div>
              {serverError && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </p>
              )}
            </div>
          </form>
        ) : (
          <form
            id="budget-cat-form"
            onSubmit={addForm.handleSubmit(onAdd)}
            className="flex-1 overflow-y-auto px-4 pb-2"
          >
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                {categoriesQuery.isLoading ? (
                  <div className="h-8 animate-pulse rounded-lg bg-muted" />
                ) : (
                  <Controller
                    control={addForm.control}
                    name="categoryId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          className="w-full"
                          aria-invalid={!!addForm.formState.errors.categoryId}
                        >
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
                {addForm.formState.errors.categoryId && (
                  <p className="text-xs text-destructive">
                    {addForm.formState.errors.categoryId.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-planned-amount">Planned Amount</Label>
                <Input
                  id="add-planned-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  aria-invalid={!!addForm.formState.errors.plannedAmount}
                  {...addForm.register('plannedAmount', { valueAsNumber: true })}
                />
                {addForm.formState.errors.plannedAmount && (
                  <p className="text-xs text-destructive">
                    {addForm.formState.errors.plannedAmount.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-notes">Notes (optional)</Label>
                <textarea
                  id="add-notes"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  {...addForm.register('notes')}
                />
              </div>
              {serverError && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </p>
              )}
            </div>
          </form>
        )}

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="budget-cat-form" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Add Category'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
