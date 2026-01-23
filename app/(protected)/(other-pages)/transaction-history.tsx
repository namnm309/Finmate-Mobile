import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { styles } from '@/styles/index.styles';
import { useTransactionService } from '@/lib/services/transactionService';
import { TransactionDto } from '@/lib/types/transaction';

// Format số tiền VNĐ
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

// Format ngày tháng
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Format thời gian
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

// Group transactions by date
const groupTransactionsByDate = (transactions: TransactionDto[]) => {
  const groups: { [key: string]: TransactionDto[] } = {};
  
  transactions.forEach(transaction => {
    const dateKey = formatDate(transaction.transactionDate);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(transaction);
  });

  // Sort dates descending
  const sortedDates = Object.keys(groups).sort((a, b) => {
    const dateA = new Date(a.split('/').reverse().join('-'));
    const dateB = new Date(b.split('/').reverse().join('-'));
    return dateB.getTime() - dateA.getTime();
  });

  return sortedDates.map(date => ({
    date,
    transactions: groups[date].sort((a, b) => {
      const timeA = new Date(a.transactionDate).getTime();
      const timeB = new Date(b.transactionDate).getTime();
      return timeB - timeA;
    })
  }));
};

interface TransactionGroup {
  date: string;
  transactions: TransactionDto[];
}

export default function TransactionHistoryScreen() {
  const router = useRouter();
  const { getTransactions } = useTransactionService();
  
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const pageSize = 20;

  const fetchTransactions = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      const response = await getTransactions({
        page: pageNum,
        pageSize: pageSize,
        ...(searchQuery && { 
          // Note: Backend might need to support search by description
          // For now, we'll filter on frontend
        })
      });

      if (append) {
        setTransactions(prev => [...prev, ...response.transactions]);
      } else {
        setTransactions(response.transactions);
      }

      setTotalCount(response.totalCount);
      setHasMore(response.transactions.length === pageSize && (pageNum * pageSize) < response.totalCount);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [getTransactions, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions(1, false);
      setPage(1);
    }, [fetchTransactions])
  );

  // Filter transactions by search query
  const filteredTransactions = searchQuery
    ? transactions.filter(t => 
        t.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.moneySourceName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transactions;

  const groupedTransactions = groupTransactionsByDate(filteredTransactions);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchTransactions(nextPage, true);
    }
  };

  const renderTransaction = (transaction: TransactionDto) => {
    const isIncome = transaction.isIncome;
    const amountColor = isIncome ? '#10B981' : '#EF4444';
    const amountPrefix = isIncome ? '+' : '-';

    return (
      <View
        key={transaction.id}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: '#1F2937',
          marginBottom: 8,
          borderRadius: 8,
        }}>
        {/* Icon */}
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: transaction.transactionTypeColor || '#6B7280',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}>
          <MaterialIcons 
            name={(transaction.categoryIcon || 'category') as any} 
            size={24} 
            color="#FFFFFF" 
          />
        </View>

        {/* Transaction Info */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '500',
              marginBottom: 4,
            }}>
            {transaction.categoryName}
          </Text>
          <Text
            style={{
              color: '#9CA3AF',
              fontSize: 12,
            }}>
            {formatTime(transaction.transactionDate)}
          </Text>
          {transaction.description && (
            <Text
              style={{
                color: '#6B7280',
                fontSize: 11,
                marginTop: 2,
              }}>
              {transaction.description}
            </Text>
          )}
        </View>

        {/* Amount */}
        <Text
          style={{
            color: amountColor,
            fontSize: 16,
            fontWeight: '600',
          }}>
          {amountPrefix}{formatCurrency(transaction.amount)}
        </Text>
      </View>
    );
  };

  const renderDateGroup = (group: TransactionGroup) => {
    return (
      <View key={group.date} style={{ marginBottom: 24 }}>
        {/* Date Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            marginBottom: 12,
          }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: '600',
            }}>
            {group.date}
          </Text>
          <Text
            style={{
              color: '#9CA3AF',
              fontSize: 14,
            }}>
            {group.transactions.length} giao dịch
          </Text>
        </View>

        {/* Transactions */}
        {group.transactions.map(transaction => renderTransaction(transaction))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#111827' }]}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 16,
          backgroundColor: '#1F2937',
        }}>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 20,
            fontWeight: '600',
          }}>
          Lịch sử giao dịch
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: '#3B82F6',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <MaterialIcons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#1F2937',
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#374151',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}>
          <MaterialIcons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 8,
              color: '#FFFFFF',
              fontSize: 14,
            }}
            placeholder="Tìm kiếm giao dịch..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Bar */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#1F2937',
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialIcons name="calendar-today" size={18} color="#9CA3AF" />
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 14,
              marginLeft: 8,
            }}>
            Tất cả
          </Text>
        </View>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#3B82F6',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6,
          }}>
          <MaterialIcons name="filter-list" size={16} color="#FFFFFF" />
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 14,
              marginLeft: 4,
            }}>
            Lọc
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transaction List */}
      {loading && transactions.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : groupedTransactions.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <MaterialIcons name="receipt-long" size={64} color="#6B7280" />
          <Text
            style={{
              color: '#9CA3AF',
              fontSize: 16,
              marginTop: 16,
              textAlign: 'center',
            }}>
            {searchQuery ? 'Không tìm thấy giao dịch' : 'Chưa có giao dịch nào'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
            if (isCloseToBottom && hasMore && !loading) {
              loadMore();
            }
          }}
          scrollEventThrottle={400}>
          {groupedTransactions.map(group => renderDateGroup(group))}
          
          {loading && transactions.length > 0 && (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
