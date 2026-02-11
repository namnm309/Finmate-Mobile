import { DeleteMoneySourceDialog } from '@/components/DeleteMoneySourceDialog';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { MoneySourceDto, MoneySourceGroupedDto, MoneySourceGroupedResponseDto } from '@/lib/types/moneySource';
import { styles } from '@/styles/index.styles';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Format số tiền VNĐ
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

type TabType = 'accounts' | 'savings' | 'accumulation';

export default function AccountScreen() {
  const router = useRouter();
  const { refresh } = useLocalSearchParams<{ refresh?: string }>();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const isLight = resolvedTheme === 'light';
  // Nút Thêm tài khoản: sáng = xanh lá, tối = xanh dương đậm
  const addButtonColor = isLight ? themeColors.tint : '#2563eb';
  const lightOutlinedIcon = isLight
    ? {
        backgroundColor: themeColors.card,
        borderWidth: 1,
        borderColor: themeColors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      }
    : null;
  const lightCardSurface = isLight
    ? {
        backgroundColor: themeColors.card,
        borderWidth: 1,
        borderColor: themeColors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
      }
    : null;
  const [activeTab, setActiveTab] = useState<TabType>('accounts');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MoneySourceGroupedResponseDto | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<MoneySourceDto | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { getGroupedMoneySources, updateMoneySource, deleteMoneySource } = useMoneySourceService();

  // Navigate to add money source screen
  const handleAddMoneySource = () => {
    router.push('/(protected)/(other-pages)/add-money-source');
  };

  // Refresh data when screen comes into focus (e.g., after adding a new account)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await getGroupedMoneySources();
      setData(response);
      
      // Expand all categories by default
      if (response.groups.length > 0) {
        setExpandedCategories(response.groups.map(g => g.accountTypeId));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải dữ liệu tài khoản';
      setError(errorMessage);
      console.error('Error fetching money sources:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch khi quay lại từ màn sửa (có param refresh) để thấy số dư mới
  useEffect(() => {
    if (refresh) {
      fetchData(true);
    }
  }, [refresh]);

  const onRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const openAccountMenu = (account: MoneySourceDto) => {
    setSelectedAccount(account);
    setShowAccountMenu(true);
  };

  const closeAccountMenu = () => {
    setShowAccountMenu(false);
    setSelectedAccount(null);
  };

  const handleMenuEdit = () => {
    if (!selectedAccount) return;
    const id = selectedAccount.id;
    closeAccountMenu();
    router.push({ pathname: '/(protected)/(other-pages)/edit-money-source', params: { id } });
  };

  const handleMenuDelete = () => {
    setShowAccountMenu(false);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAccount) return;
    try {
      await deleteMoneySource(selectedAccount.id);
      setShowDeleteDialog(false);
      setSelectedAccount(null);
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa tài khoản';
      Alert.alert('Lỗi', msg);
    }
  };

  const handleMenuDeactivate = async () => {
    if (!selectedAccount) return;
    try {
      await updateMoneySource(selectedAccount.id, { isActive: false });
      closeAccountMenu();
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể ngừng sử dụng';
      Alert.alert('Lỗi', msg);
    }
  };

  const handleMenuPlaceholder = () => {
    closeAccountMenu();
    Alert.alert('Thông báo', 'Tính năng đang phát triển');
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.accountHeader}>
            <Text style={[styles.accountTitle, { color: themeColors.text }]}>Tài khoản</Text>
            <View style={styles.accountHeaderIcons}>
              <TouchableOpacity style={[styles.accountHeaderIcon, lightOutlinedIcon]} disabled>
                <MaterialIcons name="search" size={24} color={themeColors.icon} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.accountHeaderIcon, lightOutlinedIcon]} disabled>
                <MaterialIcons name="tune" size={24} color={themeColors.icon} />
              </TouchableOpacity>
            </View>
          </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <ActivityIndicator size="large" color={themeColors.tint} />
          <Text style={{ color: themeColors.textSecondary, marginTop: 12, textAlign: 'center' }}>Đang tải dữ liệu tài khoản...</Text>
        </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.accountHeader}>
            <Text style={[styles.accountTitle, { color: themeColors.text }]}>Tài khoản</Text>
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
        </ScrollView>
      </SafeAreaView>
    );
  }

  const totalBalance = data?.totalBalance ?? 0;
  const accountCategories = data?.groups ?? [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.tint}
            colors={[themeColors.tint]}
          />
        }>
        
        {/* Header Section */}
        <View style={styles.accountHeader}>
          <Text style={[styles.accountTitle, { color: themeColors.text }]}>Tài khoản</Text>
          <View style={styles.accountHeaderIcons}>
            <TouchableOpacity style={[styles.accountHeaderIcon, lightOutlinedIcon]}>
              <MaterialIcons name="search" size={24} color={themeColors.icon} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.accountHeaderIcon, lightOutlinedIcon]}>
              <MaterialIcons name="tune" size={24} color={themeColors.icon} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.accountTabs}>
          <TouchableOpacity
            style={[styles.accountTab, activeTab === 'accounts' && styles.accountTabActive]}
            onPress={() => setActiveTab('accounts')}>
            <Text style={[
              styles.accountTabText,
              { color: themeColors.textSecondary },
              activeTab === 'accounts' && { color: themeColors.tint }
            ]}>
              Tài khoản
            </Text>
            {activeTab === 'accounts' && <View style={[styles.accountTabUnderline, { backgroundColor: themeColors.successBorder }]} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.accountTab, activeTab === 'savings' && styles.accountTabActive]}
            onPress={() => setActiveTab('savings')}>
            <Text style={[
              styles.accountTabText,
              { color: themeColors.textSecondary },
              activeTab === 'savings' && { color: themeColors.tint }
            ]}>
              Sổ tiết kiệm
            </Text>
            {activeTab === 'savings' && <View style={[styles.accountTabUnderline, { backgroundColor: themeColors.successBorder }]} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.accountTab, activeTab === 'accumulation' && styles.accountTabActive]}
            onPress={() => setActiveTab('accumulation')}>
            <Text style={[
              styles.accountTabText,
              { color: themeColors.textSecondary },
              activeTab === 'accumulation' && { color: themeColors.tint }
            ]}>
              Tích lũy
            </Text>
            {activeTab === 'accumulation' && <View style={[styles.accountTabUnderline, { backgroundColor: themeColors.successBorder }]} />}
          </TouchableOpacity>
        </View>

        {/* Total Balance Section */}
        <LinearGradient
          colors={[themeColors.successBorder, themeColors.success2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.accountTotalBalance,
            {
              backgroundColor: 'transparent',
              shadowColor: themeColors.successBorder,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 6,
            },
          ]}>
          <Text style={[styles.accountTotalLabel, { color: 'rgba(255,255,255,0.9)' }]}>Tổng tiền</Text>
          <Text style={[styles.accountTotalAmount, { color: '#ffffff' }]}>{formatCurrency(totalBalance)}</Text>
        </LinearGradient>

        {/* Account Categories Section */}
        <View style={styles.accountCategoriesSection}>
          <Text style={[styles.accountCategoriesLabel, { color: themeColors.text }]}>Đang sử dụng</Text>
          
          {accountCategories.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <MaterialIcons name="account-balance-wallet" size={48} color={themeColors.icon} />
              <Text style={{ color: themeColors.textSecondary, marginTop: 12, textAlign: 'center', marginBottom: 20 }}>
                Chưa có tài khoản nào.{'\n'}Hãy thêm tài khoản để bắt đầu quản lý tài chính.
              </Text>
              <TouchableOpacity
                style={[localStyles.addAccountButton, { backgroundColor: addButtonColor }]}
                onPress={handleAddMoneySource}
                activeOpacity={0.8}>
                <MaterialIcons name="add" size={20} color="#FFFFFF" />
                <Text style={localStyles.addAccountButtonText}>Thêm tài khoản</Text>
              </TouchableOpacity>
            </View>
          ) : (
            accountCategories.map((category: MoneySourceGroupedDto) => (
              <View key={category.accountTypeId} style={styles.accountCategory}>
                {/* Category Header */}
                <TouchableOpacity
                  style={styles.accountCategoryHeader}
                  onPress={() => toggleCategory(category.accountTypeId)}
                  activeOpacity={0.7}>
                  <Text style={[styles.accountCategoryName, { color: isLight ? themeColors.tint : themeColors.text }]}>
                    {category.accountTypeName} ({formatCurrency(category.totalBalance)})
                  </Text>
                  <MaterialIcons
                    name={expandedCategories.includes(category.accountTypeId) ? 'keyboard-arrow-down' : 'keyboard-arrow-right'}
                    size={24}
                    color={themeColors.tint}
                  />
                </TouchableOpacity>

                {/* Account Items */}
                {expandedCategories.includes(category.accountTypeId) && (
                  <View style={styles.accountItemsContainer}>
                    {category.moneySources.map((account) => (
                      <View key={account.id} style={[styles.accountItem, lightCardSurface]}>
                        <View style={[styles.accountItemIcon, { backgroundColor: account.color || '#51A2FF' }]}>
                          <MaterialIcons name={(account.icon || 'account-balance-wallet') as any} size={20} color="#FFFFFF" />
                        </View>
                        <View style={styles.accountItemInfo}>
                          <Text style={[styles.accountItemName, { color: themeColors.text }]}>{account.name}</Text>
                          <Text style={[styles.accountItemAmount, { color: themeColors.textSecondary }]}>{formatCurrency(account.balance)}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.accountItemMenu}
                          onPress={() => openAccountMenu(account)}
                          activeOpacity={0.7}>
                          <MaterialIcons name="more-vert" size={20} color={themeColors.icon} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[localStyles.fab, { backgroundColor: addButtonColor }]}
        onPress={handleAddMoneySource}
        activeOpacity={0.8}>
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Account actions bottom sheet */}
      <Modal
        visible={showAccountMenu}
        transparent
        animationType="slide"
        onRequestClose={closeAccountMenu}>
        <TouchableOpacity
          style={localStyles.sheetOverlay}
          activeOpacity={1}
          onPress={closeAccountMenu}>
          <TouchableOpacity
            style={[localStyles.sheetContent, { backgroundColor: themeColors.card }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}>
            <View style={localStyles.sheetHandle} />
            <TouchableOpacity style={localStyles.sheetItem} onPress={handleMenuPlaceholder}>
              <MaterialIcons name="swap-horiz" size={24} color={themeColors.text} />
              <Text style={[localStyles.sheetItemText, { color: themeColors.text }]}>Chuyển khoản</Text>
            </TouchableOpacity>
            <TouchableOpacity style={localStyles.sheetItem} onPress={handleMenuPlaceholder}>
              <MaterialIcons name="attach-money" size={24} color={themeColors.text} />
              <Text style={[localStyles.sheetItemText, { color: themeColors.text }]}>Điều chỉnh số dư</Text>
            </TouchableOpacity>
            <TouchableOpacity style={localStyles.sheetItem} onPress={handleMenuPlaceholder}>
              <MaterialIcons name="share" size={24} color={themeColors.text} />
              <Text style={[localStyles.sheetItemText, { color: themeColors.text }]}>Chia sẻ tài khoản</Text>
            </TouchableOpacity>
            <TouchableOpacity style={localStyles.sheetItem} onPress={handleMenuEdit}>
              <MaterialIcons name="edit" size={24} color={themeColors.text} />
              <Text style={[localStyles.sheetItemText, { color: themeColors.text }]}>Chỉnh sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={localStyles.sheetItem} onPress={handleMenuDelete}>
              <MaterialIcons name="delete" size={24} color={themeColors.text} />
              <Text style={[localStyles.sheetItemText, { color: themeColors.text }]}>Xóa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={localStyles.sheetItem} onPress={handleMenuDeactivate}>
              <MaterialIcons name="lock" size={24} color={themeColors.text} />
              <Text style={[localStyles.sheetItemText, { color: themeColors.text }]}>Ngừng sử dụng</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <DeleteMoneySourceDialog
        visible={showDeleteDialog}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setSelectedAccount(null);
        }}
      />
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#1A2332',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    paddingHorizontal: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6B7280',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 16,
  },
  sheetItemText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 50, // Above bottom navigation
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
