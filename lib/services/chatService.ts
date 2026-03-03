import { API_BASE_URL } from '@/lib/api';
import { useApiClient } from '@/lib/api';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SendMessageOptions {
  /** Ảnh hóa đơn base64 (cho quét hóa đơn, vision) */
  imageBase64?: string;
  /** System prompt tùy chỉnh */
  systemPrompt?: string;
  /** Model MegaLLM (gpt-4, claude-3.5-sonnet, gpt-4o-mini...) - backend có thể override */
  model?: string;
  /** Nhiệt độ sinh văn bản (0–2), mặc định 0.7 */
  temperature?: number;
  /** Số token tối đa cho phản hồi */
  maxTokens?: number;
}

/** Response MegaLLM/OpenAI format */
export interface ChatResponse {
  content?: string;
  choices?: Array<{
    message?: { role?: string; content?: string };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string; type?: string; code?: string };
}

/**
 * Gửi tin nhắn tới Finmate-BE. Backend proxy tới MegaLLM (OpenAI-compatible).
 * Endpoint: POST {API_BASE_URL}/api/chat
 *
 * MegaLLM format: https://docs.megallm.io/api-reference/chat/create-chat-completion
 * - messages: array { role, content }
 * - model, temperature, max_tokens (optional)
 * - Vision: imageBase64 → backend chuyển thành content array với image_url
 */
export function useChatService() {
  const { post } = useApiClient();

  const sendMessage = async (
    messages: ChatMessage[],
    options?: SendMessageOptions
  ): Promise<string> => {
    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL chưa được cấu hình. Kiểm tra file .env.local');
    }

    const url = `${API_BASE_URL}/api/chat`;

    // Chuẩn bị body theo format MegaLLM/OpenAI (backend forward tới MegaLLM)
    const body: Record<string, unknown> = { messages };
    if (options?.systemPrompt) body.systemPrompt = options.systemPrompt;
    if (options?.imageBase64) body.imageBase64 = options.imageBase64;
    if (options?.model != null) body.model = options.model;
    if (options?.temperature != null) body.temperature = options.temperature;
    if (options?.maxTokens != null) body.max_tokens = options.maxTokens;

    const response = (await post(url, body)) as ChatResponse;

    // Xử lý lỗi MegaLLM
    if (response.error) {
      const msg = response.error.message || response.error.code || 'Lỗi từ AI';
      if (response.error.code === 'invalid_api_key' || response.error.type === 'invalid_request_error') {
        throw new Error(`Lỗi xác thực MegaLLM: ${msg}. Kiểm tra MEGALLM_API_KEY trên Finmate-BE.`);
      }
      if (response.error.code === 'rate_limit_exceeded') {
        throw new Error('Vượt giới hạn. Vui lòng thử lại sau vài giây.');
      }
      throw new Error(msg);
    }

    // Hỗ trợ format flatten { content } và format OpenAI { choices }
    if (response.content) return response.content;
    const content = response.choices?.[0]?.message?.content;
    if (content != null) return content;
    throw new Error('Phản hồi từ AI không hợp lệ');
  };

  return { sendMessage };
}
