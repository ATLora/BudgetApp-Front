import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetName: string;
  onConfirm: () => void;
  isPending: boolean;
  error: string | null;
}

export function DeleteBudgetDialog({
  open,
  onOpenChange,
  budgetName,
  onConfirm,
  isPending,
  error,
}: DeleteBudgetDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Budget</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{budgetName}</strong> and all its
            associated transactions. This action cannot be undone.
          </AlertDialogDescription>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="outline" />} disabled={isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            render={<Button variant="destructive" />}
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? 'Deleting…' : 'Delete Budget'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
