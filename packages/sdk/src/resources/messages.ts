import type { HttpClient } from "../http";
import type { ListMessagesParams, ListMessagesResponse, Message } from "../types";

interface RawListResponse {
  data: Message[];
  next_cursor?: string | null;
  nextCursor?: string | null;
}

export class MessagesResource {
  constructor(private readonly http: HttpClient) {}

  async list(params: ListMessagesParams = {}): Promise<ListMessagesResponse> {
    const query: Record<string, string | number | undefined> = {
      limit: params.limit,
      cursor: params.cursor,
      status: params.status,
      channel: params.channel,
      template: params.template,
    };
    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        query[`metadata[${key}]`] = String(value);
      }
    }
    const res = await this.http.request<RawListResponse>({
      method: "GET",
      path: "/v1/messages",
      query,
    });
    return {
      data: res.data,
      nextCursor: res.nextCursor ?? res.next_cursor ?? null,
    };
  }

  async get(id: string): Promise<Message> {
    if (!id) throw new TypeError("messages.get(id): id is required");
    return this.http.request<Message>({
      method: "GET",
      path: `/v1/messages/${encodeURIComponent(id)}`,
    });
  }
}
