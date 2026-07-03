import type { SenderKitError } from "./errors";

export type Channel = "email" | "sms" | "push" | "web-push";

/**
 * Least-privilege scopes a SenderKit API key (or MCP OAuth connection) can be
 * restricted to. A key minted without explicit scopes is *unscoped* and has
 * full access; a scoped key only authorizes the operations in its grant:
 *
 * - `read`   — list/get messages & templates, render, fetch context.
 * - `send`   — create messages (`send`/`sendRaw`) and author template drafts.
 * - `cancel` — cancel a scheduled or queued message.
 *
 * Calling an operation outside a scoped key's grant returns `403`
 * (`SenderKitPermissionError`, `code: "insufficient_scope"`).
 */
export type ApiScope = "read" | "send" | "cancel";

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

export interface Attachment {
  filename: string;
  contentType: string;
  /** Base64-encoded bytes. Provider caps total attachments at 10 MB. */
  content: string;
  inline?: boolean;
  contentId?: string;
}

export interface EmailEnvelope {
  /** Cc recipients (email only). */
  cc?: string[];
  /** Bcc recipients (email only). */
  bcc?: string[];
  /** Reply-To address (email only). */
  replyTo?: string;
  /** Inline or file attachments (email only). 10 MB total budget across all attachments. */
  attachments?: Attachment[];
}

export interface SendRequest extends EmailEnvelope {
  /** Template slug (e.g. `"welcome"`). */
  template: string;
  /** Recipient address. */
  to: string;
  /** Template variables. */
  vars?: Record<string, unknown>;
  /** Force a specific channel. Defaults to the template's primary channel. */
  channel?: Channel;
  /** Pin a specific template version. */
  version?: number;
  /** Free-form metadata attached to the message. Indexed server-side for filtering. */
  metadata?: Record<string, string | number | boolean>;
  /** Schedule delivery for a future time. ISO 8601 string or `Date`. Omit to send immediately. */
  scheduledAt?: string | Date;
  /** Idempotency key. If omitted, the SDK auto-generates one so safe retries don't duplicate sends. */
  idempotencyKey?: string;
}

export interface RawEmailContent extends EmailEnvelope {
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

export interface RawWebPushContent {
  title: string;
  body: string;
  /** Icon URL shown in the browser notification. */
  icon?: string;
  /** URL opened when the notification is clicked. */
  clickUrl?: string;
  data?: Record<string, string>;
  badge?: number;
}

interface SendRawBase {
  /** Recipient address. */
  to: string;
  /** Variables for `interpolate`. Sent as `vars` on the wire. */
  vars?: Record<string, unknown>;
  /** Free-form metadata attached to the message. */
  metadata?: Record<string, string | number | boolean>;
  /** When true, the server runs variable substitution over `content`. */
  interpolate?: boolean;
  /** Schedule delivery for a future time. ISO 8601 string or `Date`. Omit to send immediately. */
  scheduledAt?: string | Date;
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

export interface SendRawWebPushRequest extends SendRawBase {
  channel: "web-push";
  content: RawWebPushContent;
}

export type SendRawRequest =
  | SendRawEmailRequest
  | SendRawSmsRequest
  | SendRawPushRequest
  | SendRawWebPushRequest;

export interface SendResponse {
  /** Message id (e.g. `"msg_…"`). */
  id: string;
  /** Initial status. `"scheduled"` for sends with `scheduledAt` in the future; otherwise `"queued"`. */
  status: "queued" | "scheduled";
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
  | { ok: true; index: number; id: string; status: "queued" | "scheduled"; livemode: boolean }
  | { ok: false; index: number; error: SenderKitError };

export interface TemplateVersion {
  versionNumber: number;
  variables: unknown;
  publishedAt: string | null;
}

export interface Template {
  slug: string;
  channel: Channel;
  description: string | null;
  status: string;
  updatedAt: string;
  /**
   * Included by `templates.get`; absent on `templates.list`. Reads are lean —
   * the rendered version `content` blob is no longer returned (it could overflow
   * the LLM/MCP context); only metadata (`versionNumber`, `variables`,
   * `publishedAt`) is included.
   */
  currentVersion?: TemplateVersion | null;
  [key: string]: unknown;
}

/**
 * A message as returned by `messages.list` / `messages.get`. Reads are lean —
 * the rendered `content` blob is omitted (it could overflow the LLM/MCP context);
 * `vars`, `timeline`, and `metadata` are still included.
 */
export interface Message {
  /** Internal id. */
  id: string;
  /** Public-facing id (e.g. `msg_…`). */
  publicId: string;
  /**
   * Lifecycle status (one of `MESSAGE_STATUSES`). `blocked` is a terminal
   * status set when a message is stopped by automated content-safety checks.
   */
  status: string;
  channel: Channel;
  templateSlug: string | null;
  recipient: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface ListMessagesParams {
  limit?: number;
  cursor?: string;
  status?: string;
  channel?: Channel;
  template?: string;
  /** Filter by metadata attached at send time. Each key/value pair must match. */
  metadata?: Record<string, string | number | boolean>;
}

export interface ListMessagesResponse {
  data: Message[];
  nextCursor: string | null;
}

export interface CancelMessageResponse {
  /** Public message id (e.g. `msg_…`). */
  id: string;
  status: "canceled";
}

/** Result of `client.context()` — the connected workspace identity + send mode. */
export interface SenderKitContext {
  workspace: { id: string; slug: string; name: string };
  mode: "live" | "test";
}
