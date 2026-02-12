import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { CategoryDto } from '@/lib/types/transaction';

type CategoriesByType = Record<string, CategoryDto[]>;

type CategorySelectionContextValue = {
  // Chọn hạng mục tạm thời (trả kết quả về màn trước)
  pendingSelectedCategory: CategoryDto | null;
  setPendingSelectedCategory: (category: CategoryDto | null) => void;
  clearPendingSelectedCategory: () => void;

  // State dùng chung cho danh sách hạng mục theo TransactionType
  categoriesByType: CategoriesByType;
  setCategoriesForType: (transactionTypeId: string, categories: CategoryDto[]) => void;
  upsertCategory: (category: CategoryDto) => void;
  removeCategory: (transactionTypeId: string, categoryId: string) => void;
};

const CategorySelectionContext =
  createContext<CategorySelectionContextValue | null>(null);

export function CategorySelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingSelectedCategory, setPendingSelectedCategoryState] =
    useState<CategoryDto | null>(null);
  const [categoriesByType, setCategoriesByType] = useState<CategoriesByType>({});

  const setPendingSelectedCategory = useCallback(
    (category: CategoryDto | null) => {
      setPendingSelectedCategoryState(category);
    },
    []
  );

  const clearPendingSelectedCategory = useCallback(() => {
    setPendingSelectedCategoryState(null);
  }, []);

  const setCategoriesForType = useCallback(
    (transactionTypeId: string, categories: CategoryDto[]) => {
      setCategoriesByType((prev) => ({
        ...prev,
        [transactionTypeId]: categories,
      }));
    },
    []
  );

  const upsertCategory = useCallback((category: CategoryDto) => {
    setCategoriesByType((prev) => {
      const list = prev[category.transactionTypeId] ?? [];
      const index = list.findIndex((c) => c.id === category.id);
      let nextList: CategoryDto[];

      if (index >= 0) {
        nextList = [...list];
        nextList[index] = category;
      } else {
        nextList = [...list, category];
      }

      return {
        ...prev,
        [category.transactionTypeId]: nextList,
      };
    });
  }, []);

  const removeCategory = useCallback(
    (transactionTypeId: string, categoryId: string) => {
      setCategoriesByType((prev) => {
        const list = prev[transactionTypeId];
        if (!list) return prev;

        const nextList = list.filter((c) => c.id !== categoryId);
        return {
          ...prev,
          [transactionTypeId]: nextList,
        };
      });
    },
    []
  );

  const value = useMemo<CategorySelectionContextValue>(
    () => ({
      pendingSelectedCategory,
      setPendingSelectedCategory,
      clearPendingSelectedCategory,
      categoriesByType,
      setCategoriesForType,
      upsertCategory,
      removeCategory,
    }),
    [
      pendingSelectedCategory,
      setPendingSelectedCategory,
      clearPendingSelectedCategory,
      categoriesByType,
      setCategoriesForType,
      upsertCategory,
      removeCategory,
    ]
  );

  return (
    <CategorySelectionContext.Provider value={value}>
      {children}
    </CategorySelectionContext.Provider>
  );
}

export function useCategorySelection() {
  const ctx = useContext(CategorySelectionContext);
  if (!ctx) {
    throw new Error(
      'useCategorySelection must be used within CategorySelectionProvider'
    );
  }
  return ctx;
}

