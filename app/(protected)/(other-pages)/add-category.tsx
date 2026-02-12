import { MaterialIcons } from '@expo/vector-icons';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCategoryService } from '@/lib/services/categoryService';
import { useTransactionTypeService } from '@/lib/services/transactionTypeService';
import { CategoryDto, TransactionTypeDto } from '@/lib/types/transaction';
import { useCategorySelection } from '@/contexts/category-selection-context';

type Params = {
  categoryId?: string;
  transactionTypeId?: string;
};

const ICON_CANDIDATES: string[] = [
  'restaurant',
  'local-cafe',
  'local-gas-station',
  'shopping-cart',
  'shopping-bag',
  'home',
  'school',
  'directions-car',
  'local-hospital',
  'flight',
  'card-giftcard',
  'payments',
  'trending-up',
  'store',
  'more-horiz',
];

export default function AddOrEditCategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const textOnTint = resolvedTheme === 'dark' ? themeColors.background : '#ffffff';

  const { getCategoryById, createCategory, updateCategory, deleteCategory, getCategories } =
    useCategoryService();
  const { getTransactionTypeById } = useTransactionTypeService();
  const { upsertCategory, removeCategory, setCategoriesForType } =
    useCategorySelection();

  const [transactionType, setTransactionType] = useState<TransactionTypeDto | null>(null);
  const [category, setCategory] = useState<CategoryDto | null>(null);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>('category');
  const [parentCategory, setParentCategory] = useState<CategoryDto | null>(null);

  const [parentCandidates, setParentCandidates] = useState<CategoryDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showIconModal, setShowIconModal] = useState(false);
  const [showParentModal, setShowParentModal] = useState(false);

  const categoryId = params.categoryId as string | undefined;
  const transactionTypeIdParam = params.transactionTypeId as string | undefined;

  const isEditMode = !!categoryId;

  const loadParentCandidates = useCallback(
    async (transactionTypeId: string, currentCategoryId?: string) => {
      try {
        const all = await getCategories(transactionTypeId);
        const roots = all.filter(
          (c) => !c.parentCategoryId && c.id !== currentCategoryId
        );
        setParentCandidates(roots);
      } catch (err) {
        console.error('Error loading parent candidates:', err);
      }
    },
    [getCategories]
  );

  // Load dữ liệu 1 lần khi mở màn (hoặc khi params đổi)
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);

        if (isEditMode && categoryId) {
          const cat = await getCategoryById(categoryId);
          if (!isMounted) return;

          setCategory(cat);
          setName(cat.name);
          setIcon(cat.icon || 'category');

          const type = await getTransactionTypeById(cat.transactionTypeId);
          if (!isMounted) return;
          setTransactionType(type);

          await loadParentCandidates(cat.transactionTypeId, cat.id);
          if (!isMounted) return;

          const parent = cat.parentCategoryId
            ? (await getCategories(cat.transactionTypeId)).find(
                (c) => c.id === cat.parentCategoryId
              ) ?? null
            : null;
          if (!isMounted) return;
          setParentCategory(parent ?? null);
        } else if (transactionTypeIdParam) {
          const type = await getTransactionTypeById(transactionTypeIdParam);
          if (!isMounted) return;

          setTransactionType(type);
          await loadParentCandidates(type.id);
        }
      } catch (err) {
        console.error('Error loading category data:', err);
        if (isMounted) {
          Alert.alert('Lỗi', 'Không thể tải dữ liệu hạng mục.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [categoryId, transactionTypeIdParam, isEditMode]);

  const handleSave = async () => {
    if (!transactionType && !transactionTypeIdParam) {
      Alert.alert('Lỗi', 'Thiếu loại giao dịch cho hạng mục.');
      return;
    }

    const finalTransactionTypeId =
      transactionType?.id ?? (transactionTypeIdParam as string);

    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên hạng mục.');
      return;
    }

    try {
      setSaving(true);

      if (isEditMode && categoryId) {
        const updated = await updateCategory(categoryId, {
          name: trimmedName,
          icon,
          parentCategoryId: parentCategory?.id ?? null,
        });
        upsertCategory(updated);
      } else {
        const created = await createCategory({
          transactionTypeId: finalTransactionTypeId,
          name: trimmedName,
          icon,
          parentCategoryId: parentCategory?.id ?? null,
        });
        upsertCategory(created);
      }

      router.back();
    } catch (err: any) {
      console.error('Error saving category:', err);
      const message =
        err?.message ??
        (typeof err === 'string' ? err : 'Không thể lưu hạng mục. Vui lòng thử lại.');
      Alert.alert('Lỗi', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !categoryId) return;

    Alert.alert(
      'Xóa hạng mục',
      'Bạn có chắc muốn xóa hạng mục này? Các hạng mục con (nếu có) sẽ được đưa về cấp gốc.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await deleteCategory(categoryId);
              const finalTransactionTypeId =
                transactionType?.id ?? (transactionTypeIdParam as string);
              if (finalTransactionTypeId) {
                removeCategory(finalTransactionTypeId, categoryId);
              }
              router.back();
            } catch (err: any) {
              console.error('Error deleting category:', err);
              const message =
                err?.message ??
                (typeof err === 'string'
                  ? err
                  : 'Không thể xóa hạng mục. Vui lòng thử lại.');
              Alert.alert('Lỗi', message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const titlePrefix =
    transactionType?.name === 'Thu tiền' ? 'thu' : 'chi';
  const screenTitle = isEditMode
    ? `Sửa hạng mục ${titlePrefix}`
    : `Thêm hạng mục ${titlePrefix}`;

  const renderIconPickerModal = () => (
    <Modal
      visible={showIconModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowIconModal(false)}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        activeOpacity={1}
        onPress={() => setShowIconModal(false)}
      >
        <View
          style={{
            width: '85%',
            borderRadius: 16,
            padding: 16,
            backgroundColor: themeColors.card,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: themeColors.text,
              marginBottom: 12,
            }}
          >
            Chọn icon
          </Text>
          <ScrollView
            contentContainerStyle={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {ICON_CANDIDATES.map((iconName) => (
              <TouchableOpacity
                key={iconName}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    icon === iconName ? themeColors.tint : themeColors.background,
                }}
                activeOpacity={0.7}
                onPress={() => {
                  setIcon(iconName);
                  setShowIconModal(false);
                }}
              >
                <MaterialIcons
                  name={iconName as any}
                  size={28}
                  color={icon === iconName ? textOnTint : themeColors.text}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderParentPickerModal = () => (
    <Modal
      visible={showParentModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowParentModal(false)}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        activeOpacity={1}
        onPress={() => setShowParentModal(false)}
      >
        <View
          style={{
            width: '85%',
            maxHeight: '70%',
            borderRadius: 16,
            padding: 16,
            backgroundColor: themeColors.card,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: themeColors.text,
              marginBottom: 12,
            }}
          >
            Chọn hạng mục cha
          </Text>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setParentCategory(null);
                setShowParentModal(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
              }}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={themeColors.textSecondary}
              />
              <Text
                style={{
                  marginLeft: 8,
                  color: themeColors.text,
                }}
              >
                Không chọn hạng mục cha
              </Text>
            </TouchableOpacity>

            {parentCandidates.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.7}
                onPress={() => {
                  setParentCategory(cat);
                  setShowParentModal(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                    backgroundColor:
                      resolvedTheme === 'dark' ? '#111827' : '#e5e7eb',
                  }}
                >
                  <MaterialIcons
                    name={(cat.icon || 'category') as any}
                    size={20}
                    color={themeColors.tint}
                  />
                </View>
                <Text
                  style={{
                    flex: 1,
                    color: themeColors.text,
                  }}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: themeColors.background }}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator color={themeColors.tint} />
        </View>
      </SafeAreaView>
    );
  }

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
          {screenTitle}
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
        {/* Tên & icon */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowIconModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.border,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              backgroundColor:
                resolvedTheme === 'dark' ? '#111827' : '#e5e7eb',
            }}
          >
            <MaterialIcons
              name={(icon || 'category') as any}
              size={24}
              color={themeColors.tint}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                color: themeColors.textSecondary,
                marginBottom: 2,
              }}
            >
              Chọn icon
            </Text>
            <TextInput
              style={{
                color: themeColors.text,
                fontSize: 16,
                paddingVertical: 0,
              }}
              placeholder="Tên hạng mục"
              placeholderTextColor={themeColors.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>
        </TouchableOpacity>

        {/* Hạng mục cha */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowParentModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.border,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              backgroundColor:
                resolvedTheme === 'dark' ? '#111827' : '#e5e7eb',
            }}
          >
            <MaterialIcons
              name={
                (parentCategory?.icon || icon || 'category') as any
              }
              size={24}
              color={themeColors.tint}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                color: themeColors.textSecondary,
                marginBottom: 2,
              }}
            >
              Chọn hạng mục cha
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: parentCategory
                  ? themeColors.text
                  : themeColors.textSecondary,
              }}
            >
              {parentCategory ? parentCategory.name : 'Không có'}
            </Text>
          </View>
          {parentCategory && (
            <TouchableOpacity
              onPress={() => setParentCategory(null)}
              activeOpacity={0.7}
              style={{ padding: 4 }}
            >
              <MaterialIcons
                name="close"
                size={18}
                color={themeColors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Buttons */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 32,
            gap: 12,
          }}
        >
          {isEditMode && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDelete}
              disabled={saving}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#F97373',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: '#F97373',
                  fontWeight: '600',
                }}
              >
                Xóa
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 999,
              backgroundColor: saving ? themeColors.muted : themeColors.tint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: textOnTint,
                fontWeight: '600',
              }}
            >
              {saving ? 'Đang lưu...' : 'Lưu lại'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderIconPickerModal()}
      {renderParentPickerModal()}
    </SafeAreaView>
  );
}

