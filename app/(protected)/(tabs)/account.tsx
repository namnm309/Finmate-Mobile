import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { styles } from '@/styles/index.styles';

// Format số tiền VNĐ
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

// Mock data
const accountCategories = [
  {
    id: 1,
    name: 'Tiền mặt',
    total: 5090000,
    accounts: [
      { id: 1, name: 'Tiền mặt', amount: 1850000, icon: 'account-balance-wallet', color: '#51A2FF' },
      { id: 2, name: 'Tiền mặt trong ví', amount: 3240000, icon: 'wallet', color: '#51A2FF' }
    ]
  },
  {
    id: 2,
    name: 'Tài khoản ngân hàng',
    total: 16425000,
    accounts: [
      { id: 3, name: 'Vietcombank', amount: 16425000, icon: 'account-balance', color: '#51A2FF' }
    ]
  },
  {
    id: 3,
    name: 'Ví điện tử',
    total: 2050000,
    accounts: [
      { id: 4, name: 'Momo', amount: 1550000, icon: 'account-balance-wallet', color: '#A50064' },
      { id: 5, name: 'Shoppe', amount: 500000, icon: 'shopping-bag', color: '#EE4D2D' }
    ]
  },
  {
    id: 4,
    name: 'Khác',
    total: 1250000,
    accounts: [
      { id: 6, name: 'VÍ FAP', amount: 1250000, icon: 'account-balance-wallet', color: '#00D492' }
    ]
  }
];

type TabType = 'accounts' | 'savings' | 'accumulation';

export default function AccountScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('accounts');
  const [expandedCategories, setExpandedCategories] = useState<number[]>([1, 2, 3, 4]);
  const totalBalance = 24815000;

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
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
          
          {accountCategories.map((category) => (
            <View key={category.id} style={styles.accountCategory}>
              {/* Category Header */}
              <TouchableOpacity
                style={styles.accountCategoryHeader}
                onPress={() => toggleCategory(category.id)}
                activeOpacity={0.7}>
                <Text style={styles.accountCategoryName}>
                  {category.name} ({formatCurrency(category.total)})
                </Text>
                <MaterialIcons
                  name={expandedCategories.includes(category.id) ? 'keyboard-arrow-down' : 'keyboard-arrow-right'}
                  size={24}
                  color="#00D492"
                />
              </TouchableOpacity>

              {/* Account Items */}
              {expandedCategories.includes(category.id) && (
                <View style={styles.accountItemsContainer}>
                  {category.accounts.map((account) => (
                    <View key={account.id} style={styles.accountItem}>
                      <View style={[styles.accountItemIcon, { backgroundColor: account.color }]}>
                        <MaterialIcons name={account.icon as any} size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.accountItemInfo}>
                        <Text style={styles.accountItemName}>{account.name}</Text>
                        <Text style={styles.accountItemAmount}>{formatCurrency(account.amount)}</Text>
                      </View>
                      <TouchableOpacity style={styles.accountItemMenu}>
                        <MaterialIcons name="more-vert" size={20} color="#99A1AF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}
