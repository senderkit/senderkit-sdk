import {
  SenderKitApiError,
  SenderKitAuthenticationError,
  SenderKitNetworkError,
  SenderKitRateLimitError,
  SenderKitTimeoutError,
  SenderKitValidationError,
  type ApiErrorBody,
} from "./errors";
import { VERSION } from "./version";

export interface HttpClientConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  fetch: typeof fetch;
}

export interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  idempotencyKey?: string;
  /** When true and no idempotencyKey supplied, the client generates one so retries are safe. */
  autoIdempotency?: boolean;
}

const RETRY_BASE_MS = 250;
const RETRY_CAP_MS = 5_000;

export class HttpClient {
  constructor(private readonly config: HttpClientConfig) {}

  async request<T>(options: RequestOptions): Promise<T> {
    const url = this.buildUrl(options.path, options.query);
    const headers = this.buildHeaders(options);
    const init: RequestInit = {
      method: options.method,
      headers,
    };
    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }

    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.config.maxRetries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeout);

      try {
        const response = await this.config.fetch(url, { ...init, signal: controller.signal });
        clearTimeout(timer);

        if (response.ok) {
          return (await this.parseJson<T>(response)) as T;
        }

        const error = await this.toApiError(response);
        const retryable = isRetryableStatus(response.status);
        if (retryable && attempt < this.config.maxRetries) {
          const wait = computeBackoff(attempt, retryAfterMs(response.headers));
          attempt++;
          await sleep(wait);
          continue;
        }
        throw error;
      } catch (err) {
        clearTimeout(timer);

        if (isAbortError(err)) {
          lastError = new SenderKitTimeoutError(
            `Request to ${options.path} timed out after ${this.config.timeout}ms`,
          );
        } else if (err instanceof SenderKitApiError) {
          throw err;
        } else if (err instanceof SenderKitTimeoutError) {
          lastError = err;
        } else {
          lastError = new SenderKitNetworkError(
            err instanceof Error ? err.message : "Network error",
            { cause: err },
          );
        }

        if (attempt < this.config.maxRetries) {
          const wait = computeBackoff(attempt);
          attempt++;
          await sleep(wait);
          continue;
        }
        throw lastError;
      }
    }

    throw lastError ?? new SenderKitNetworkError("Request failed");
  }

  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const base = this.config.baseUrl.replace(/\/+$/, "");
    const suffix = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${base}${suffix}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private buildHeaders(options: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": `senderkit-node/${VERSION}`,
    };
    const idempotencyKey =
      options.idempotencyKey ?? (options.autoIdempotency ? generateIdempotencyKey() : undefined);
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return headers;
  }

  private async parseJson<T>(response: Response): Promise<T | undefined> {
    if (response.status === 204) return undefined;
    const text = await response.text();
    if (!text) return undefined;
    return JSON.parse(text) as T;
  }

  private async toApiError(response: Response): Promise<SenderKitApiError> {
    let body: { error?: ApiErrorBody } | undefined;
    try {
      const text = await response.text();
      body = text ? (JSON.parse(text) as { error?: ApiErrorBody }) : undefined;
    } catch {
      body = undefined;
    }
    const err = body?.error ?? {};
    const message = err.message ?? `Request failed with status ${response.status}`;
    const code = err.code;
    const issues = err.issues;
    const requestId = response.headers.get("x-request-id") ?? undefined;
    const args = { status: response.status, message, code, issues, requestId };

    if (response.status === 401 || response.status === 403) {
      return new SenderKitAuthenticationError(args);
    }
    if (response.status === 400 || response.status === 422) {
      return new SenderKitValidationError(args);
    }
    if (response.status === 429) {
      return new SenderKitRateLimitError({
        ...args,
        retryAfter: retryAfterMs(response.headers),
      });
    }
    return new SenderKitApiError(args);
  }
}

function isRetryableStatus(status: number): boolean {
  if (status === 429) return true;
  if (status >= 500 && status !== 501) return true;
  return false;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}

function retryAfterMs(headers: Headers): number | undefined {
  const raw = headers.get("retry-after");
  if (!raw) return undefined;
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber)) return Math.max(0, asNumber * 1000);
  const date = Date.parse(raw);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return undefined;
}

function computeBackoff(attempt: number, overrideMs?: number): number {
  if (overrideMs !== undefined) return Math.min(overrideMs, RETRY_CAP_MS);
  const exp = Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_CAP_MS);
  return Math.floor(Math.random() * exp);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateIdempotencyKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Unreachable on Node >=18 (engines field). Secure fallback for exotic runtimes.
  const bytes = new Uint8Array(16);
  (globalThis as { crypto: { getRandomValues(a: Uint8Array): void } }).crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return [...bytes]
    .map((b, i) => ([4, 6, 8, 10].includes(i) ? "-" : "") + b.toString(16).padStart(2, "0"))
    .join("");
}
