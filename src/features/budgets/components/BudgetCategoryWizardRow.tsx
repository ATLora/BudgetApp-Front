// src/features/budgets/components/BudgetCategoryWizardRow.tsx
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

export interface BudgetCategoryWizardRowValue {
  plannedAmount: number;
  notes: string;
  noteOpen: boolean;
}

interface BudgetCategoryWizardRowProps {
  categoryId: string;
  categoryName: string;
  value: BudgetCategoryWizardRowValue;
  onChange: (next: BudgetCategoryWizardRowValue) => void;
}

function amountToInputString(amount: number): string {
  return amount > 0 ? String(amount) : '';
}

export function BudgetCategoryWizardRow({
  categoryId,
  categoryName,
  value,
  onChange,
}: BudgetCategoryWizardRowProps) {
  const inputId = `budget-cat-amount-${categoryId}`;
  const hasNote = value.notes.trim().length > 0;

  // Local raw input string so users can type intermediate values like "0", "0.", "0.5"
  // without the controlled value collapsing them to ''.
  const [raw, setRaw] = useState(() => amountToInputString(value.plannedAmount));

  // Re-sync from props if the parent resets externally (e.g., dialog reopen).
  // We intentionally do NOT sync on every prop change — only when the parent's value
  // would no longer round-trip through our raw string. This preserves user-typed
  // partial input while still reflecting external resets.
  useEffect(() => {
    const parsed = parseFloat(raw);
    const safeParsed = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    if (safeParsed !== value.plannedAmount) {
      setRaw(amountToInputString(value.plannedAmount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.plannedAmount]);

  function handleAmountChange(next: string) {
    setRaw(next);
    const parsed = parseFloat(next);
    const safe = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    onChange({ ...value, plannedAmount: safe });
  }

  function toggleNote() {
    onChange({ ...value, noteOpen: !value.noteOpen });
  }

  function setNotes(text: string) {
    onChange({ ...value, notes: text });
  }

  let noteButtonLabel = '+ Add note';
  if (value.noteOpen) noteButtonLabel = 'Hide note';
  else if (hasNote) noteButtonLabel = 'Edit note';

  return (
    <div className="space-y-1.5 py-1.5">
      <div className="flex items-center gap-3">
        <label htmlFor={inputId} className="flex-1 text-sm">
          {categoryName}
        </label>
        <Input
          id={inputId}
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={raw}
          onChange={(e) => handleAmountChange(e.target.value)}
          className="w-32 text-right"
        />
      </div>
      <div className="pl-0.5">
        <button
          type="button"
          onClick={toggleNote}
          aria-expanded={value.noteOpen}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {noteButtonLabel}
          {!value.noteOpen && hasNote && (
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
          )}
        </button>
        {value.noteOpen && (
          <textarea
            rows={2}
            placeholder="Notes (optional)"
            aria-label={`Notes for ${categoryName}`}
            value={value.notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
          />
        )}
      </div>
    </div>
  );
}
