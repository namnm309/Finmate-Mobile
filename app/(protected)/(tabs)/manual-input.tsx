import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
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
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionTypeService } from '@/lib/services/transactionTypeService';
import { useCategoryService } from '@/lib/services/categoryService';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { useTransactionService } from '@/lib/services/transactionService';
import { TransactionTypeDto, CategoryDto } from '@/lib/types/transaction';
import { MoneySourceDto } from '@/lib/types/moneySource';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ManualInputScreen() {
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];

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
  const [showOtherCategoriesModal, setShowOtherCategoriesModal] = useState(false);
  const [showTransactionTypeModal, setShowTransactionTypeModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

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

  // Get display categories (first 7 + "Khác")
  const frequentCategories = categories.slice(0, 7);
  const row1Categories = frequentCategories.slice(0, 4);
  const row2Categories = frequentCategories.slice(4, 7);
  const otherCategories = categories.slice(7);

  // Loading state
  if (loadingData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.header}>
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
        <View style={styles.header}>
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
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentTypeColor = selectedTransactionType?.color || '#F87171';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
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
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialIcons name="check" size={24} color="#FFFFFF" />
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity style={styles.categoryButton} activeOpacity={0.7}>
              <MaterialIcons name="add" size={20} color="#51A2FF" />
              <Text style={styles.categoryButtonText}>Chọn hạng mục</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
              <Text style={styles.filterText}>Tất cả</Text>
              <MaterialIcons name="arrow-drop-down" size={20} color="#99a1af" />
            </TouchableOpacity>
          </View>

          {/* Frequent Categories */}
          <View style={styles.frequentSection}>
            <View style={styles.frequentHeader}>
              <Text style={styles.frequentTitle}>Hay dùng</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <MaterialIcons name="keyboard-arrow-up" size={24} color="#99a1af" />
              </TouchableOpacity>
            </View>

            {categories.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ color: '#99a1af', fontSize: 14 }}>Chưa có hạng mục nào</Text>
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
                        selectedCategory?.id === category.id && styles.categoryItemSelected,
                      ]}
                      onPress={() => setSelectedCategory(category)}
                      activeOpacity={0.7}>
                      <View style={styles.categoryIconContainer}>
                        <MaterialIcons
                          name={(category.icon || 'category') as any}
                          size={20}
                          color={selectedCategory?.id === category.id ? '#51A2FF' : '#99a1af'}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryItemText,
                          selectedCategory?.id === category.id && styles.categoryItemTextSelected,
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
                  {row1Categories.length < 4 && Array(4 - row1Categories.length).fill(0).map((_, i) => (
                    <View key={`empty1-${i}`} style={[styles.categoryItem, { opacity: 0 }]} />
                  ))}
                </View>

                {/* Row 2: Next 3 categories + "Khác" button */}
                <View style={styles.categoryRow}>
                  {row2Categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryItem,
                        selectedCategory?.id === category.id && styles.categoryItemSelected,
                      ]}
                      onPress={() => setSelectedCategory(category)}
                      activeOpacity={0.7}>
                      <View style={styles.categoryIconContainer}>
                        <MaterialIcons
                          name={(category.icon || 'category') as any}
                          size={20}
                          color={selectedCategory?.id === category.id ? '#51A2FF' : '#99a1af'}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryItemText,
                          selectedCategory?.id === category.id && styles.categoryItemTextSelected,
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
                  
                  {/* "Khác" button - only show if there are more categories */}
                  {(otherCategories.length > 0 || row2Categories.length < 3) && (
                    <TouchableOpacity
                      style={styles.categoryItem}
                      onPress={() => setShowOtherCategoriesModal(true)}
                      activeOpacity={0.7}>
                      <View style={styles.categoryIconContainer}>
                        <MaterialIcons name="more-horiz" size={20} color="#99a1af" />
                      </View>
                      <Text style={styles.categoryItemText}>Khác</Text>
                    </TouchableOpacity>
                  )}

                  {/* Fill empty slots in row 2 */}
                  {row2Categories.length < 3 && otherCategories.length === 0 && Array(3 - row2Categories.length).fill(0).map((_, i) => (
                    <View key={`empty2-${i}`} style={[styles.categoryItem, { opacity: 0 }]} />
                  ))}
                </View>
              </>
            )}
          </View>
        </View>

        {/* Account Selection */}
        <TouchableOpacity 
          style={styles.row} 
          activeOpacity={0.7}
          onPress={() => setShowAccountModal(true)}>
          <MaterialIcons name="account-balance" size={20} color="#51A2FF" />
          <Text style={styles.rowText}>
            {selectedMoneySource?.name || 'Chọn tài khoản'}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={20} color="#99a1af" />
        </TouchableOpacity>

        {/* Date and Time Selection */}
        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={styles.dateTimeItem}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}>
            <MaterialIcons name="calendar-today" size={20} color="#51A2FF" />
            <Text style={styles.dateTimeText}>{formatDate(date)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateTimeItem}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}>
            <Text style={styles.dateTimeText}>{formatTime(time)}</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <View style={styles.row}>
          <MaterialIcons name="list" size={20} color="#51A2FF" />
          <TextInput
            style={styles.descriptionInput}
            placeholder="Diễn giải"
            placeholderTextColor="#6a7282"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Additional Details */}
        {showDetails && (
          <>
            <TouchableOpacity style={styles.row} activeOpacity={0.7}>
              <MaterialIcons name="luggage" size={20} color="#51A2FF" />
              <Text style={styles.rowText}>Chuyến đi/Sự kiện</Text>
              <MaterialIcons name="arrow-drop-down" size={20} color="#99a1af" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} activeOpacity={0.7}>
              <MaterialIcons name="person" size={20} color="#51A2FF" />
              <Text style={styles.rowText}>Chỉ cho ai</Text>
              <MaterialIcons name="arrow-drop-down" size={20} color="#99a1af" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} activeOpacity={0.7}>
              <MaterialIcons name="location-on" size={20} color="#51A2FF" />
              <Text style={styles.rowText}>Địa điểm</Text>
              <MaterialIcons name="arrow-drop-down" size={20} color="#99a1af" />
            </TouchableOpacity>

            {/* Toggles */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Đi vay để trả khoản này</Text>
              <Switch
                value={isBorrowing}
                onValueChange={setIsBorrowing}
                trackColor={{ false: '#374151', true: '#51A2FF' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Phí</Text>
              <Switch
                value={isFee}
                onValueChange={setIsFee}
                trackColor={{ false: '#374151', true: '#51A2FF' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Không tính vào báo cáo</Text>
              <Switch
                value={excludeFromReport}
                onValueChange={setExcludeFromReport}
                trackColor={{ false: '#374151', true: '#51A2FF' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Attach Files */}
            <View style={styles.attachContainer}>
              <TouchableOpacity style={styles.attachButton} activeOpacity={0.7}>
                <MaterialIcons name="photo-library" size={24} color="#51A2FF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachButton} activeOpacity={0.7}>
                <MaterialIcons name="camera-alt" size={24} color="#51A2FF" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Hide Details Button */}
        <TouchableOpacity
          style={styles.hideDetailsButton}
          onPress={() => setShowDetails(!showDetails)}
          activeOpacity={0.7}>
          <Text style={styles.hideDetailsText}>
            {showDetails ? 'Ẩn chi tiết' : 'Hiện chi tiết'}
          </Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButtonLarge, saving && { opacity: 0.6 }]} 
          onPress={handleSave} 
          disabled={saving}
          activeOpacity={0.8}>
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Lưu lại</Text>
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
              <View style={styles.pickerContent}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Chọn ngày</Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    activeOpacity={0.7}>
                    <MaterialIcons name="close" size={24} color="#FFFFFF" />
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
              <View style={styles.pickerContent}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Chọn giờ</Text>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(false)}
                    activeOpacity={0.7}>
                    <MaterialIcons name="close" size={24} color="#FFFFFF" />
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
              <View style={styles.transactionTypeModalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chọn loại giao dịch</Text>
                  <TouchableOpacity
                    onPress={() => setShowTransactionTypeModal(false)}
                    activeOpacity={0.7}>
                    <MaterialIcons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.transactionTypeList}>
                  {transactionTypes.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.transactionTypeItem,
                        selectedTransactionType?.id === type.id && styles.transactionTypeItemSelected,
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
              <View style={styles.transactionTypeModalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chọn tài khoản</Text>
                  <TouchableOpacity
                    onPress={() => setShowAccountModal(false)}
                    activeOpacity={0.7}>
                    <MaterialIcons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 400 }}>
                  <View style={styles.transactionTypeList}>
                    {moneySources.length === 0 ? (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Text style={{ color: '#99a1af' }}>Chưa có tài khoản nào</Text>
                      </View>
                    ) : (
                      moneySources.map((source) => (
                        <TouchableOpacity
                          key={source.id}
                          style={[
                            styles.transactionTypeItem,
                            selectedMoneySource?.id === source.id && styles.transactionTypeItemSelected,
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
                                selectedMoneySource?.id === source.id && {
                                  color: '#51A2FF',
                                  fontWeight: '600',
                                },
                              ]}>
                              {source.name}
                            </Text>
                            <Text style={{ color: '#99a1af', fontSize: 12 }}>
                              {new Intl.NumberFormat('vi-VN').format(source.balance)} ₫
                            </Text>
                          </View>
                          {selectedMoneySource?.id === source.id && (
                            <MaterialIcons name="check" size={20} color="#51A2FF" />
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
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chọn hạng mục</Text>
                  <TouchableOpacity
                    onPress={() => setShowOtherCategoriesModal(false)}
                    activeOpacity={0.7}>
                    <MaterialIcons name="close" size={24} color="#FFFFFF" />
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
                          selectedCategory?.id === category.id && styles.modalCategoryItemSelected,
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
                            selectedCategory?.id === category.id && styles.modalCategoryTextSelected,
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1729',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e2939',
  },
  headerTitle: {
    color: '#FFFFFF',
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
    backgroundColor: '#1e2939',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F87171',
  },
  transactionTypeText: {
    color: '#F87171',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#51A2FF',
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
    marginBottom: 24,
  },
  amountInput: {
    flex: 1,
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    paddingVertical: 8,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F87171',
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
    backgroundColor: '#1e2939',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  categoryButtonText: {
    color: '#51A2FF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterText: {
    color: '#99a1af',
    fontSize: 14,
    marginRight: 4,
  },
  frequentSection: {
    backgroundColor: '#1e2939',
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
    color: '#FFFFFF',
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
    backgroundColor: '#151a25',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    position: 'relative',
    minWidth: 0,
  },
  categoryItemSelected: {
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: '#51A2FF',
  },
  categoryIconContainer: {
    marginBottom: 6,
  },
  categoryItemText: {
    color: '#99a1af',
    fontSize: 12,
    textAlign: 'center',
  },
  categoryItemTextSelected: {
    color: '#51A2FF',
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
    backgroundColor: '#1e2939',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  rowText: {
    flex: 1,
    color: '#FFFFFF',
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
    backgroundColor: '#1e2939',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  dateTimeText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  descriptionInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e2939',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  toggleLabel: {
    color: '#FFFFFF',
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
    backgroundColor: '#1e2939',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#51A2FF',
  },
  hideDetailsButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  hideDetailsText: {
    color: '#99a1af',
    fontSize: 14,
  },
  saveButtonLarge: {
    backgroundColor: '#51A2FF',
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
    backgroundColor: '#1e2939',
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
    borderBottomColor: '#2a3441',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    backgroundColor: '#151a25',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCategoryItemSelected: {
    backgroundColor: '#1e3a5f',
    borderWidth: 2,
    borderColor: '#51A2FF',
  },
  modalCategoryIconContainer: {
    marginBottom: 6,
  },
  modalCategoryText: {
    color: '#99a1af',
    fontSize: 11,
    textAlign: 'center',
  },
  modalCategoryTextSelected: {
    color: '#51A2FF',
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
    backgroundColor: '#1e2939',
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
    borderBottomColor: '#2a3441',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dateTimePicker: {
    alignSelf: 'center',
    width: Platform.OS === 'ios' ? '100%' : 'auto',
  },
  transactionTypeModalContent: {
    backgroundColor: '#1e2939',
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
    backgroundColor: '#151a25',
  },
  transactionTypeItemSelected: {
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: '#51A2FF',
  },
  transactionTypeColorIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 12,
  },
  transactionTypeItemText: {
    flex: 1,
    color: '#FFFFFF',
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
