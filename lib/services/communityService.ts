import { useCallback } from 'react';
import { API_BASE_URL, useApiClient } from '@/lib/api';
import type {
  CommunityCommentDto,
  CommunityFilter,
  CommunityPostDto,
  CommunityPostsResponse,
  CreateCommunityCommentRequest,
  CreateCommunityPostRequest,
} from '@/lib/types/community';

export const useCommunityService = () => {
  const { get, post, delete: del } = useApiClient();

  const ensureBaseUrl = () => {
    if (!API_BASE_URL) {
      throw new Error('Chua cau hinh API. Kiem tra EXPO_PUBLIC_API_BASE_URL trong .env.local');
    }
  };

  const getPosts = useCallback(
    async (
      filter: CommunityFilter,
      page = 1,
      pageSize = 10
    ): Promise<CommunityPostsResponse> => {
      ensureBaseUrl();
      return get<CommunityPostsResponse>(
        `${API_BASE_URL}/api/v1/community/posts?filter=${filter}&page=${page}&pageSize=${pageSize}`
      );
    },
    [get]
  );

  const createPost = useCallback(
    async (payload: CreateCommunityPostRequest): Promise<CommunityPostDto> => {
      ensureBaseUrl();
      return post<CommunityPostDto>(`${API_BASE_URL}/api/v1/community/posts`, payload);
    },
    [post]
  );

  const toggleLike = useCallback(
    async (postId: string): Promise<CommunityPostDto> => {
      ensureBaseUrl();
      return post<CommunityPostDto>(`${API_BASE_URL}/api/v1/community/posts/${postId}/like`);
    },
    [post]
  );

  const toggleBookmark = useCallback(
    async (postId: string): Promise<CommunityPostDto> => {
      ensureBaseUrl();
      return post<CommunityPostDto>(`${API_BASE_URL}/api/v1/community/posts/${postId}/bookmark`);
    },
    [post]
  );

  const getComments = useCallback(
    async (postId: string): Promise<CommunityCommentDto[]> => {
      ensureBaseUrl();
      return get<CommunityCommentDto[]>(
        `${API_BASE_URL}/api/v1/community/posts/${postId}/comments`
      );
    },
    [get]
  );

  const createComment = useCallback(
    async (
      postId: string,
      payload: CreateCommunityCommentRequest
    ): Promise<CommunityCommentDto> => {
      ensureBaseUrl();
      return post<CommunityCommentDto>(
        `${API_BASE_URL}/api/v1/community/posts/${postId}/comments`,
        payload
      );
    },
    [post]
  );

  const followUser = useCallback(
    async (userId: string): Promise<void> => {
      ensureBaseUrl();
      await post(`${API_BASE_URL}/api/v1/community/follow/${userId}`);
    },
    [post]
  );

  const unfollowUser = useCallback(
    async (userId: string): Promise<void> => {
      ensureBaseUrl();
      await del(`${API_BASE_URL}/api/v1/community/follow/${userId}`);
    },
    [del]
  );

  return {
    getPosts,
    createPost,
    toggleLike,
    toggleBookmark,
    getComments,
    createComment,
    followUser,
    unfollowUser,
  };
};
