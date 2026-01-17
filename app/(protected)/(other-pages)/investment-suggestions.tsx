import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { styles } from '@/styles/index.styles';

type RiskLevel = 'low' | 'medium' | 'high' | 'very-high';
type FilterType = 'all' | 'low-risk' | 'high-profit';

interface InvestmentChannel {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconColor: string;
  riskLevel: RiskLevel;
  returnRange: string;
  minInvestment: string;
}

// Mock data
const allChannels: InvestmentChannel[] = [
  {
    id: '1',
    name: 'Chứng khoán',
    description: 'Đầu tư vào cổ phiếu các công ty niêm yết trên sàn chứng khoán',
    icon: 'show-chart',
    iconColor: '#51A2FF',
    riskLevel: 'high',
    returnRange: '10-25%',
    minInvestment: '5.000.000 ₫+',
  },
  {
    id: '2',
    name: 'Tiết kiệm ngân hàng',
    description: 'Gửi tiết kiệm có kỳ hạn tại các ngân hàng uy tín',
    icon: 'account-balance',
    iconColor: '#00D492',
    riskLevel: 'low',
    returnRange: '4-7%',
    minInvestment: '1.000.000 ₫+',
  },
  {
    id: '3',
    name: 'Quỹ mở',
    description: 'Ủy thác cho quỹ đầu tư chuyên nghiệp quản lý danh mục',
    icon: 'business',
    iconColor: '#9810FA',
    riskLevel: 'medium',
    returnRange: '8-15%',
    minInvestment: '1.000.000 ₫+',
  },
  {
    id: '4',
    name: 'Tiền điện tử',
    description: 'Đầu tư vào Bitcoin, Ethereum và các cryptocurrency khác',
    icon: 'currency-bitcoin',
    iconColor: '#FF6900',
    riskLevel: 'very-high',
    returnRange: '-50-100%',
    minInvestment: '500.000 ₫+',
  },
  {
    id: '5',
    name: 'Bất động sản',
    description: 'Mua đất, nhà để cho thuê hoặc chờ tăng giá',
    icon: 'home',
    iconColor: '#22D3EE',
    riskLevel: 'medium',
    returnRange: '5-20%',
    minInvestment: '500.000.000 ₫+',
  },
  {
    id: '6',
    name: 'Vàng',
    description: 'Mua vàng miếng, vàng nhẫn hoặc SJC để bảo toàn tài sản',
    icon: 'monetization-on',
    iconColor: '#FBBF24',
    riskLevel: 'low',
    returnRange: '3-10%',
    minInvestment: '5.000.000 ₫+',
  },
];

const riskConfig: Record<RiskLevel, { label: string; color: string }> = {
  low: { label: 'Thấp', color: '#00D492' },
  medium: { label: 'Trung bình', color: '#FF6900' },
  high: { label: 'Cao', color: '#FF6900' },
  'very-high': { label: 'Rất cao', color: '#FB2C36' },
};

export default function InvestmentSuggestionsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const handleBack = () => {
    router.push('/(protected)/(tabs)/other');
  };

  const getFilteredChannels = (): InvestmentChannel[] => {
    switch (activeFilter) {
      case 'low-risk':
        return allChannels.filter(ch => ch.riskLevel === 'low');
      case 'high-profit':
        return allChannels.filter(ch => 
          ch.id === '1' || ch.id === '4' || ch.id === '5' // Stocks, Crypto, Real Estate
        );
      default:
        return allChannels;
    }
  };

  const channels = getFilteredChannels();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.investmentHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.investmentBackButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.investmentHeaderCenter}>
            <Text style={styles.investmentTitle}>Gợi ý kiếm tiền</Text>
            <Text style={styles.investmentSubtitle}>Các kênh đầu tư phổ biến</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Info Card */}
        <View style={styles.investmentInfoCard}>
          <LinearGradient
            colors={['#9810FA', '#155DFC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.investmentInfoCardGradient}>
            <View style={styles.investmentInfoCardContent}>
              <View style={styles.investmentInfoIcon}>
                <MaterialIcons name="lightbulb" size={24} color="#FBBF24" />
              </View>
              <View style={styles.investmentInfoText}>
                <Text style={styles.investmentInfoTitle}>Đầu tư thông minh</Text>
                <Text style={styles.investmentInfoDescription}>
                  Tham khảo các kênh đầu tư phù hợp với tài chính và mức độ rủi ro bạn chấp nhận được. Đa dạng hóa danh mục để giảm thiểu rủi ro.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Filter Tabs */}
        <View style={styles.investmentFilterTabs}>
          <TouchableOpacity
            style={[
              styles.investmentFilterTab,
              activeFilter === 'all' && styles.investmentFilterTabActive
            ]}
            onPress={() => setActiveFilter('all')}>
            <Text style={[
              styles.investmentFilterTabText,
              activeFilter === 'all' && styles.investmentFilterTabTextActive
            ]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.investmentFilterTab,
              activeFilter === 'low-risk' && styles.investmentFilterTabActive
            ]}
            onPress={() => setActiveFilter('low-risk')}>
            <MaterialIcons
              name="shield"
              size={16}
              color={activeFilter === 'low-risk' ? '#FFFFFF' : '#99A1AF'}
            />
            <Text style={[
              styles.investmentFilterTabText,
              activeFilter === 'low-risk' && styles.investmentFilterTabTextActive
            ]}>
              Rủi ro thấp
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.investmentFilterTab,
              activeFilter === 'high-profit' && styles.investmentFilterTabActive
            ]}
            onPress={() => setActiveFilter('high-profit')}>
            <MaterialIcons
              name="star-outline"
              size={16}
              color={activeFilter === 'high-profit' ? '#FFFFFF' : '#99A1AF'}
            />
            <Text style={[
              styles.investmentFilterTabText,
              activeFilter === 'high-profit' && styles.investmentFilterTabTextActive
            ]}>
              Lợi nhuận cao
            </Text>
          </TouchableOpacity>
        </View>

        {/* Investment Channels */}
        {channels.map((channel) => {
          const risk = riskConfig[channel.riskLevel];
          return (
            <TouchableOpacity
              key={channel.id}
              style={styles.investmentChannelCard}
              activeOpacity={0.7}>
              <View style={[styles.investmentChannelIcon, { backgroundColor: channel.iconColor }]}>
                <MaterialIcons name={channel.icon as any} size={24} color="#FFFFFF" />
              </View>
              <View style={styles.investmentChannelContent}>
                <Text style={styles.investmentChannelName}>{channel.name}</Text>
                <Text style={styles.investmentChannelDescription}>{channel.description}</Text>
                <View style={styles.investmentChannelTags}>
                  <View style={[styles.investmentTag, { borderColor: risk.color }]}>
                    <Text style={[styles.investmentTagText, { color: risk.color }]}>
                      {risk.label}
                    </Text>
                  </View>
                  <View style={[styles.investmentTag, { borderColor: '#00D492' }]}>
                    <Text style={[styles.investmentTagText, { color: '#00D492' }]}>
                      % {channel.returnRange}
                    </Text>
                  </View>
                  <View style={[styles.investmentTag, { borderColor: '#51A2FF' }]}>
                    <Text style={[styles.investmentTagText, { color: '#51A2FF' }]}>
                      {channel.minInvestment}
                    </Text>
                  </View>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#99A1AF" />
            </TouchableOpacity>
          );
        })}

        {/* Disclaimer */}
        <View style={styles.investmentDisclaimer}>
          <MaterialIcons name="warning" size={20} color="#FF6900" />
          <Text style={styles.investmentDisclaimerText}>
            Thông tin chỉ mang tính chất tham khảo. Không phải lời khuyên đầu tư. Luôn nghiên cứu kỹ và tham khảo chuyên gia trước khi đầu tư.
          </Text>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}
