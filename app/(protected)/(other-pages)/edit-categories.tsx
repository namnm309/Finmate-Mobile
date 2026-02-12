import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionTypeService } from '@/lib/services/transactionTypeService';
import { useCategoryService } from '@/lib/services/categoryService';
import { CategoryDto, TransactionTypeDto } from '@/lib/types/transaction';
import { useCategorySelection } from '@/contexts/category-selection-context';

type TabKey = 'expense' | 'income';

type Params = {
  transactionTypeId?: string;
};

export default function EditCategoriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const textOnTint = resolvedTheme === 'dark' ? themeColors.background : '#ffffff';

  const { getTransactionTypes } = useTransactionTypeService();
  const { getCategories } = useCategoryService();
  const { categoriesByType, setCategoriesForType } = useCategorySelection();

  const [transactionTypes, setTransactionTypes] = useState<TransactionTypeDto[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('expense');

  const [expenseCategories, setExpenseCategories] = useState<CategoryDto[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryDto[]>([]);
  const [searchText, setSearchText] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const types = await getTransactionTypes();
      setTransactionTypes(types);

      const expenseType = types.find((t) => t.name === 'Chi tiêu');
      const incomeType = types.find((t) => t.name === 'Thu tiền');

      // Determine default tab from params
      const paramTypeId = params.transactionTypeId;
      if (paramTypeId && incomeType && paramTypeId === incomeType.id) {
        setActiveTab('income');
      } else {
        setActiveTab('expense');
      }

      if (expenseType) {
        const cats = await getCategories(expenseType.id);
        setCategoriesForType(expenseType.id, cats);
        setExpenseCategories(cats);
      } else {
        setExpenseCategories([]);
      }

      if (incomeType) {
        const cats = await getCategories(incomeType.id);
        setCategoriesForType(incomeType.id, cats);
        setIncomeCategories(cats);
      } else {
        setIncomeCategories([]);
      }
    } catch (err) {
      console.error('Error loading categories for edit:', err);
      setError('Không thể tải danh sách hạng mục.');
    } finally {
      setLoading(false);
    }
  }, [params.transactionTypeId]);

  // Refresh khi màn vào focus (và cũng chạy lần đầu khi mở)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const currentCategories =
    activeTab === 'expense' ? expenseCategories : incomeCategories;

  const filteredCategories = currentCategories.filter((cat) =>
    cat.name.toLowerCase().includes(searchText.trim().toLowerCase())
  );

  const getTransactionTypeForTab = (tab: TabKey): TransactionTypeDto | undefined => {
    const expenseType = transactionTypes.find((t) => t.name === 'Chi tiêu');
    const incomeType = transactionTypes.find((t) => t.name === 'Thu tiền');
    return tab === 'expense' ? expenseType : incomeType;
  };

  const handlePressCategory = (category: CategoryDto) => {
    router.push({
      pathname: '/(protected)/(other-pages)/add-category',
      params: {
        categoryId: category.id,
        transactionTypeId: category.transactionTypeId,
      },
    });
  };

  const handleAddCategory = () => {
    const type = getTransactionTypeForTab(activeTab);
    if (!type) return;
    router.push({
      pathname: '/(protected)/(other-pages)/add-category',
      params: {
        transactionTypeId: type.id,
      },
    });
  };

  const renderTabButton = (key: TabKey, label: string) => {
    const isActive = activeTab === key;
    return (
      <TouchableOpacity
        key={key}
        style={{
          flex: 1,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: isActive ? themeColors.tint : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        activeOpacity={0.7}
        onPress={() => setActiveTab(key)}
      >
        <Text
          style={{
            color: isActive ? textOnTint : themeColors.text,
            fontWeight: isActive ? '600' as const : '500' as const,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: themeColors.background }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 4, marginRight: 12 }}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={themeColors.text}
          />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: '600',
            color: themeColors.text,
          }}
        >
          Chỉnh sửa hạng mục
        </Text>
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingBottom: 8,
          gap: 8,
        }}
      >
        {renderTabButton('expense', 'Mục chi')}
        {renderTabButton('income', 'Mục thu')}
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor:
              resolvedTheme === 'dark' ? '#1f2937' : '#f3f4f6',
          }}
        >
          <MaterialIcons
            name="search"
            size={20}
            color={themeColors.textSecondary}
          />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 8,
              color: themeColors.text,
              paddingVertical: 0,
            }}
            placeholder="Tìm kiếm theo tên hạng mục"
            placeholderTextColor={themeColors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {loading ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator color={themeColors.tint} />
        </View>
      ) : error ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              color: themeColors.text,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {error}
          </Text>
          <TouchableOpacity
            onPress={loadData}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: themeColors.tint,
            }}
          >
            <Text style={{ color: textOnTint, fontWeight: '600' }}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          {filteredCategories.length === 0 ? (
            <Text
              style={{
                color: themeColors.textSecondary,
                textAlign: 'center',
                marginTop: 24,
              }}
            >
              Chưa có hạng mục nào
            </Text>
          ) : (
            filteredCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                activeOpacity={0.7}
                onPress={() => handlePressCategory(category)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  marginBottom: 8,
                  backgroundColor: themeColors.card,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    backgroundColor:
                      resolvedTheme === 'dark' ? '#111827' : '#e5e7eb',
                  }}
                >
                  <MaterialIcons
                    name={(category.icon || 'category') as any}
                    size={22}
                    color={themeColors.tint}
                  />
                </View>
                <Text
                  style={{
                    flex: 1,
                    color: themeColors.text,
                    fontSize: 16,
                  }}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* FAB thêm hạng mục */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleAddCategory}
        style={{
          position: 'absolute',
          right: 24,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: themeColors.tint,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <MaterialIcons name="add" size={28} color={textOnTint} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

