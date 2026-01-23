import { useApiClient, API_BASE_URL } from '@/lib/api';
import { CategoryDto } from '@/lib/types/transaction';

export interface CreateCategoryRequest {
  transactionTypeId: string;
  name: string;
  icon?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  icon?: string;
}

export const useCategoryService = () => {
  const { get, post, put, delete: del } = useApiClient();

  // Lấy danh sách categories (có thể filter theo transactionTypeId)
  const getCategories = async (transactionTypeId?: string): Promise<CategoryDto[]> => {
    const url = transactionTypeId
      ? `${API_BASE_URL}/api/categories?transactionTypeId=${transactionTypeId}`
      : `${API_BASE_URL}/api/categories`;
    return get<CategoryDto[]>(url);
  };

  // Lấy chi tiết category
  const getCategoryById = async (id: string): Promise<CategoryDto> => {
    return get<CategoryDto>(`${API_BASE_URL}/api/categories/${id}`);
  };

  // Tạo category mới
  const createCategory = async (data: CreateCategoryRequest): Promise<CategoryDto> => {
    return post<CategoryDto>(`${API_BASE_URL}/api/categories`, data);
  };

  // Cập nhật category
  const updateCategory = async (id: string, data: UpdateCategoryRequest): Promise<CategoryDto> => {
    return put<CategoryDto>(`${API_BASE_URL}/api/categories/${id}`, data);
  };

  // Xóa category
  const deleteCategory = async (id: string): Promise<{ message: string }> => {
    return del<{ message: string }>(`${API_BASE_URL}/api/categories/${id}`);
  };

  return {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
