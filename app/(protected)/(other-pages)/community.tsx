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
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { styles } from '@/styles/index.styles';

type PostCategory = 'tips' | 'experience' | 'qa' | 'challenge';
type FilterType = 'featured' | 'newest' | 'following';

interface Post {
  id: string;
  user: { name: string; initials: string; verified: boolean };
  category: PostCategory;
  timeAgo: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  bookmarked: boolean;
}

// Mock data
const mockPosts: Post[] = [
  {
    id: '1',
    user: { name: 'Minh Anh', initials: 'MA', verified: true },
    category: 'tips',
    timeAgo: '2 giờ trước',
    content: 'Thay vì mua cà phê ngoài 35k/ly, mình tự pha ở nhà chỉ tốn 5k. Tiết kiệm được 900k/tháng! ☕️💰',
    likes: 234,
    comments: 45,
    shares: 12,
    bookmarked: false,
  },
  {
    id: '2',
    user: { name: 'Tuấn Kiệt', initials: 'TK', verified: false },
    category: 'experience',
    timeAgo: '5 giờ trước',
    content: 'Quy tắc 48 giờ: Trước khi mua gì đó, đợi 48 giờ. Nếu sau đó vẫn muốn mua thì mới mua. Đã giúp mình tránh được nhiều khoản chi không cần thiết!',
    likes: 189,
    comments: 32,
    shares: 28,
    bookmarked: true,
  },
  {
    id: '3',
    user: { name: 'Lan Hương', initials: 'LH', verified: true },
    category: 'qa',
    timeAgo: '1 ngày trước',
    content: 'Gia đình 4 người, tiền điện tháng này 500k. Có ai có tips tiết kiệm điện không? 💡',
    likes: 67,
    comments: 89,
    shares: 5,
    bookmarked: false,
  },
  {
    id: '4',
    user: { name: 'Đức Thắng', initials: 'DT', verified: false },
    category: 'challenge',
    timeAgo: '2 ngày trước',
    content: 'Thử thách: Tiết kiệm 20k mỗi ngày. Sau 1 năm sẽ có 7,3 triệu để đi du lịch cuối năm! 🎯✈️',
    likes: 456,
    comments: 123,
    shares: 67,
    bookmarked: false,
  },
  {
    id: '5',
    user: { name: 'Thu Trang', initials: 'TT', verified: false },
    category: 'tips',
    timeAgo: '3 ngày trước',
    content: 'Meal prep vào cuối tuần giúp mình giảm chi phí ăn uống 40%! Vừa tiết kiệm vừa healthy 🥗',
    likes: 312,
    comments: 78,
    shares: 34,
    bookmarked: true,
  },
];

const categoryConfig: Record<PostCategory, { label: string; color: string }> = {
  tips: { label: 'Tips tiết kiệm', color: '#00D492' },
  experience: { label: 'Kinh nghiệm', color: '#51A2FF' },
  qa: { label: 'Hồi đáp', color: '#9810FA' },
  challenge: { label: 'Thử thách', color: '#FF6900' },
};

export default function CommunityScreen() {
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const [activeFilter, setActiveFilter] = useState<FilterType>('featured');
  const [posts, setPosts] = useState<Post[]>(mockPosts);

  const handleBack = () => {
    router.push('/(protected)/(tabs)/other');
  };

  const toggleBookmark = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId ? { ...post, bookmarked: !post.bookmarked } : post
    ));
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.communityHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.communityBackButton}>
            <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <View style={styles.communityHeaderCenter}>
            <Text style={[styles.communityTitle, { color: themeColors.text }]}>Cộng đồng</Text>
            <Text style={[styles.communitySubtitle, { color: themeColors.textSecondary }]}>Chia sẻ tips tiết kiệm</Text>
          </View>
          <TouchableOpacity style={styles.communityPostButton}>
            <MaterialIcons name="add-box" size={20} color="#FFFFFF" />
            <Text style={styles.communityPostButtonText}>Đăng bài</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.communityFilterTabs}>
          <TouchableOpacity
            style={[
              styles.communityFilterTab,
              activeFilter === 'featured' && styles.communityFilterTabActive
            ]}
            onPress={() => setActiveFilter('featured')}>
            {activeFilter === 'featured' && (
              <LinearGradient
                colors={['#9810FA', '#155DFC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.communityFilterTabGradient}>
                <MaterialIcons name="local-fire-department" size={16} color="#FFFFFF" />
                <Text style={styles.communityFilterTabTextActive}>Nổi bật</Text>
              </LinearGradient>
            )}
            {activeFilter !== 'featured' && (
              <>
                <MaterialIcons name="local-fire-department" size={16} color="#99A1AF" />
                <Text style={styles.communityFilterTabText}>Nổi bật</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.communityFilterTab,
              activeFilter === 'newest' && styles.communityFilterTabActive
            ]}
            onPress={() => setActiveFilter('newest')}>
            {activeFilter === 'newest' && (
              <LinearGradient
                colors={['#9810FA', '#155DFC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.communityFilterTabGradient}>
                <MaterialIcons name="schedule" size={16} color="#FFFFFF" />
                <Text style={styles.communityFilterTabTextActive}>Mới nhất</Text>
              </LinearGradient>
            )}
            {activeFilter !== 'newest' && (
              <>
                <MaterialIcons name="schedule" size={16} color="#99A1AF" />
                <Text style={styles.communityFilterTabText}>Mới nhất</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.communityFilterTab,
              activeFilter === 'following' && styles.communityFilterTabActive
            ]}
            onPress={() => setActiveFilter('following')}>
            {activeFilter === 'following' && (
              <LinearGradient
                colors={['#9810FA', '#155DFC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.communityFilterTabGradient}>
                <MaterialIcons name="people" size={16} color="#FFFFFF" />
                <Text style={styles.communityFilterTabTextActive}>Theo dõi</Text>
              </LinearGradient>
            )}
            {activeFilter !== 'following' && (
              <>
                <MaterialIcons name="people" size={16} color="#99A1AF" />
                <Text style={styles.communityFilterTabText}>Theo dõi</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Card */}
        <View style={styles.communityStatsCard}>
          <LinearGradient
            colors={['#9810FA', '#155DFC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.communityStatsCardGradient}>
            <View style={styles.communityStatsCardLeft}>
              <View style={styles.communityStatsIcon}>
                <MaterialIcons name="people" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.communityStatsLabel}>Thành viên cộng đồng</Text>
              <Text style={styles.communityStatsValue}>12,543</Text>
            </View>
            <View style={styles.communityStatsCardRight}>
              <Text style={styles.communityStatsToday}>+234 hôm nay</Text>
              <Text style={styles.communityStatsShared}>Tips đã chia sẻ: 8,921</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Posts Feed */}
        {posts.map((post) => {
          const category = categoryConfig[post.category];
          return (
            <View key={post.id} style={styles.communityPostCard}>
              <View style={styles.communityPostHeader}>
                <View style={styles.communityPostUserInfo}>
                  <View style={[styles.communityPostAvatar, { backgroundColor: '#51A2FF' }]}>
                    <Text style={styles.communityPostAvatarText}>{post.user.initials}</Text>
                  </View>
                  <View style={styles.communityPostUserDetails}>
                    <View style={styles.communityPostUserNameRow}>
                      <Text style={styles.communityPostUserName}>{post.user.name}</Text>
                      {post.user.verified && (
                        <MaterialIcons name="verified" size={16} color="#51A2FF" />
                      )}
                      <View style={[styles.communityPostCategoryTag, { backgroundColor: category.color }]}>
                        <Text style={styles.communityPostCategoryTagText}>{category.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.communityPostTime}>{post.timeAgo}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.communityPostContent}>{post.content}</Text>
              <View style={styles.communityPostActions}>
                <TouchableOpacity style={styles.communityPostActionButton}>
                  <MaterialIcons name="favorite-border" size={18} color="#99A1AF" />
                  <Text style={styles.communityPostActionText}>{post.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.communityPostActionButton}>
                  <MaterialIcons name="chat-bubble-outline" size={18} color="#99A1AF" />
                  <Text style={styles.communityPostActionText}>{post.comments}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.communityPostActionButton}>
                  <MaterialIcons name="share" size={18} color="#99A1AF" />
                  <Text style={styles.communityPostActionText}>{post.shares}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.communityPostActionButton}
                  onPress={() => toggleBookmark(post.id)}>
                  <MaterialIcons
                    name={post.bookmarked ? 'bookmark' : 'bookmark-border'}
                    size={18}
                    color={post.bookmarked ? '#FBBF24' : '#99A1AF'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}
