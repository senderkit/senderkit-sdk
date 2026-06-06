import { SenderKitError } from "./errors";
import { HttpClient } from "./http";
import { MessagesResource } from "./resources/messages";
import { TemplatesResource } from "./resources/templates";
import type {
  BatchSendOptions,
  BatchSendResult,
  SendRawRequest,
  SendRequest,
  SendResponse,
  SenderKitContext,
  SenderKitOptions,
} from "./types";

const DEFAULT_BASE_URL = "https://api.senderkit.com";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BATCH_CONCURRENCY = 5;

export class SenderKit {
  readonly templates: TemplatesResource;
  readonly messages: MessagesResource;
  /** Mode derived from the API key prefix: `sk_test_…` → `"test"`, anything else → `"live"`. */
  readonly mode: "live" | "test";
  private readonly http: HttpClient;

  constructor(options: SenderKitOptions) {
    if (!options || typeof options !== "object") {
      throw new TypeError("SenderKit: options object is required");
    }
    if (!options.apiKey || typeof options.apiKey !== "string") {
      throw new TypeError("SenderKit: apiKey is required");
    }
    if (
      !options.apiKey.startsWith("sk_live_") &&
      !options.apiKey.startsWith("sk_test_")
    ) {
      throw new TypeError(
        "SenderKit: apiKey must start with `sk_live_` or `sk_test_`",
      );
    }

    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new TypeError(
        "SenderKit: no global fetch available. Pass `fetch` in options or use Node.js 18+.",
      );
    }

    this.mode = options.apiKey.startsWith("sk_test_") ? "test" : "live";

    this.http = new HttpClient({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      fetch: fetchImpl,
    });

    this.templates = new TemplatesResource(this.http);
    this.messages = new MessagesResource(this.http);
  }

  async send(request: SendRequest): Promise<SendResponse> {
    if (!request?.template) throw new TypeError("send: `template` is required");
    if (!request.to) throw new TypeError("send: `to` is required");

    const body: Record<string, unknown> = {
      template: request.template,
      to: request.to,
      vars: request.vars ?? {},
    };
    if (request.channel) body["channel"] = request.channel;
    if (request.version !== undefined) body["version"] = request.version;
    if (request.metadata) body["metadata"] = request.metadata;
    if (request.scheduledAt) body["scheduledAt"] = toIsoString(request.scheduledAt);
    if (request.cc) body["cc"] = request.cc;
    if (request.bcc) body["bcc"] = request.bcc;
    if (request.replyTo) body["replyTo"] = request.replyTo;
    if (request.attachments) body["attachments"] = request.attachments;

    return this.http.request<SendResponse>({
      method: "POST",
      path: "/v1/send",
      body,
      idempotencyKey: request.idempotencyKey,
      autoIdempotency: true,
    });
  }

  /** Fetch the connected workspace identity + send mode from the API. */
  async context(): Promise<SenderKitContext> {
    return this.http.request<SenderKitContext>({
      method: "GET",
      path: "/v1/context",
    });
  }

  async sendRaw(request: SendRawRequest): Promise<SendResponse> {
    if (!request?.to) throw new TypeError("sendRaw: `to` is required");
    if (!request.channel) throw new TypeError("sendRaw: `channel` is required");
    if (!request.content) throw new TypeError("sendRaw: `content` is required");

    const body: Record<string, unknown> = {
      channel: request.channel,
      to: request.to,
      content: request.content,
      vars: request.vars ?? {},
    };
    if (request.metadata) body["metadata"] = request.metadata;
    if (request.interpolate) body["interpolate"] = true;
    if (request.scheduledAt) body["scheduledAt"] = toIsoString(request.scheduledAt);
    if (request.channel === "email" && request.from) body["from"] = request.from;

    return this.http.request<SendResponse>({
      method: "POST",
      path: "/v1/send",
      body,
      idempotencyKey: request.idempotencyKey,
      autoIdempotency: true,
    });
  }

  async sendBatch(
    requests: Array<SendRequest | SendRawRequest>,
    options: BatchSendOptions = {},
  ): Promise<BatchSendResult[]> {
    if (!Array.isArray(requests)) {
      throw new TypeError("sendBatch: requests must be an array");
    }
    if (requests.length === 0) return [];

    const concurrency = Math.max(1, options.concurrency ?? DEFAULT_BATCH_CONCURRENCY);
    const results = new Array<BatchSendResult>(requests.length);
    let cursor = 0;

    const isRaw = (r: SendRequest | SendRawRequest): r is SendRawRequest =>
      "content" in r;

    const worker = async (): Promise<void> => {
      while (true) {
        const index = cursor++;
        if (index >= requests.length) return;
        const req = requests[index]!;
        const itemKey =
          req.idempotencyKey ??
          (options.idempotencyKey ? `${options.idempotencyKey}-${index}` : undefined);
        try {
          const finalReq = itemKey ? { ...req, idempotencyKey: itemKey } : req;
          const res = await (isRaw(finalReq)
            ? this.sendRaw(finalReq)
            : this.send(finalReq));
          results[index] = {
            ok: true,
            index,
            id: res.id,
            status: res.status,
            livemode: res.livemode,
          };
        } catch (err) {
          results[index] = {
            ok: false,
            index,
            error:
              err instanceof SenderKitError
                ? err
                : new SenderKitError(err instanceof Error ? err.message : "Unknown error"),
          };
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, requests.length) }, worker);
    await Promise.all(workers);
    return results;
  }
}

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}
