// src/features/categories/hooks/useCategoryLookup.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '@/services/api/categories';
import type { CategoryDto } from '@/types/api';

/**
 * Returns a Map<categoryId, CategoryDto> built from the shared
 * ['categories', 'list'] query cache. Use this in components that have only
 * a categoryId and need to read icon/color/etc.
 *
 * Re-uses the same query key + staleTime as CategorySelect so this is a
 * cache read in the common case, not a new fetch.
 */
export function useCategoryLookup(): {
  lookup: Map<string, CategoryDto>;
  isLoading: boolean;
  isError: boolean;
} {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['categories', 'list'],
    queryFn: () => categoriesApi.list(),
    staleTime: 10 * 60 * 1000,
  });

  const lookup = useMemo(() => {
    const map = new Map<string, CategoryDto>();
    if (data) {
      for (const c of data) {
        map.set(c.id, c);
      }
    }
    return map;
  }, [data]);

  return { lookup, isLoading, isError };
}
