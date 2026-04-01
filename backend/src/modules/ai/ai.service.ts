import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { CreateTaskDto } from '../tasks/dto/create-task.dto';

@Injectable()
export class AiService {
  private providerErrorMessage: string | null = null;
  private geminiDiscoveredModels: string[] | null = null;

  constructor(private readonly configService: ConfigService) {}

  async summarize(messages: string[]) {
    const joined = messages.slice(-20).join('\n');
    const prompt = `Tom tat ngan gon cuoc hoi thoai sau thanh cac y chinh:\n${joined}`;
    const generated = await this.generateText(prompt);
    if (generated) {
      return { summary: generated, model: this.currentProviderLabel() };
    }
    const top = messages.slice(-10);
    return {
      summary: top.join(' ').slice(0, 400),
      model: 'mock-ai',
    };
  }

  async suggestReply(message: string) {
    const prompt = `Ban la tro ly hoc tap lap trinh. Nguoi dung dat cau hoi: "${message}".
Hay tra loi bang tieng Viet de GIUP HOC THAT, khong tra loi xa giao.
Yeu cau:
- Giai thich de hieu cho nguoi moi bat dau.
- Dua ra cac buoc hoc cu the (bullet points).
- Co it nhat 1 vi du code ngan neu phu hop.
- Goi y bai tap tu luyen trong 1-2 muc.
- Do dai vua phai, ro rang, thuc dung.
`;
    const generated = await this.generateText(prompt);
    if (generated) {
      return { suggestion: generated, model: this.currentProviderLabel() };
    }
    const provider = this.currentProviderLabel();
    if (provider !== 'mock' && this.providerErrorMessage) {
      return {
        suggestion:
          `AI provider "${provider}" đang lỗi nên chưa trả lời trực tiếp được.\n` +
          `Lý do: ${this.providerErrorMessage}\n\n` +
          `Kiểm tra lại API key/quota/model rồi thử lại.`,
        model: `${provider}-fallback`,
      };
    }
    return {
      suggestion: this.mockAssistantReply(message),
      model: 'mock-ai',
    };
  }

  async generateTaskFromChat(content: string): Promise<CreateTaskDto> {
    const prompt = `Tu noi dung chat sau, tao title task ngan gon (toi da 120 ky tu) va description chi tiet.
Tra ve dung dinh dang:
TITLE: ...
DESCRIPTION: ...

Noi dung:
${content}`;
    const generated = await this.generateText(prompt);
    if (generated) {
      const parsed = this.parseTaskGenerated(generated);
      if (parsed) {
        return parsed;
      }
    }

    const title =
      content
        .split('.')
        .find((s) => s.trim().length > 0)
        ?.trim() ?? 'Follow up task';
    return {
      title: title.slice(0, 120),
      description: `Generated from chat:\n${content.slice(0, 2000)}`,
    };
  }

  private async generateText(prompt: string): Promise<string | null> {
    this.providerErrorMessage = null;
    const provider = this.configService.get<string>('AI_PROVIDER', 'mock');
    try {
      if (provider === 'openai') {
        const key = this.configService.get<string>('OPENAI_API_KEY');
        if (!key) {
          return null;
        }
        const model = this.configService.get<string>(
          'OPENAI_MODEL',
          'gpt-4o-mini',
        );
        const client = new OpenAI({ apiKey: key });
        const response = await client.responses.create({
          model,
          input: prompt,
        });
        const text = response.output_text?.trim();
        return text || null;
      }

      if (provider === 'gemini') {
        const key = this.configService.get<string>('GEMINI_API_KEY');
        if (!key) {
          return null;
        }
        return this.generateWithGeminiHttp(prompt, key);
      }
    } catch (error) {
      // Provider errors (invalid key/quota/model/network) should not break API responses.
      this.providerErrorMessage = this.extractProviderError(error);
      return null;
    }

    return null;
  }

  private parseTaskGenerated(content: string): CreateTaskDto | null {
    const lines = content.split('\n').map((line) => line.trim());
    const titleLine = lines.find((line) =>
      line.toUpperCase().startsWith('TITLE:'),
    );
    const descIndex = lines.findIndex((line) =>
      line.toUpperCase().startsWith('DESCRIPTION:'),
    );
    if (!titleLine || descIndex < 0) {
      return null;
    }

    const title = titleLine.slice(titleLine.indexOf(':') + 1).trim();
    const description = lines
      .slice(descIndex)
      .join('\n')
      .slice(lines[descIndex].indexOf(':') + 1)
      .trim();
    if (!title) {
      return null;
    }
    return {
      title: title.slice(0, 120),
      description: description.slice(0, 4000) || undefined,
    };
  }

  private currentProviderLabel(): string {
    return this.configService.get<string>('AI_PROVIDER', 'mock');
  }

  private mockAssistantReply(message: string): string {
    const lower = message.toLowerCase();

    if (lower.includes('thời tiết') || lower.includes('weather')) {
      return (
        `Mình đang ở chế độ mock nên không truy cập dữ liệu thời tiết realtime.\n\n` +
        `Để xem thời tiết chính xác hôm nay, bạn có thể mở app thời tiết hoặc Google với từ khóa:\n` +
        `- "thời tiết hôm nay <tên thành phố>"\n\n` +
        `Nếu muốn, mình có thể giúp bạn viết API thời tiết thật (OpenWeather) để tích hợp trực tiếp vào dự án.`
      );
    }

    if (lower.includes('nextjs')) {
      return (
        `Lộ trình học Next.js cơ bản (7 ngày):\n` +
        `1) Ngày 1: nắm React fundamentals (state, props, useEffect).\n` +
        `2) Ngày 2: App Router, folder routing, layout.\n` +
        `3) Ngày 3: Fetch dữ liệu + loading/error UI.\n` +
        `4) Ngày 4: Form + validation + gọi API backend.\n` +
        `5) Ngày 5: Auth (JWT, protected route).\n` +
        `6) Ngày 6: Tối ưu UI, component tách nhỏ, tái sử dụng.\n` +
        `7) Ngày 7: Build mini project CRUD hoàn chỉnh.\n\n` +
        `Bài tập ngay bây giờ: tạo trang /posts gọi API và hiển thị loading + error + empty state.`
      );
    }

    return (
      `Mình đang ở chế độ mock-ai nhưng vẫn có thể gợi ý cho bạn theo hướng thực hành.\n\n` +
      `Câu hỏi của bạn: "${message.slice(0, 180)}"\n\n` +
      `Gợi ý hành động:\n` +
      `- Chia mục tiêu thành 2-3 bước nhỏ.\n` +
      `- Làm 1 bản chạy được trước, rồi mới tối ưu.\n` +
      `- Nếu bạn gửi thêm bối cảnh (đang kẹt ở file nào, lỗi gì), mình sẽ trả lời cụ thể hơn.`
    );
  }

  private extractProviderError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown provider error';
  }

  private async generateWithGeminiHttp(
    prompt: string,
    apiKey: string,
  ): Promise<string | null> {
    const preferredModel =
      this.configService.get<string>('GEMINI_MODEL', 'gemini-2.0-flash') ||
      'gemini-2.0-flash';
    const staticCandidates = [
      preferredModel,
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
    ];
    const discovered = this.geminiDiscoveredModels ?? [];
    const candidates = [...staticCandidates, ...discovered].filter(
      (value, index, arr) => Boolean(value) && arr.indexOf(value) === index,
    );

    let lastError = 'Unknown Gemini error';
    let sawNotFound = false;

    for (const model of candidates) {
      const result = await this.callGeminiModel(model, prompt, apiKey);
      if (result.ok) {
        return result.text;
      }
      if (result.notFound) {
        sawNotFound = true;
        continue;
      }
      lastError = result.error;
    }

    if (sawNotFound) {
      const discoveredModels = await this.discoverGeminiModels(apiKey);
      if (discoveredModels.length > 0) {
        this.geminiDiscoveredModels = discoveredModels;
        for (const model of discoveredModels) {
          const result = await this.callGeminiModel(model, prompt, apiKey);
          if (result.ok) {
            return result.text;
          }
          if (!result.notFound) {
            lastError = result.error;
          }
        }
      }
    }

    throw new Error(lastError);
  }

  private async callGeminiModel(
    model: string,
    prompt: string,
    apiKey: string,
  ): Promise<
    { ok: true; text: string } | { ok: false; notFound: boolean; error: string }
  > {
    const normalizedModel = model.replace(/^models\//, '');
    const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(
      normalizedModel,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const raw = await response.text();
    let data: unknown = null;
    try {
      data = JSON.parse(raw) as unknown;
    } catch {
      data = null;
    }

    type GeminiErrorPayload = { error?: { message?: string } };
    type GeminiSuccessPayload = {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const errorPayload =
      data && typeof data === 'object' ? (data as GeminiErrorPayload) : null;
    const successPayload =
      data && typeof data === 'object' ? (data as GeminiSuccessPayload) : null;

    if (!response.ok) {
      const message =
        errorPayload?.error?.message ||
        `Gemini HTTP ${response.status}: ${response.statusText || 'Request failed'}`;
      return { ok: false, notFound: response.status === 404, error: message };
    }

    const text =
      successPayload?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part?.text || '')
        .join('')
        .trim() ?? '';
    if (!text) {
      return { ok: false, notFound: false, error: 'Gemini trả về rỗng.' };
    }
    return { ok: true, text };
  }

  private async discoverGeminiModels(apiKey: string): Promise<string[]> {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(
      apiKey,
    )}`;
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    };
    return (data.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => (m.name || '').replace(/^models\//, ''))
      .filter(Boolean);
  }
}
