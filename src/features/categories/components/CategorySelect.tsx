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
  const { data: allCategories = [], isLoading, isError } = useQuery({
    queryKey: ['categories', 'list'],
    // Always fetch without params so all consumers share the ['categories', 'list']
    // cache entry. Client-side filtering keeps cache coherent.
    queryFn: () => categoriesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const available = allCategories.filter(
    (c) =>
      (!filterType || c.categoryType === filterType) &&
      !excludeIds.includes(c.id),
  );

  function handleChange(val: string | null) {
    if (!val) return;
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
      items={{
        ...Object.fromEntries(available.map((cat) => [cat.id, cat.name])),
        __create_new__: '+ Create new category',
      }}
    >
      <SelectTrigger className="w-full" aria-label="Select category" aria-invalid={isError || undefined}>
        <SelectValue
          placeholder={
            isLoading ? 'Loading…' : isError ? 'Failed to load categories' : placeholder
          }
        />
      </SelectTrigger>
      <SelectContent>
        {available.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            {cat.name}
          </SelectItem>
        ))}
        {available.length > 0 && <SelectSeparator />}
        <SelectItem value="__create_new__">+ Create new category</SelectItem>
      </SelectContent>
    </Select>
  );
}
