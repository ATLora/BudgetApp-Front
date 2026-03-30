import { client } from './client';
import type {
  CategoryDto,
  CategoryListParams,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@/types/api';

export const categoriesApi = {
  list: (params?: CategoryListParams) =>
    client.get<CategoryDto[]>('/api/v1/categories', { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get<CategoryDto>(`/api/v1/categories/${id}`).then((r) => r.data),

  create: (data: CreateCategoryRequest) =>
    client.post<string>('/api/v1/categories', data).then((r) => r.data),

  update: (id: string, data: UpdateCategoryRequest) =>
    client.put(`/api/v1/categories/${id}`, data).then((r) => r.data),
};
