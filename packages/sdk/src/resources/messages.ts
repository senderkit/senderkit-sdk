import type { HttpClient } from "../http.js";
import type { ListMessagesParams, ListMessagesResponse, Message } from "../types.js";

interface RawListResponse {
  data: Message[];
  next_cursor?: string | null;
  nextCursor?: string | null;
}

export class MessagesResource {
  constructor(private readonly http: HttpClient) {}

  async list(params: ListMessagesParams = {}): Promise<ListMessagesResponse> {
    const res = await this.http.request<RawListResponse>({
      method: "GET",
      path: "/api/v1/messages",
      query: {
        limit: params.limit,
        cursor: params.cursor,
        status: params.status,
        channel: params.channel,
        template: params.template,
      },
    });
    return {
      data: res.data,
      nextCursor: res.nextCursor ?? res.next_cursor ?? null,
    };
  }
}
