import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { MoneySourceGroupedDto, MoneySourceGroupedResponseDto } from '@/lib/types/moneySource';
import { styles } from '@/styles/index.styles';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  const [activeTab, setActiveTab] = useState<TabType>('accounts');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MoneySourceGroupedResponseDto | null>(null);

  const { getGroupedMoneySources } = useMoneySourceService();

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

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.accountHeader}>
            <Text style={styles.accountTitle}>Tài khoản</Text>
            <View style={styles.accountHeaderIcons}>
              <TouchableOpacity style={styles.accountHeaderIcon} disabled>
                <MaterialIcons name="search" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.accountHeaderIcon} disabled>
                <MaterialIcons name="tune" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <ActivityIndicator size="large" color="#00D492" />
          <Text style={{ color: '#99A1AF', marginTop: 12, textAlign: 'center' }}>Đang tải dữ liệu tài khoản...</Text>
        </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.accountHeader}>
            <Text style={styles.accountTitle}>Tài khoản</Text>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
            <MaterialIcons name="error-outline" size={48} color="#F87171" />
            <Text style={{ color: '#F87171', marginTop: 12, textAlign: 'center' }}>{error}</Text>
            <TouchableOpacity
              style={{
                marginTop: 16,
                backgroundColor: '#00D492',
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00D492"
            colors={['#00D492']}
          />
        }>
        
        {/* Header Section */}
        <View style={styles.accountHeader}>
          <Text style={styles.accountTitle}>Tài khoản</Text>
          <View style={styles.accountHeaderIcons}>
            <TouchableOpacity style={styles.accountHeaderIcon}>
              <MaterialIcons name="search" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.accountHeaderIcon}>
              <MaterialIcons name="tune" size={24} color="#FFFFFF" />
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
              activeTab === 'accounts' && styles.accountTabTextActive
            ]}>
              Tài khoản
            </Text>
            {activeTab === 'accounts' && <View style={styles.accountTabUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.accountTab, activeTab === 'savings' && styles.accountTabActive]}
            onPress={() => setActiveTab('savings')}>
            <Text style={[
              styles.accountTabText,
              activeTab === 'savings' && styles.accountTabTextActive
            ]}>
              Sổ tiết kiệm
            </Text>
            {activeTab === 'savings' && <View style={styles.accountTabUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.accountTab, activeTab === 'accumulation' && styles.accountTabActive]}
            onPress={() => setActiveTab('accumulation')}>
            <Text style={[
              styles.accountTabText,
              activeTab === 'accumulation' && styles.accountTabTextActive
            ]}>
              Tích lũy
            </Text>
            {activeTab === 'accumulation' && <View style={styles.accountTabUnderline} />}
          </TouchableOpacity>
        </View>

        {/* Total Balance Section */}
        <View style={styles.accountTotalBalance}>
          <Text style={styles.accountTotalLabel}>Tổng tiền</Text>
          <Text style={styles.accountTotalAmount}>{formatCurrency(totalBalance)}</Text>
        </View>

        {/* Account Categories Section */}
        <View style={styles.accountCategoriesSection}>
          <Text style={styles.accountCategoriesLabel}>Đang sử dụng</Text>
          
          {accountCategories.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <MaterialIcons name="account-balance-wallet" size={48} color="#4B5563" />
              <Text style={{ color: '#9CA3AF', marginTop: 12, textAlign: 'center', marginBottom: 20 }}>
                Chưa có tài khoản nào.{'\n'}Hãy thêm tài khoản để bắt đầu quản lý tài chính.
              </Text>
              <TouchableOpacity
                style={localStyles.addAccountButton}
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
                  <Text style={styles.accountCategoryName}>
                    {category.accountTypeName} ({formatCurrency(category.totalBalance)})
                  </Text>
                  <MaterialIcons
                    name={expandedCategories.includes(category.accountTypeId) ? 'keyboard-arrow-down' : 'keyboard-arrow-right'}
                    size={24}
                    color="#00D492"
                  />
                </TouchableOpacity>

                {/* Account Items */}
                {expandedCategories.includes(category.accountTypeId) && (
                  <View style={styles.accountItemsContainer}>
                    {category.moneySources.map((account) => (
                      <View key={account.id} style={styles.accountItem}>
                        <View style={[styles.accountItemIcon, { backgroundColor: account.color || '#51A2FF' }]}>
                          <MaterialIcons name={(account.icon || 'account-balance-wallet') as any} size={20} color="#FFFFFF" />
                        </View>
                        <View style={styles.accountItemInfo}>
                          <Text style={styles.accountItemName}>{account.name}</Text>
                          <Text style={styles.accountItemAmount}>{formatCurrency(account.balance)}</Text>
                        </View>
                        <TouchableOpacity style={styles.accountItemMenu}>
                          <MaterialIcons name="more-vert" size={20} color="#99A1AF" />
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
        style={localStyles.fab}
        onPress={handleAddMoneySource}
        activeOpacity={0.8}>
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 50, // Above bottom navigation
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#51A2FF',
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
    backgroundColor: '#51A2FF',
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
