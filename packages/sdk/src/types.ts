import type { SenderKitError } from "./errors.js";

export type Channel = "email" | "sms" | "push";

export interface SenderKitOptions {
  /** API key. Use `sk_live_…` for production, `sk_test_…` for test mode. */
  apiKey: string;
  /** Override the API base URL. Defaults to `https://api.senderkit.com`. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 30_000. */
  timeout?: number;
  /** Max retry attempts for transient failures (network, timeout, 429, 5xx). Defaults to 2. */
  maxRetries?: number;
  /** Inject a custom `fetch` implementation (e.g. for tests or edge runtimes). */
  fetch?: typeof fetch;
}

export interface SendRequest {
  /** Template slug (e.g. `"welcome"`). */
  template: string;
  /** Recipient address. */
  to: string;
  /** Template variables. */
  data?: Record<string, unknown>;
  /** Force a specific channel. Defaults to the template's primary channel. */
  channel?: Channel;
  /** Pin a specific template version. */
  version?: number;
  /** Free-form metadata attached to the message. Indexed server-side for filtering. */
  metadata?: Record<string, string | number | boolean>;
  /** Idempotency key. If omitted, the SDK auto-generates one so safe retries don't duplicate sends. */
  idempotencyKey?: string;
}

export interface RawEmailContent {
  subject: string;
  preheader?: string;
  html: string;
  text?: string;
}

export interface RawSmsContent {
  body: string;
}

export interface RawPushContent {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
}

interface SendRawBase {
  /** Recipient address. */
  to: string;
  /** Variables for `interpolate`. Sent as `vars` on the wire. */
  data?: Record<string, unknown>;
  /** Free-form metadata attached to the message. */
  metadata?: Record<string, string | number | boolean>;
  /** When true, the server runs variable substitution over `content`. */
  interpolate?: boolean;
  /** Idempotency key. If omitted, the SDK auto-generates one. */
  idempotencyKey?: string;
}

export interface SendRawEmailRequest extends SendRawBase {
  channel: "email";
  content: RawEmailContent;
  /** Per-message From override (email only). */
  from?: string;
}

export interface SendRawSmsRequest extends SendRawBase {
  channel: "sms";
  content: RawSmsContent;
}

export interface SendRawPushRequest extends SendRawBase {
  channel: "push";
  content: RawPushContent;
}

export type SendRawRequest =
  | SendRawEmailRequest
  | SendRawSmsRequest
  | SendRawPushRequest;

export interface SendResponse {
  /** Message id (e.g. `"msg_…"`). */
  id: string;
  /** Initial status. Currently always `"queued"`. */
  status: "queued";
  /** Whether the request was processed against live mode. Derived from the API key prefix. */
  livemode: boolean;
}

export interface BatchSendOptions {
  /** Max parallel in-flight requests. Defaults to 5. */
  concurrency?: number;
  /** Base idempotency key. Each item gets `${key}-${index}`. */
  idempotencyKey?: string;
}

export type BatchSendResult =
  | { ok: true; index: number; id: string; status: "queued"; livemode: boolean }
  | { ok: false; index: number; error: SenderKitError };

export interface Template {
  slug: string;
  name: string;
  channels: Channel[];
  latestVersion?: number;
  [key: string]: unknown;
}

export interface Message {
  id: string;
  status: string;
  channel: Channel;
  template: string;
  to: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface ListMessagesParams {
  limit?: number;
  cursor?: string;
  status?: string;
  channel?: Channel;
  template?: string;
}

export interface ListMessagesResponse {
  data: Message[];
  nextCursor: string | null;
}
