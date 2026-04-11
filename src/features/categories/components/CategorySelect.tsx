// src/features/categories/components/CategorySelect.tsx
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categoriesApi } from '@/services/api/categories';
import type { CategoryDto, CategoryType } from '@/types/api';

interface CategorySelectProps {
  /** Currently selected category id, or null if nothing selected. */
  value: string | null;
  /** Called when the user picks an existing category. */
  onSelect: (cat: CategoryDto) => void;
  /** Called when the user picks the "Create new category" option. */
  onCreateRequest: () => void;
  /** Optionally restrict which category types are shown. */
  filterType?: CategoryType;
  /** Category ids already used in other rows — excluded from the list. */
  excludeIds?: string[];
  disabled?: boolean;
  placeholder?: string;
}

export function CategorySelect({
  value,
  onSelect,
  onCreateRequest,
  filterType,
  excludeIds = [],
  disabled = false,
  placeholder = 'Select a category',
}: CategorySelectProps) {
  const { data: allCategories = [], isLoading } = useQuery({
    queryKey: ['categories', 'list'],
    queryFn: () => categoriesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const available = allCategories.filter(
    (c) =>
      (!filterType || c.categoryType === filterType) &&
      !excludeIds.includes(c.id),
  );

  function handleChange(val: string) {
    if (val === '__create_new__') {
      onCreateRequest();
      return; // do NOT update value — leave the select at its current display
    }
    const cat = available.find((c) => c.id === val);
    if (cat) onSelect(cat);
  }

  return (
    <Select
      value={value ?? ''}
      onValueChange={handleChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full" aria-label="Select category">
        <SelectValue placeholder={isLoading ? 'Loading…' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {available.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            {cat.name}
          </SelectItem>
        ))}
        <SelectSeparator />
        <SelectItem value="__create_new__">+ Create new category</SelectItem>
      </SelectContent>
    </Select>
  );
}
