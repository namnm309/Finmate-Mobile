/**
 * Category Service — Offline-First
 * Reads/writes to local SQLite, sync engine handles server communication.
 */
import { useAuth } from '@/hooks/use-auth';
import * as categoryRepo from '@/lib/db/repositories/categoryRepository';
import { CategoryDto } from '@/lib/types/transaction';

export interface CreateCategoryRequest {
  transactionTypeId: string;
  name: string;
  icon?: string;
  parentCategoryId?: string | null;
}

export interface UpdateCategoryRequest {
  name?: string;
  icon?: string;
  parentCategoryId?: string | null;
}

export const useCategoryService = () => {
  const { userId } = useAuth();

  // Lấy danh sách categories — từ LOCAL
  const getCategories = async (transactionTypeId?: string): Promise<CategoryDto[]> => {
    return categoryRepo.getAllCategories(transactionTypeId);
  };

  // Lấy chi tiết category — từ LOCAL
  const getCategoryById = async (id: string): Promise<CategoryDto> => {
    const result = await categoryRepo.getCategoryById(id);
    if (!result) throw new Error('Không tìm thấy danh mục');
    return result;
  };

  // Tạo category — LOCAL first
  const createCategory = async (data: CreateCategoryRequest): Promise<CategoryDto> => {
    if (!userId) throw new Error('Chưa đăng nhập');
    return categoryRepo.createCategory(data, userId);
  };

  // Cập nhật category — LOCAL first
  const updateCategory = async (id: string, data: UpdateCategoryRequest): Promise<CategoryDto> => {
    const result = await categoryRepo.updateCategory(id, data);
    if (!result) throw new Error('Không tìm thấy danh mục');
    return result;
  };

  // Xóa category — LOCAL first
  const deleteCategory = async (id: string): Promise<{ message: string }> => {
    await categoryRepo.deleteCategory(id);
    return { message: 'Đã xóa danh mục' };
  };

  return {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
