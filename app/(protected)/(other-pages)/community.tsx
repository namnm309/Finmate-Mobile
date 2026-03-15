import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCommunityService } from '@/lib/services/communityService';
import {
  type CommunityFilter,
  type CommunityCommentDto,
  type CommunityPostDto,
  formatCommunityTimeAgo,
  type PostCategory
} from '@/lib/types/community';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { styles } from '@/styles/index.styles';

interface Post {
  id: string;
  user: { id: string; name: string; initials: string; verified: boolean };
  category: PostCategory;
  timeAgo: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  bookmarked: boolean;
  isFollowing: boolean;
  isOwnPost: boolean;
}

interface CommentItem extends CommunityCommentDto {
  optimistic?: boolean;
}

const categoryConfig: Record<PostCategory, { label: string; color: string }> = {
  tips: { label: 'Tips tiết kiệm', color: '#00D492' },
  experience: { label: 'Kinh nghiệm', color: '#51A2FF' },
  qa: { label: 'Hồi đáp', color: '#9810FA' },
  challenge: { label: 'Thử thách', color: '#FF6900' },
};

const filterConfig: {
  key: CommunityFilter;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { key: 'featured', label: 'Nổi bật', icon: 'local-fire-department' },
  { key: 'newest', label: 'Mới nhất', icon: 'schedule' },
  { key: 'following', label: 'Theo dõi', icon: 'people' },
];

const mapApiPostToViewModel = (post: CommunityPostDto): Post => ({
  id: post.id,
  user: {
    id: post.user.id,
    name: post.user.name,
    initials: post.user.initials,
    verified: post.user.verified,
  },
  category: post.category,
  timeAgo: formatCommunityTimeAgo(post.createdAt),
  content: post.content,
  likes: post.likesCount,
  comments: post.commentsCount,
  shares: post.sharesCount,
  liked: post.likedByCurrentUser,
  bookmarked: post.bookmarkedByCurrentUser,
  isFollowing: post.isFollowingByCurrentUser ?? false,
  isOwnPost: post.isOwnPost ?? false,
});

export default function CommunityScreen() {
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const { getPosts, createPost, toggleLike, toggleBookmark, getComments, createComment, followUser, unfollowUser } =
    useCommunityService();
  const [activeFilter, setActiveFilter] = useState<CommunityFilter>('featured');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerVisible, setComposerVisible] = useState(false);
  const [composerCategory, setComposerCategory] = useState<PostCategory>('tips');
  const [composerContent, setComposerContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [commentSheetPostId, setCommentSheetPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [replyToComment, setReplyToComment] = useState<CommentItem | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const lastFetchedFilterRef = useRef<CommunityFilter | null>(null);
  const activeCommentPost = commentSheetPostId
    ? posts.find(post => post.id === commentSheetPostId) ?? null
    : null;

  const handleBack = () => {
    router.push('/(protected)/(tabs)/other');
  };

  const loadPosts = useCallback(async (filter: CommunityFilter) => {
    setLoading(true);
    setError(null);

    try {
      const response = await getPosts(filter, 1, 20);
      setPosts((response.items ?? []).map(mapApiPostToViewModel));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải cộng đồng');
    } finally {
      setLoading(false);
    }
  }, [getPosts]);

  useEffect(() => {
    if (lastFetchedFilterRef.current === activeFilter) {
      return;
    }
    lastFetchedFilterRef.current = activeFilter;
    void loadPosts(activeFilter);
  }, [activeFilter, loadPosts]);

  useEffect(() => {
    if (!commentSheetPostId) {
      return;
    }

    let isMounted = true;

    const loadPostComments = async () => {
      setCommentsLoading(true);
      setCommentsError(null);

      try {
        const response = await getComments(commentSheetPostId);
        if (!isMounted) {
          return;
        }
        setComments(response);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }
        setCommentsError(loadError instanceof Error ? loadError.message : 'Không thể tải bình luận');
      } finally {
        if (isMounted) {
          setCommentsLoading(false);
        }
      }
    };

    void loadPostComments();

    return () => {
      isMounted = false;
    };
  }, [commentSheetPostId, getComments]);

  const replacePost = (updatedPost: CommunityPostDto) => {
    setPosts(currentPosts =>
      currentPosts.map(post =>
        post.id === updatedPost.id ? mapApiPostToViewModel(updatedPost) : post
      )
    );
  };

  const incrementPostCommentCount = (postId: string) => {
    setPosts(currentPosts =>
      currentPosts.map(post =>
        post.id === postId ? { ...post, comments: post.comments + 1 } : post
      )
    );
  };

  const handleOpenComments = (postId: string) => {
    setCommentSheetPostId(postId);
    setComments([]);
    setCommentsError(null);
    setReplyToComment(null);
    setCommentInput('');
  };

  const handleCloseComments = () => {
    if (commentSending) {
      return;
    }

    setCommentSheetPostId(null);
    setComments([]);
    setCommentsError(null);
    setReplyToComment(null);
    setCommentInput('');
  };

  const handleReplyToComment = (comment: CommentItem) => {
    setReplyToComment(comment);
  };

  const handleSubmitComment = async () => {
    const trimmedContent = commentInput.trim();
    if (!commentSheetPostId || !trimmedContent) {
      return;
    }

    const optimisticId = `temp-${Date.now()}`;
    const replyTarget = replyToComment;
    const optimisticComment: CommentItem = {
      id: optimisticId,
      postId: commentSheetPostId,
      content: trimmedContent,
      parentCommentId: replyTarget?.id ?? null,
      createdAt: new Date().toISOString(),
      user: {
        id: 'current-user',
        name: 'Bạn',
        initials: 'B',
        verified: false,
      },
      optimistic: true,
    };

    setComments(currentComments => [...currentComments, optimisticComment]);
    setCommentInput('');
    setReplyToComment(null);
    setCommentSending(true);

    try {
      const createdComment = await createComment(commentSheetPostId, {
        content: trimmedContent,
        parentCommentId: replyTarget?.id,
      });

      setComments(currentComments =>
        currentComments.map(comment =>
          comment.id === optimisticId ? createdComment : comment
        )
      );
      incrementPostCommentCount(commentSheetPostId);
    } catch (submitError) {
      setComments(currentComments =>
        currentComments.filter(comment => comment.id !== optimisticId)
      );
      setCommentInput(trimmedContent);
      setReplyToComment(replyTarget);
      Alert.alert(
        'Không thể gửi bình luận',
        submitError instanceof Error ? submitError.message : 'Đã có lỗi xảy ra'
      );
    } finally {
      setCommentSending(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    try {
      const updatedPost = await toggleLike(postId);
      replacePost(updatedPost);
    } catch (toggleError) {
      Alert.alert(
        'Không thể thích bài viết',
        toggleError instanceof Error ? toggleError.message : 'Đã có lỗi xảy ra'
      );
    }
  };

  const handleToggleBookmark = async (postId: string) => {
    try {
      const updatedPost = await toggleBookmark(postId);
      replacePost(updatedPost);
    } catch (toggleError) {
      Alert.alert(
        'Không thể lưu bài viết',
        toggleError instanceof Error ? toggleError.message : 'Đã có lỗi xảy ra'
      );
    }
  };

  const updatePostFollowState = (authorId: string, isFollowing: boolean) => {
    setPosts(currentPosts =>
      currentPosts.map(post =>
        post.user.id === authorId ? { ...post, isFollowing } : post
      )
    );
  };

  const handleToggleFollow = async (authorId: string) => {
    const post = posts.find(p => p.user.id === authorId);
    if (!post || post.isOwnPost) return;

    const nextFollowing = !post.isFollowing;
    updatePostFollowState(authorId, nextFollowing);

    try {
      if (nextFollowing) {
        await followUser(authorId);
      } else {
        await unfollowUser(authorId);
      }
    } catch (toggleError) {
      updatePostFollowState(authorId, post.isFollowing);
      Alert.alert(
        'Không thể cập nhật theo dõi',
        toggleError instanceof Error ? toggleError.message : 'Đã có lỗi xảy ra'
      );
    }
  };

  const handleCreatePost = async () => {
    const trimmedContent = composerContent.trim();
    if (!trimmedContent) {
      Alert.alert('Thiếu nội dung', 'Hãy nhập nội dung bài viết trước khi đăng.');
      return;
    }

    try {
      setSubmittingPost(true);
      await createPost({
        category: composerCategory,
        content: trimmedContent,
      });

      setComposerVisible(false);
      setComposerContent('');
      setComposerCategory('tips');
      setActiveFilter('newest');
      // Chỉ đổi tab, effect sẽ tự gọi loadPosts('newest') một lần
    } catch (submitError) {
      Alert.alert(
        'Không thể đăng bài',
        submitError instanceof Error ? submitError.message : 'Đã có lỗi xảy ra'
      );
    } finally {
      setSubmittingPost(false);
    }
  };

  const renderFilterTab = (
    filter: CommunityFilter,
    label: string,
    icon: keyof typeof MaterialIcons.glyphMap
  ) => {
    const isActive = activeFilter === filter;

    return (
      <TouchableOpacity
        key={filter}
        style={[
          styles.communityFilterTab,
          isActive && styles.communityFilterTabActive
        ]}
        onPress={() => setActiveFilter(filter)}>
        {isActive ? (
          <LinearGradient
            colors={['#9810FA', '#155DFC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.communityFilterTabGradient}>
            <MaterialIcons name={icon} size={16} color="#FFFFFF" />
            <Text numberOfLines={1} style={styles.communityFilterTabTextActive}>{label}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.communityFilterTabInner}>
            <MaterialIcons name={icon} size={16} color="#99A1AF" />
            <Text numberOfLines={1} style={styles.communityFilterTabText}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCommentItem = (comment: CommentItem) => {
    const isReply = Boolean(comment.parentCommentId);

    return (
      <View
        key={comment.id}
        style={[
          styles.communityCommentItem,
          isReply && styles.communityCommentReplyItem
        ]}>
        <View style={[styles.communityCommentAvatar, { backgroundColor: '#51A2FF' }]}>
          <Text style={styles.communityCommentAvatarText}>{comment.user.initials}</Text>
        </View>
        <View style={styles.communityCommentBody}>
          <View style={styles.communityCommentBubble}>
            <View style={styles.communityCommentMetaRow}>
              <Text style={styles.communityCommentAuthor}>{comment.user.name}</Text>
              {comment.user.verified && (
                <MaterialIcons name="verified" size={14} color="#51A2FF" />
              )}
            </View>
            <Text style={styles.communityCommentContent}>{comment.content}</Text>
          </View>
          <View style={styles.communityCommentFooter}>
            <Text style={styles.communityCommentTime}>
              {formatCommunityTimeAgo(comment.createdAt)}
            </Text>
            <TouchableOpacity onPress={() => handleReplyToComment(comment)}>
              <Text style={styles.communityCommentReplyAction}>Trả lời</Text>
            </TouchableOpacity>
            {comment.optimistic && (
              <Text style={styles.communityCommentPending}>Đang gửi...</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
      <Modal
        visible={composerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !submittingPost && setComposerVisible(false)}>
        <View style={styles.communityComposerOverlay}>
          <View style={styles.communityComposerCard}>
            <View style={styles.communityComposerHeader}>
              <View>
                <Text style={styles.communityComposerTitle}>Đăng bài cộng đồng</Text>
                <Text style={styles.communityComposerSubtitle}>Chia sẻ mẹo hoặc trải nghiệm thật của bạn</Text>
              </View>
              <TouchableOpacity
                style={styles.communityComposerCloseButton}
                onPress={() => !submittingPost && setComposerVisible(false)}>
                <MaterialIcons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.communityComposerCategories}>
              {(Object.entries(categoryConfig) as [PostCategory, { label: string; color: string }][]).map(([key, config]) => {
                const isSelected = composerCategory === key;

                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.communityComposerCategoryChip,
                      isSelected && { borderColor: config.color, backgroundColor: `${config.color}22` }
                    ]}
                    onPress={() => setComposerCategory(key)}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.communityComposerCategoryChipText,
                        isSelected && { color: config.color }
                      ]}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              value={composerContent}
              onChangeText={setComposerContent}
              placeholder="Bạn đang muốn chia sẻ điều gì?"
              placeholderTextColor="#6B7280"
              multiline
              textAlignVertical="top"
              maxLength={2000}
              style={styles.communityComposerInput}
            />

            <View style={styles.communityComposerFooter}>
              <Text style={styles.communityComposerCount}>{composerContent.trim().length}/2000</Text>
              <View style={styles.communityComposerActions}>
                <TouchableOpacity
                  style={styles.communityComposerCancelButton}
                  onPress={() => !submittingPost && setComposerVisible(false)}>
                  <Text style={styles.communityComposerCancelText}>Huỷ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.communityComposerSubmitButton}
                  onPress={handleCreatePost}
                  disabled={submittingPost}>
                  {submittingPost ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.communityComposerSubmitText}>Đăng bài</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(commentSheetPostId)}
        animationType="slide"
        transparent
        onRequestClose={handleCloseComments}>
        <TouchableOpacity
          style={styles.communityCommentSheetOverlay}
          activeOpacity={1}
          onPress={handleCloseComments}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(event) => event.stopPropagation()}
            style={styles.communityCommentSheetCard}>
            <View style={styles.communityCommentSheetHeader}>
              <View>
                <Text style={styles.communityCommentSheetTitle}>Bình luận</Text>
                <Text style={styles.communityCommentSheetSubtitle}>
                  {activeCommentPost?.comments ?? comments.length} bình luận
                </Text>
              </View>
              <TouchableOpacity
                style={styles.communityCommentSheetCloseButton}
                onPress={handleCloseComments}>
                <MaterialIcons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.communityCommentSheetList}
              contentContainerStyle={styles.communityCommentSheetListContent}
              showsVerticalScrollIndicator={false}>
              {commentsLoading ? (
                <View style={styles.communityCommentStateCard}>
                  <ActivityIndicator size="small" color="#51A2FF" />
                  <Text style={styles.communityCommentStateText}>Đang tải bình luận...</Text>
                </View>
              ) : commentsError ? (
                <View style={styles.communityCommentStateCard}>
                  <MaterialIcons name="error-outline" size={24} color="#FB7185" />
                  <Text style={styles.communityCommentStateText}>{commentsError}</Text>
                </View>
              ) : comments.length === 0 ? (
                <View style={styles.communityCommentStateCard}>
                  <MaterialIcons name="chat-bubble-outline" size={24} color="#99A1AF" />
                  <Text style={styles.communityCommentStateText}>
                    Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ.
                  </Text>
                </View>
              ) : (
                comments.map(renderCommentItem)
              )}
            </ScrollView>

            <View style={styles.communityCommentComposer}>
              {replyToComment && (
                <View style={styles.communityCommentReplyBanner}>
                  <Text style={styles.communityCommentReplyBannerText}>
                    Trả lời {replyToComment.user.name}
                  </Text>
                  <TouchableOpacity onPress={() => setReplyToComment(null)}>
                    <Text style={styles.communityCommentReplyBannerAction}>Huỷ</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.communityCommentComposerRow}>
                <TextInput
                  value={commentInput}
                  onChangeText={setCommentInput}
                  placeholder={replyToComment ? 'Viết phản hồi của bạn...' : 'Viết bình luận...'}
                  placeholderTextColor="#6B7280"
                  multiline
                  textAlignVertical="top"
                  style={styles.communityCommentInput}
                />
                <TouchableOpacity
                  style={[
                    styles.communityCommentSendButton,
                    (!commentInput.trim() || commentSending) && styles.communityCommentSendButtonDisabled
                  ]}
                  onPress={() => void handleSubmitComment()}
                  disabled={!commentInput.trim() || commentSending}>
                  {commentSending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.communityCommentSendButtonText}>Gửi</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 90 + insets.bottom }]}
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
          <TouchableOpacity style={styles.communityPostButton} onPress={() => setComposerVisible(true)}>
            <MaterialIcons name="add-box" size={20} color="#FFFFFF" />
            <Text style={styles.communityPostButtonText}>Đăng bài</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.communityFilterTabs}>
          {filterConfig.map(filter => renderFilterTab(filter.key, filter.label, filter.icon))}
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
        {loading ? (
          <View style={styles.communityStateCard}>
            <ActivityIndicator size="large" color="#51A2FF" />
            <Text style={styles.communityStateText}>Đang tải bài viết cộng đồng...</Text>
          </View>
        ) : error ? (
          <View style={styles.communityStateCard}>
            <MaterialIcons name="error-outline" size={28} color="#FB7185" />
            <Text style={styles.communityStateText}>{error}</Text>
            <TouchableOpacity style={styles.communityRetryButton} onPress={() => void loadPosts(activeFilter)}>
              <Text style={styles.communityRetryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.communityStateCard}>
            <MaterialIcons name="forum" size={28} color="#99A1AF" />
            <Text style={styles.communityStateText}>Chưa có bài viết nào cho bộ lọc này.</Text>
          </View>
        ) : posts.map((post) => {
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
                      {!post.isOwnPost && (
                        <TouchableOpacity
                          style={[
                            styles.communityFollowButton,
                            post.isFollowing && styles.communityFollowButtonActive
                          ]}
                          onPress={() => void handleToggleFollow(post.user.id)}>
                          <Text
                            style={[
                              styles.communityFollowButtonText,
                              post.isFollowing && styles.communityFollowButtonTextActive
                            ]}>
                            {post.isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.communityPostTime}>{post.timeAgo}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.communityPostContent}>{post.content}</Text>
              <View style={styles.communityPostActions}>
                <TouchableOpacity
                  style={styles.communityPostActionButton}
                  onPress={() => void handleToggleLike(post.id)}>
                  <MaterialIcons
                    name={post.liked ? 'favorite' : 'favorite-border'}
                    size={18}
                    color={post.liked ? '#FB7185' : '#99A1AF'}
                  />
                  <Text style={styles.communityPostActionText}>{post.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.communityPostActionButton}
                  onPress={() => handleOpenComments(post.id)}>
                  <MaterialIcons name="chat-bubble-outline" size={18} color="#99A1AF" />
                  <Text style={styles.communityPostActionText}>{post.comments}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.communityPostActionButton}>
                  <MaterialIcons name="share" size={18} color="#99A1AF" />
                  <Text style={styles.communityPostActionText}>{post.shares}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.communityPostActionButton}
                  onPress={() => void handleToggleBookmark(post.id)}>
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
