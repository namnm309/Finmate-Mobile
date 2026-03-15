export type PostCategory = 'tips' | 'experience' | 'qa' | 'challenge';
export type CommunityFilter = 'featured' | 'newest' | 'following';

export interface CommunityAuthor {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string | null;
  verified: boolean;
}

export interface CommunityPostDto {
  id: string;
  category: PostCategory;
  content: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  likedByCurrentUser: boolean;
  bookmarkedByCurrentUser: boolean;
  isFollowingByCurrentUser?: boolean;
  isOwnPost?: boolean;
  createdAt: string;
  user: CommunityAuthor;
}

export interface CommunityCommentDto {
  id: string;
  postId: string;
  content: string;
  parentCommentId?: string | null;
  createdAt: string;
  user: CommunityAuthor;
}

export interface CommunityPostsResponse {
  items: CommunityPostDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateCommunityPostRequest {
  category: PostCategory;
  content: string;
}

export interface CreateCommunityCommentRequest {
  content: string;
  parentCommentId?: string;
}

export const formatCommunityTimeAgo = (isoDate: string): string => {
  const createdAt = new Date(isoDate).getTime();
  if (Number.isNaN(createdAt)) {
    return 'Vua xong';
  }

  const diffMs = Date.now() - createdAt;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} phut truoc`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} gio truoc`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} ngay truoc`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} thang truoc`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} nam truoc`;
};
