import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCategoryService } from '@/lib/services/categoryService';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { useTransactionService } from '@/lib/services/transactionService';
import { useTransactionTypeService } from '@/lib/services/transactionTypeService';
import { MoneySourceDto } from '@/lib/types/moneySource';
import { CategoryDto, TransactionTypeDto } from '@/lib/types/transaction';
import { useCategorySelection } from '@/contexts/category-selection-context';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CategoryPickerProps {
  categories: CategoryDto[];
  selectedCategory: CategoryDto | null;
  onChange: (category: CategoryDto) => void;
  themeColors: (typeof Colors)['light'];
  isDark: boolean;
  transactionTypeId?: string;
}

function CategoryPicker({
  categories,
  selectedCategory,
  onChange,
  themeColors,
  isDark,
  transactionTypeId,
}: CategoryPickerProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [frequentExpanded, setFrequentExpanded] = useState(true);

  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredCategories =
    normalizedSearch.length === 0
      ? categories
      : categories.filter((category) =>
          category.name.toLowerCase().includes(normalizedSearch)
        );

  const frequentCategories = filteredCategories.slice(0, 7);
  const row1Categories = frequentCategories.slice(0, 4);
  const row2Categories = frequentCategories.slice(4, 7);
  const otherCategories = filteredCategories.slice(7);

  const handleSelectCategory = (category: CategoryDto, closeModal?: boolean) => {
    onChange(category);
    if (closeModal) {
      setShowModal(false);
    }
  };

  return (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity
            style={[styles.categoryButton, { backgroundColor: themeColors.card }]}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: '/(protected)/(other-pages)/select-category',
                params: transactionTypeId ? { transactionTypeId } : {},
              })
            }>
            {selectedCategory ? (
              <>
                <View style={styles.categoryIconContainer}>
                  <MaterialIcons
                    name={(selectedCategory.icon || 'category') as any}
                    size={20}
                    color={themeColors.tint}
                  />
                </View>
                <Text style={[styles.categoryButtonText, { color: themeColors.text }]}>
                  {selectedCategory.name}
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons name="add" size={20} color={themeColors.tint} />
                <Text style={[styles.categoryButtonText, { color: themeColors.tint }]}>
                  Chọn hạng mục
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterButton}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: '/(protected)/(other-pages)/select-category',
                params: transactionTypeId ? { transactionTypeId } : {},
              })
            }>
            <Text style={[styles.filterText, { color: themeColors.textSecondary }]}>
              Tất cả
            </Text>
            <MaterialIcons name="arrow-drop-down" size={20} color={themeColors.muted} />
          </TouchableOpacity>
        </View>

        {/* Frequent Categories */}
        <View
          style={[
            styles.frequentSection,
            { backgroundColor: themeColors.card },
          ]}>
          <View style={styles.frequentHeader}>
            <Text style={[styles.frequentTitle, { color: themeColors.text }]}>
              Hay dùng
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setFrequentExpanded((prev) => !prev)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <MaterialIcons
                name={frequentExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={24}
                color={themeColors.muted}
              />
            </TouchableOpacity>
          </View>

          {!frequentExpanded ? null : filteredCategories.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text
                style={{
                  color: themeColors.textSecondary,
                  fontSize: 14,
                }}>
                Chưa có hạng mục nào
              </Text>
            </View>
          ) : (
            <>
              {/* Row 1: First 4 categories */}
              <View style={styles.categoryRow}>
                {row1Categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      { backgroundColor: themeColors.card },
                      selectedCategory?.id === category.id && {
                        borderColor: themeColors.tint,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => handleSelectCategory(category)}
                    activeOpacity={0.7}>
                    <View style={styles.categoryIconContainer}>
                      <MaterialIcons
                        name={(category.icon || 'category') as any}
                        size={20}
                        color={
                          selectedCategory?.id === category.id
                            ? themeColors.tint
                            : themeColors.muted
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryItemText,
                        { color: themeColors.textSecondary },
                        selectedCategory?.id === category.id && {
                          color: themeColors.tint,
                          fontWeight: '600',
                        },
                      ]}
                      numberOfLines={1}>
                      {category.name}
                    </Text>
                    {selectedCategory?.id === category.id && (
                      <View style={styles.starIcon}>
                        <MaterialIcons name="star" size={12} color="#FBBF24" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
                {/* Fill empty slots in row 1 */}
                {row1Categories.length < 4 &&
                  Array(4 - row1Categories.length)
                    .fill(0)
                    .map((_, i) => (
                      <View
                        key={`empty1-${i}`}
                        style={[styles.categoryItem, { opacity: 0 }]}
                      />
                    ))}
              </View>

              {/* Row 2: Next 3 categories + "Khác" button */}
              <View style={styles.categoryRow}>
                {row2Categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      { backgroundColor: themeColors.card },
                      selectedCategory?.id === category.id && {
                        borderColor: themeColors.tint,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => handleSelectCategory(category)}
                    activeOpacity={0.7}>
                    <View style={styles.categoryIconContainer}>
                      <MaterialIcons
                        name={(category.icon || 'category') as any}
                        size={20}
                        color={
                          selectedCategory?.id === category.id
                            ? themeColors.tint
                            : themeColors.muted
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryItemText,
                        { color: themeColors.textSecondary },
                        selectedCategory?.id === category.id && {
                          color: themeColors.tint,
                          fontWeight: '600',
                        },
                      ]}
                      numberOfLines={1}>
                      {category.name}
                    </Text>
                    {selectedCategory?.id === category.id && (
                      <View style={styles.starIcon}>
                        <MaterialIcons name="star" size={12} color="#FBBF24" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

                {/* "Khác" button - luôn mở màn chọn hạng mục đầy đủ */}
                {(otherCategories.length > 0 || row2Categories.length < 3) && (
                  <TouchableOpacity
                    style={[
                      styles.categoryItem,
                      { backgroundColor: themeColors.card },
                    ]}
                    onPress={() => setShowModal(true)}
                    activeOpacity={0.7}>
                    <View style={styles.categoryIconContainer}>
                      <MaterialIcons
                        name="more-horiz"
                        size={20}
                        color={themeColors.muted}
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryItemText,
                        { color: themeColors.textSecondary },
                      ]}>
                      Khác
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Fill empty slots in row 2 */}
                {row2Categories.length < 3 &&
                  otherCategories.length === 0 &&
                  Array(3 - row2Categories.length)
                    .fill(0)
                    .map((_, i) => (
                      <View
                        key={`empty2-${i}`}
                        style={[styles.categoryItem, { opacity: 0 }]}
                      />
                    ))}
              </View>
            </>
          )}
        </View>
      </View>

      {/* Full category picker modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowModal(false)}>
          <View style={styles.modalContainer}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View
                style={[
                  styles.modalContent,
                  { backgroundColor: themeColors.card },
                ]}>
                <View
                  style={[
                    styles.modalHeader,
                    { borderBottomColor: themeColors.border },
                  ]}>
                  <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                    Chọn hạng mục
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowModal(false)}
                    activeOpacity={0.7}>
                    <MaterialIcons
                      name="close"
                      size={24}
                      color={themeColors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Search box */}
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingBottom: 8,
                  }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: Platform.OS === 'ios' ? 10 : 6,
                      backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                    }}>
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

                <ScrollView
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}>
                  {/* Frequent section in modal */}
                  {frequentCategories.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text
                        style={[
                          styles.frequentTitle,
                          { color: themeColors.text, marginBottom: 8 },
                        ]}>
                        Hay dùng
                      </Text>
                      <View style={styles.modalCategoryGrid}>
                        {frequentCategories.map((category) => (
                          <TouchableOpacity
                            key={category.id}
                            style={[
                              styles.modalCategoryItem,
                              { backgroundColor: themeColors.card },
                              selectedCategory?.id === category.id && {
                                borderColor: themeColors.tint,
                                borderWidth: 2,
                              },
                            ]}
                            onPress={() => handleSelectCategory(category, true)}
                            activeOpacity={0.7}>
                            <View style={styles.modalCategoryIconContainer}>
                              <MaterialIcons
                                name={(category.icon || 'category') as any}
                                size={24}
                                color={
                                  selectedCategory?.id === category.id
                                    ? themeColors.tint
                                    : '#99a1af'
                                }
                              />
                            </View>
                            <Text
                              style={[
                                styles.modalCategoryText,
                                { color: themeColors.textSecondary },
                                selectedCategory?.id === category.id && {
                                  color: themeColors.tint,
                                  fontWeight: '600',
                                },
                              ]}
                              numberOfLines={1}>
                              {category.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* All categories section */}
                  <View>
                    <Text
                      style={[
                        styles.frequentTitle,
                        { color: themeColors.text, marginBottom: 8 },
                      ]}>
                      Tất cả hạng mục
                    </Text>
                    <View style={styles.modalCategoryGrid}>
                      {filteredCategories.map((category) => (
                        <TouchableOpacity
                          key={`all-${category.id}`}
                          style={[
                            styles.modalCategoryItem,
                            { backgroundColor: themeColors.card },
                            selectedCategory?.id === category.id && {
                              borderColor: themeColors.tint,
                              borderWidth: 2,
                            },
                          ]}
                          onPress={() => handleSelectCategory(category, true)}
                          activeOpacity={0.7}>
                          <View style={styles.modalCategoryIconContainer}>
                            <MaterialIcons
                              name={(category.icon || 'category') as any}
                              size={24}
                              color={
                                selectedCategory?.id === category.id
                                  ? themeColors.tint
                                  : '#99a1af'
                              }
                            />
                          </View>
                          <Text
                            style={[
                              styles.modalCategoryText,
                              { color: themeColors.textSecondary },
                              selectedCategory?.id === category.id && {
                                color: themeColors.tint,
                                fontWeight: '600',
                              },
                            ]}
                            numberOfLines={1}>
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function ManualInputScreen() {
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const isDark = resolvedTheme === 'dark';

  const { pendingSelectedCategory, clearPendingSelectedCategory } =
    useCategorySelection();

  // Services
  const { getTransactionTypes } = useTransactionTypeService();
  const { getCategories } = useCategoryService();
  const { getMoneySources } = useMoneySourceService();
  const { createTransaction } = useTransactionService();

  // Data states
  const [transactionTypes, setTransactionTypes] = useState<TransactionTypeDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [moneySources, setMoneySources] = useState<MoneySourceDto[]>([]);
  
  // Loading states
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [selectedTransactionType, setSelectedTransactionType] = useState<TransactionTypeDto | null>(null);
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryDto | null>(null);
  const [selectedMoneySource, setSelectedMoneySource] = useState<MoneySourceDto | null>(null);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [description, setDescription] = useState('');
  const [showDetails, setShowDetails] = useState(true);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [isFee, setIsFee] = useState(false);
  const [excludeFromReport, setExcludeFromReport] = useState(false);
  const [showTransactionTypeModal, setShowTransactionTypeModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Nhận hạng mục được chọn từ màn Chọn hạng mục
  useEffect(() => {
    if (pendingSelectedCategory) {
      setSelectedCategory(pendingSelectedCategory);
      clearPendingSelectedCategory();
    }
  }, [pendingSelectedCategory, clearPendingSelectedCategory]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true);
      setError(null);

      const [typesData, sourcesData] = await Promise.all([
        getTransactionTypes(),
        getMoneySources(),
      ]);

      setTransactionTypes(typesData);
      setMoneySources(sourcesData);

      // Set default transaction type (Chi tiêu - first one)
      if (typesData.length > 0) {
        const defaultType = typesData.find(t => t.name === 'Chi tiêu') || typesData[0];
        setSelectedTransactionType(defaultType);
        
        // Fetch categories for the default transaction type
        const categoriesData = await getCategories(defaultType.id);
        setCategories(categoriesData);
      }

      // Set default money source
      if (sourcesData.length > 0) {
        setSelectedMoneySource(sourcesData[0]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải dữ liệu';
      setError(errorMessage);
      console.error('Error fetching data:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When transaction type changes, fetch categories for that type
  const handleTransactionTypeChange = async (type: TransactionTypeDto) => {
    setSelectedTransactionType(type);
    setSelectedCategory(null); // Reset selected category
    setShowTransactionTypeModal(false);

    try {
      const categoriesData = await getCategories(type.id);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error fetching categories:', err);
      Alert.alert('Lỗi', 'Không thể tải danh mục cho loại giao dịch này');
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) {
      return 'Hôm nay';
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  // Format số tiền: dấu chấm phân cách hàng nghìn (1.000, 100.000)
  const formatWithThousandSeparators = (numStr: string): string => {
    if (!numStr) return numStr;
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (text: string) => {
    const rawDigits = text.replace(/\D/g, '');
    if (rawDigits === '') {
      setAmount('');
      return;
    }
    setAmount(formatWithThousandSeparators(rawDigits));
  };

  const handleSave = async () => {
    // Validation
    const digitsOnly = amount.replace(/\D/g, '');
    if (digitsOnly === '') {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền');
      return;
    }

    const amountNumber = parseInt(digitsOnly, 10);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      Alert.alert('Lỗi', 'Số tiền không hợp lệ');
      return;
    }

    if (!selectedTransactionType) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại giao dịch');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Lỗi', 'Vui lòng chọn hạng mục');
      return;
    }

    if (!selectedMoneySource) {
      Alert.alert('Lỗi', 'Vui lòng chọn tài khoản');
      return;
    }

    // Combine date and time
    const transactionDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes(),
      0
    );

    try {
      setSaving(true);

      await createTransaction({
        transactionTypeId: selectedTransactionType.id,
        moneySourceId: selectedMoneySource.id,
        categoryId: selectedCategory.id,
        amount: amountNumber,
        transactionDate: transactionDate.toISOString(),
        description: description.trim() || undefined,
        isBorrowingForThis: isBorrowing,
        isFee: isFee,
        excludeFromReport: excludeFromReport,
      });

      Alert.alert('Thành công', 'Đã lưu giao dịch', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể lưu giao dịch';
      Alert.alert('Lỗi', errorMessage);
      console.error('Error saving transaction:', err);
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loadingData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Nhập giao dịch</Text>
          <View style={styles.backButton} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={themeColors.tint} />
          <Text style={{ color: themeColors.textSecondary, marginTop: 12 }}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Nhập giao dịch</Text>
          <View style={styles.backButton} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <MaterialIcons name="error-outline" size={48} color="#F87171" />
          <Text style={{ color: '#F87171', marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity
            style={{
              marginTop: 16,
              backgroundColor: themeColors.tint,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            onPress={() => fetchData()}>
            <Text
              style={{
                color: isDark ? themeColors.background : '#FFFFFF',
                fontWeight: '600',
              }}>
              Thử lại
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentTypeColor = selectedTransactionType?.color || '#F87171';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.transactionTypeButton,
            { borderColor: currentTypeColor },
          ]}
          onPress={() => setShowTransactionTypeModal(true)}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.transactionTypeText,
              { color: currentTypeColor },
            ]}>
            {selectedTransactionType?.name || 'Chọn loại'}
          </Text>
          <MaterialIcons
            name="arrow-drop-down"
            size={24}
            color={currentTypeColor}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}>
          {saving ? (
            <ActivityIndicator
              size="small"
              color={isDark ? themeColors.background : '#FFFFFF'}
            />
          ) : (
            <MaterialIcons
              name="check"
              size={24}
              color={isDark ? themeColors.background : '#FFFFFF'}
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Amount Input */}
        <View style={styles.amountContainer}>
          <TextInput
            style={[styles.amountInput, { color: themeColors.text }]}
            placeholder="Số tiền"
            placeholderTextColor={themeColors.textSecondary}
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="decimal-pad"
            autoFocus={false}
          />
          <Text style={[styles.currencySymbol, { color: currentTypeColor }]}>vnđ</Text>
        </View>

        {/* Category Selection */}
        <CategoryPicker
          categories={categories}
          selectedCategory={selectedCategory}
          onChange={setSelectedCategory}
          themeColors={themeColors}
          isDark={isDark}
          transactionTypeId={selectedTransactionType?.id}
        />

        {/* Account Selection */}
        <TouchableOpacity
          style={[styles.row, { backgroundColor: themeColors.card }]}
          activeOpacity={0.7}
          onPress={() => setShowAccountModal(true)}>
          <MaterialIcons name="account-balance" size={20} color={themeColors.tint} />
          <Text style={[styles.rowText, { color: themeColors.text }]}>
            {selectedMoneySource?.name || 'Chọn tài khoản'}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={20} color={themeColors.muted} />
        </TouchableOpacity>

        {/* Date and Time Selection */}
        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={[styles.dateTimeItem, { backgroundColor: themeColors.card }]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}>
            <MaterialIcons name="calendar-today" size={20} color={themeColors.tint} />
            <Text style={[styles.dateTimeText, { color: themeColors.text }]}>
              {formatDate(date)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateTimeItem, { backgroundColor: themeColors.card }]}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}>
            <Text style={[styles.dateTimeText, { color: themeColors.text }]}>
              {formatTime(time)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <View style={[styles.row, { backgroundColor: themeColors.card }]}>
          <MaterialIcons name="list" size={20} color={themeColors.tint} />
          <TextInput
            style={[styles.descriptionInput, { color: themeColors.text }]}
            placeholder="Diễn giải"
            placeholderTextColor={themeColors.muted}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Additional Details */}
        {showDetails && (
          <>
            <TouchableOpacity
              style={[styles.row, { backgroundColor: themeColors.card }]}
              activeOpacity={0.7}>
              <MaterialIcons name="luggage" size={20} color={themeColors.tint} />
              <Text style={[styles.rowText, { color: themeColors.text }]}>
                Chuyến đi/Sự kiện
              </Text>
              <MaterialIcons name="arrow-drop-down" size={20} color={themeColors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, { backgroundColor: themeColors.card }]}
              activeOpacity={0.7}>
              <MaterialIcons name="person" size={20} color={themeColors.tint} />
              <Text style={[styles.rowText, { color: themeColors.text }]}>
                Chỉ cho ai
              </Text>
              <MaterialIcons name="arrow-drop-down" size={20} color={themeColors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, { backgroundColor: themeColors.card }]}
              activeOpacity={0.7}>
              <MaterialIcons name="location-on" size={20} color={themeColors.tint} />
              <Text style={[styles.rowText, { color: themeColors.text }]}>
                Địa điểm
              </Text>
              <MaterialIcons name="arrow-drop-down" size={20} color={themeColors.muted} />
            </TouchableOpacity>

            {/* Toggles */}
            <View
              style={[
                styles.toggleRow,
                { backgroundColor: themeColors.card },
              ]}>
              <Text style={[styles.toggleLabel, { color: themeColors.text }]}>
                Đi vay để trả khoản này
              </Text>
              <Switch
                value={isBorrowing}
                onValueChange={setIsBorrowing}
                trackColor={{
                  false: themeColors.border,
                  true: themeColors.tint,
                }}
                thumbColor={themeColors.card}
              />
            </View>

            <View
              style={[
                styles.toggleRow,
                { backgroundColor: themeColors.card },
              ]}>
              <Text style={[styles.toggleLabel, { color: themeColors.text }]}>
                Phí
              </Text>
              <Switch
                value={isFee}
                onValueChange={setIsFee}
                trackColor={{
                  false: themeColors.border,
                  true: themeColors.tint,
                }}
                thumbColor={themeColors.card}
              />
            </View>

            <View
              style={[
                styles.toggleRow,
                { backgroundColor: themeColors.card },
              ]}>
              <Text style={[styles.toggleLabel, { color: themeColors.text }]}>
                Không tính vào báo cáo
              </Text>
              <Switch
                value={excludeFromReport}
                onValueChange={setExcludeFromReport}
                trackColor={{
                  false: themeColors.border,
                  true: themeColors.tint,
                }}
                thumbColor={themeColors.card}
              />
            </View>

            {/* Attach Files */}
            <View style={styles.attachContainer}>
              <TouchableOpacity
                style={[
                  styles.attachButton,
                  {
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.tint,
                  },
                ]}
                activeOpacity={0.7}>
                <MaterialIcons name="photo-library" size={24} color={themeColors.tint} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.attachButton,
                  {
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.tint,
                  },
                ]}
                activeOpacity={0.7}>
                <MaterialIcons name="camera-alt" size={24} color={themeColors.tint} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Hide Details Button */}
        <TouchableOpacity
          style={styles.hideDetailsButton}
          onPress={() => setShowDetails(!showDetails)}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.hideDetailsText,
              { color: themeColors.textSecondary },
            ]}>
            {showDetails ? 'Ẩn chi tiết' : 'Hiện chi tiết'}
          </Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButtonLarge,
            { backgroundColor: themeColors.tint },
            saving && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}>
          {saving ? (
            <ActivityIndicator
              size="small"
              color={isDark ? themeColors.background : '#FFFFFF'}
            />
          ) : (
            <Text
              style={[
                styles.saveButtonText,
                { color: isDark ? themeColors.background : '#FFFFFF' },
              ]}>
              Lưu lại
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}>
          <View style={styles.pickerContainer}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View
                style={[
                  styles.pickerContent,
                  { backgroundColor: themeColors.card },
                ]}>
                <View
                  style={[
                    styles.pickerHeader,
                    { borderBottomColor: themeColors.border },
                  ]}>
                  <Text style={[styles.pickerTitle, { color: themeColors.text }]}>
                    Chọn ngày
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    activeOpacity={0.7}>
                    <MaterialIcons
                      name="close"
                      size={24}
                      color={themeColors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  style={styles.dateTimePicker}
                  locale="vi-VN"
                />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}>
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowTimePicker(false)}>
          <View style={styles.pickerContainer}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View
                style={[
                  styles.pickerContent,
                  { backgroundColor: themeColors.card },
                ]}>
                <View
                  style={[
                    styles.pickerHeader,
                    { borderBottomColor: themeColors.border },
                  ]}>
                  <Text style={[styles.pickerTitle, { color: themeColors.text }]}>
                    Chọn giờ
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(false)}
                    activeOpacity={0.7}>
                    <MaterialIcons
                      name="close"
                      size={24}
                      color={themeColors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={time}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  style={styles.dateTimePicker}
                  locale="vi-VN"
                />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Transaction Type Modal */}
      <Modal
        visible={showTransactionTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTransactionTypeModal(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowTransactionTypeModal(false)}>
          <View style={styles.modalContainer}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View
                style={[
                  styles.transactionTypeModalContent,
                  { backgroundColor: themeColors.card },
                ]}>
                <View
                  style={[
                    styles.modalHeader,
                    { borderBottomColor: themeColors.border },
                  ]}>
                  <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                    Chọn loại giao dịch
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowTransactionTypeModal(false)}
                    activeOpacity={0.7}>
                    <MaterialIcons
                      name="close"
                      size={24}
                      color={themeColors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.transactionTypeList}>
                  {transactionTypes.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.transactionTypeItem,
                        { backgroundColor: themeColors.card },
                        selectedTransactionType?.id === type.id && {
                          borderColor: type.color,
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => handleTransactionTypeChange(type)}
                      activeOpacity={0.7}>
                      <View
                        style={[
                          styles.transactionTypeColorIndicator,
                          { backgroundColor: type.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.transactionTypeItemText,
                          { color: themeColors.text },
                          selectedTransactionType?.id === type.id && {
                            color: type.color,
                            fontWeight: '600',
                          },
                        ]}>
                        {type.name}
                      </Text>
                      {selectedTransactionType?.id === type.id && (
                        <MaterialIcons name="check" size={20} color={type.color} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Account Selection Modal */}
      <Modal
        visible={showAccountModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAccountModal(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowAccountModal(false)}>
          <View style={styles.modalContainer}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View
                style={[
                  styles.transactionTypeModalContent,
                  { backgroundColor: themeColors.card },
                ]}>
                <View
                  style={[
                    styles.modalHeader,
                    { borderBottomColor: themeColors.border },
                  ]}>
                  <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                    Chọn tài khoản
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowAccountModal(false)}
                    activeOpacity={0.7}>
                    <MaterialIcons
                      name="close"
                      size={24}
                      color={themeColors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 400 }}>
                  <View style={styles.transactionTypeList}>
                    {moneySources.length === 0 ? (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Text
                          style={{
                            color: themeColors.textSecondary,
                          }}>
                          Chưa có tài khoản nào
                        </Text>
                      </View>
                    ) : (
                      moneySources.map((source) => (
                          <TouchableOpacity
                            key={source.id}
                            style={[
                              styles.transactionTypeItem,
                              { backgroundColor: themeColors.card },
                              selectedMoneySource?.id === source.id && {
                                borderColor: themeColors.tint,
                                borderWidth: 1,
                              },
                            ]}
                            onPress={() => {
                              setSelectedMoneySource(source);
                              setShowAccountModal(false);
                            }}
                            activeOpacity={0.7}>
                          <View
                            style={[
                              styles.accountIconSmall,
                              { backgroundColor: source.color || '#51A2FF' },
                            ]}>
                            <MaterialIcons 
                              name={(source.icon || 'account-balance-wallet') as any} 
                              size={16} 
                              color="#FFFFFF" 
                            />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text
                              style={[
                                styles.transactionTypeItemText,
                                { color: themeColors.text },
                                selectedMoneySource?.id === source.id && {
                                  color: themeColors.tint,
                                  fontWeight: '600',
                                },
                              ]}>
                              {source.name}
                            </Text>
                            <Text
                              style={{
                                color: themeColors.textSecondary,
                                fontSize: 12,
                              }}>
                              {new Intl.NumberFormat('vi-VN').format(source.balance)} ₫
                            </Text>
                          </View>
                          {selectedMoneySource?.id === source.id && (
                            <MaterialIcons
                              name="check"
                              size={20}
                              color={themeColors.tint}
                            />
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </ScrollView>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Other Categories Modal */}
      {/*
      <Modal
        visible={showOtherCategoriesModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOtherCategoriesModal(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowOtherCategoriesModal(false)}>
          <View style={styles.modalContainer}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View
                style={[
                  styles.modalContent,
                  { backgroundColor: themeColors.card },
                ]}>
                <View
                  style={[
                    styles.modalHeader,
                    { borderBottomColor: themeColors.border },
                  ]}>
                  <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                    Chọn hạng mục
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowOtherCategoriesModal(false)}
                    activeOpacity={0.7}>
                    <MaterialIcons
                      name="close"
                      size={24}
                      color={themeColors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}>
                  <View style={styles.modalCategoryGrid}>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.modalCategoryItem,
                          { backgroundColor: themeColors.card },
                          selectedCategory?.id === category.id && {
                            borderColor: themeColors.tint,
                            borderWidth: 2,
                          },
                        ]}
                        onPress={() => {
                          setSelectedCategory(category);
                          setShowOtherCategoriesModal(false);
                        }}
                        activeOpacity={0.7}>
                        <View style={styles.modalCategoryIconContainer}>
                          <MaterialIcons
                            name={(category.icon || 'category') as any}
                            size={24}
                            color={selectedCategory?.id === category.id ? '#51A2FF' : '#99a1af'}
                          />
                        </View>
                        <Text
                          style={[
                            styles.modalCategoryText,
                            { color: themeColors.textSecondary },
                            selectedCategory?.id === category.id && {
                              color: themeColors.tint,
                              fontWeight: '600',
                            },
                          ]}
                          numberOfLines={1}>
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  transactionTypeText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  amountInput: {
    flex: 1,
    fontSize: 48,
    fontWeight: 'bold',
    paddingVertical: 12,
    lineHeight: 56,
    minHeight: 72,
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  categoryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 14,
    marginRight: 4,
  },
  frequentSection: {
    borderRadius: 12,
    padding: 16,
  },
  frequentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  frequentTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  categoryItem: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    position: 'relative',
    minWidth: 0,
  },
  categoryItemSelected: {
    borderWidth: 1,
  },
  categoryIconContainer: {
    marginBottom: 6,
  },
  categoryItemText: {
    fontSize: 12,
    textAlign: 'center',
  },
  categoryItemTextSelected: {
    fontWeight: '600',
  },
  starIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dateTimeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  descriptionInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    paddingVertical: 0,
    ...(Platform.OS === 'android' && { textAlignVertical: 'center' }),
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 16,
  },
  attachContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  attachButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  hideDetailsButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  hideDetailsText: {
    fontSize: 14,
  },
  saveButtonLarge: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
    maxHeight: '85%',
    minHeight: '60%',
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalScrollView: {
    maxHeight: 500,
    minHeight: 300,
  },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalCategoryItem: {
    width: (SCREEN_WIDTH - 64) / 4,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCategoryItemSelected: {
    borderWidth: 2,
  },
  modalCategoryIconContainer: {
    marginBottom: 6,
  },
  modalCategoryText: {
    fontSize: 11,
    textAlign: 'center',
  },
  modalCategoryTextSelected: {
    fontWeight: '600',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContent: {
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    width: '100%',
    maxWidth: 400,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateTimePicker: {
    alignSelf: 'center',
    width: Platform.OS === 'ios' ? '100%' : 'auto',
  },
  transactionTypeModalContent: {
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    width: '100%',
    maxWidth: 350,
  },
  transactionTypeList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  transactionTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionTypeItemSelected: {
    borderWidth: 1,
  },
  transactionTypeColorIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 12,
  },
  transactionTypeItemText: {
    flex: 1,
    fontSize: 16,
  },
  accountIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
