// src/features/categories/components/NewCategoryInlineForm.tsx
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { CategoryType } from '@/types/api';
import type { CategoryDto } from '@/types/api';
import { IconPicker } from './IconPicker';
import { ColorSwatchPicker } from './ColorSwatchPicker';

interface NewCategoryInlineFormProps {
  /** Called with the fully-resolved CategoryDto after the API call succeeds. */
  onCreated: (cat: CategoryDto) => void;
  onCancel: () => void;
}

export function NewCategoryInlineForm({ onCreated, onCancel }: NewCategoryInlineFormProps) {
  const [name, setName] = useState('');
  const [categoryType, setCategoryType] = useState<string>('');
  const [icon, setIcon] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const isValid = name.trim().length > 0 && categoryType !== '';

  async function handleConfirm() {
    if (!isValid) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const id = await categoriesApi.create({
        name: name.trim(),
        categoryType: categoryType as CategoryDto['categoryType'],
        icon,
        color,
      });
      const created = await categoriesApi.getById(id);
      queryClient.invalidateQueries({ queryKey: ['categories', 'list'] });
      onCreated(created);
    } catch {
      setError('Failed to create category. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        New category
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="new-cat-name" className="text-xs">Name</Label>
        <Input
          id="new-cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Housing"
          autoFocus
          disabled={isSubmitting}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Type</Label>
        <Select value={categoryType} onValueChange={(val) => { if (val !== null) setCategoryType(val); }}>
          <SelectTrigger className="w-full" disabled={isSubmitting}>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CategoryType.Income}>Income</SelectItem>
            <SelectItem value={CategoryType.Expense}>Expense</SelectItem>
            <SelectItem value={CategoryType.Savings}>Savings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Icon (optional)</Label>
        <IconPicker value={icon} onChange={setIcon} disabled={isSubmitting} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Color (optional)</Label>
        <ColorSwatchPicker value={color} onChange={setColor} disabled={isSubmitting} />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!isValid || isSubmitting}
          onClick={handleConfirm}
        >
          {isSubmitting ? 'Creating…' : 'Create'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
