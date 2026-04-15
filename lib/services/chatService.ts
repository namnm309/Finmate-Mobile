import { API_BASE_URL, useApiClient } from '@/lib/api';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SendMessageOptions {
  /** Ảnh hóa đơn base64 — backend cần chuyển thành vision message trước khi gọi MegaLLM */
  imageBase64?: string;
  /** Định dạng ảnh: "png" | "jpeg" (mặc định "jpeg") */
  imageFormat?: 'png' | 'jpeg';
  /** System prompt tùy chỉnh */
  systemPrompt?: string;
  /** Model MegaLLM (gpt-4o cho vision, gpt-4o-mini cho text...) */
  model?: string;
  /** Nhiệt độ sinh văn bản (0–2), mặc định 0.7 */
  temperature?: number;
  /** Số token tối đa cho phản hồi */
  maxTokens?: number;
  /** Loại tính quota AI phía BE: "chat" | "plan" */
  aiFeature?: 'chat' | 'plan';
}

/** Response MegaLLM/OpenAI format */
export interface ChatResponse {
  content?: string;
  choices?: {
    message?: { role?: string; content?: string };
    finish_reason?: string;
  }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string; type?: string; code?: string };
}

/**
 * Gửi tin nhắn tới Finmate-BE. Backend proxy tới MegaLLM (OpenAI-compatible).
 * Endpoint: POST {API_BASE_URL}/api/chat
 *
 * BACKEND phải xử lý vision:
 * Khi nhận được imageBase64, backend cần build message vision cho MegaLLM:
 * {
 *   role: "user",
 *   content: [
 *     { type: "text", text: <nội dung text> },
 *     { type: "image_url", image_url: { url: "data:image/jpeg;base64,<imageBase64>", detail: "high" } }
 *   ]
 * }
 * Và dùng model hỗ trợ vision (gpt-4o).
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

    const body: Record<string, unknown> = { messages };
    if (options?.systemPrompt) body.systemPrompt = options.systemPrompt;
    if (options?.imageBase64) {
      body.imageBase64 = options.imageBase64;
      if (options?.imageFormat) body.imageFormat = options.imageFormat;
    }
    if (options?.model != null) body.model = options.model;
    if (options?.temperature != null) body.temperature = options.temperature;
    if (options?.maxTokens != null) body.max_tokens = options.maxTokens;
    body.aiFeature = options?.aiFeature ?? 'chat';

    const response = (await post(url, body)) as ChatResponse;

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

    if (response.content) return response.content;
    const content = response.choices?.[0]?.message?.content;
    if (content != null) return content;
    throw new Error('Phản hồi từ AI không hợp lệ');
  };

  return { sendMessage };
}
