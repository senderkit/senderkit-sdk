import type { SenderKitError } from "./errors";

export type Channel = "email" | "sms" | "push" | "web-push";

/**
 * Least-privilege scopes a SenderKit API key (or MCP OAuth connection) can be
 * restricted to. A key minted without explicit scopes is *unscoped* and has
 * full access; a scoped key only authorizes the operations in its grant:
 *
 * - `read`    — list/get messages & templates, render, fetch context.
 * - `send`    — create messages (`send`/`sendRaw`) and author template drafts.
 * - `cancel`  — cancel a scheduled or queued message.
 * - `inbound` — manage inbound addresses and read received mail.
 *
 * Calling an operation outside a scoped key's grant returns `403`
 * (`SenderKitPermissionError`, `code: "insufficient_scope"`).
 */
export type ApiScope = "read" | "send" | "cancel" | "inbound";

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
  /**
   * Per-message From address override (email only, bare address — put the
   * display name in `fromName`). Falls back to the connection's From address.
   * On managed sending it is honored only on the workspace's verified domain.
   */
  from?: string;
  /**
   * Per-message From display name override (email only), rendered as
   * `Name <address>`. Falls back to the connection's From name. Max 128 chars;
   * no control characters or angle brackets.
   */
  fromName?: string;
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
  /**
   * Per-message From address override (email only, bare address — put the
   * display name in `fromName`). Falls back to the connection's From address.
   * On managed sending it is honored only on the workspace's verified domain.
   */
  from?: string;
  /**
   * Per-message From display name override (email only), rendered as
   * `Name <address>`. Falls back to the connection's From name. Max 128 chars;
   * no control characters or angle brackets.
   */
  fromName?: string;
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
   * Lifecycle status (one of `MESSAGE_STATUSES`). A `suppressed` message was
   * accepted but never attempted — the recipient address failed validation or
   * was already suppressed for this sender (distinct from `failed`, a real
   * bounce). A `blocked` message was halted by automated content safety checks;
   * the generic reason (when any) is recorded on the message `timeline`.
   */
  status: string;
  channel: Channel;
  templateSlug: string | null;
  recipient: string;
  /**
   * First provider-reported email open (open tracking), as an ISO 8601 string,
   * or `null` if not yet opened. Set once on the first open; later opens don't
   * update it.
   */
  openedAt: string | null;
  /**
   * First provider-reported link click, as an ISO 8601 string, or `null` if no
   * link has been clicked. Set once on the first click; later clicks don't
   * update it.
   */
  clickedAt: string | null;
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

// --------------------------------------------------------------------------- //
// Inbound — receiving addresses and received mail. Requires the `inbound` scope.
// --------------------------------------------------------------------------- //

/** An address provisioned on the workspace's shared receiving domain. */
export interface InboundAddress {
  /** Public inbound address id (e.g. `inb_…`). */
  id: string;
  /** The full receiving address, e.g. `support@acme.in.senderkit.email`. */
  address: string;
  description: string | null;
  /** Address received mail is also forwarded to, or `null`. */
  forwardTo: string | null;
  active: boolean;
  livemode: boolean;
  createdAt: string;
}

export interface CreateInboundAddressParams {
  /**
   * 1–64 chars of `a-z 0-9 . _ -`, starting and ending alphanumeric. Lowercased.
   * Omit to auto-generate an unguessable `rcv-xxxxxxxxxx` local part. Pass `"*"`
   * for a catch-all that receives mail for every local part no exact address
   * claims (an exact address always wins; the catch-all counts as one address
   * against the plan cap).
   */
  localPart?: string;
  description?: string;
  /**
   * Optional address to also forward received mail to. Cannot point at any
   * inbound address (rejected as a mail loop).
   */
  forwardTo?: string;
  /**
   * Optional webhook endpoint to bind this address to. When unset,
   * `message.received` events fan out to every endpoint subscribed to it. Must
   * be an endpoint whose mode matches this address's `livemode`.
   */
  webhookEndpointId?: string;
  /**
   * A verified custom inbound domain (its `id` from `inbound.domains.list`) to
   * mint the address on. Omit for the workspace's shared
   * `{slug}.in.senderkit.email` domain.
   */
  domainId?: string;
  /**
   * Live mode. Defaults to `true`. A test-mode address (`false`) receives real
   * mail but fans out only to test-mode webhook endpoints and doesn't count
   * against quota.
   */
  livemode?: boolean;
}

export interface DeleteInboundAddressResponse {
  deleted: true;
}

/**
 * A DNS record a custom inbound domain must publish before it can receive.
 * Surface these to the user verbatim; verification only completes once they are
 * live.
 */
export interface InboundDnsRecord {
  type: "TXT" | "MX";
  /** Host/name to create the record at. */
  name: string;
  /** Record value. */
  value: string;
  /** MX priority, when `type` is `"MX"`. */
  priority?: number;
  /** Why the record is needed (e.g. domain-ownership DKIM, receiving MX). */
  purpose: string;
}

/**
 * A custom inbound domain — a domain the workspace claimed to receive mail on
 * (e.g. `inbound.acme.com`), alongside the automatically-provisioned shared
 * `{slug}.in.senderkit.email` domain.
 */
export interface InboundDomain {
  /** Inbound domain id (UUID). */
  id: string;
  /** The domain, e.g. `inbound.acme.com`. */
  domain: string;
  /** `shared` for the managed domain, `custom` for a claimed one. */
  kind: string;
  /** Verification status, e.g. `pending` or `verified`. */
  status: string;
  /** DNS records still required to verify (empty once verified). */
  records: InboundDnsRecord[];
  verifiedAt: string | null;
  createdAt: string;
}

export interface CreateInboundDomainParams {
  /**
   * Custom domain to claim for receiving, e.g. `"inbound.acme.com"`. Must not be
   * already claimed and must not be a `senderkit.com`/`senderkit.email` suffix.
   */
  domain: string;
  /**
   * Only set `true` after the user has explicitly confirmed. Omit on the first
   * attempt: if the domain already has live MX records pointing elsewhere, the
   * call fails with a `409` (`existing_mx`) naming the current mail host(s), so
   * you can confirm before redirecting all of that domain's mail to SenderKit.
   */
  acknowledgeExistingMx?: boolean;
}

export interface DeleteInboundDomainResponse {
  deleted: true;
}

/**
 * `received` — stored and the webhook/forward pipeline ran; `dropped` — arrived
 * on a verified inbound domain but matched no address; `quota_exceeded` — the
 * workspace's inbound quota was hit (the row is stored, pipeline skipped).
 */
export type InboundMessageStatus = "received" | "dropped" | "quota_exceeded";

/** A received-message summary, as returned by `inbound.messages.list`. */
export interface InboundMessageSummary {
  /** Public inbound message id (e.g. `rcv_…`). */
  id: string;
  status: InboundMessageStatus;
  /** The envelope/header From address. */
  from: string | null;
  subject: string | null;
  /** The `+tag` segment of the addressed local part, if any. */
  plusTag: string | null;
  sizeBytes: number;
  receivedAt: string;
}

export interface InboundAddressPair {
  email: string;
  name: string | null;
}

export interface InboundAttachment {
  /** Zero-based index; matches the attachment endpoint's path segment. */
  index: number;
  filename: string | null;
  contentType: string;
  size: number;
  /**
   * Authenticated API URL. Fetch it with an `Authorization: Bearer` header
   * carrying an API key with the `inbound` scope — not a public/signed link.
   */
  url: string;
}

/** A received message, as returned by `inbound.messages.get`. */
export interface InboundMessage {
  /** Public inbound message id (e.g. `rcv_…`). */
  id: string;
  status: InboundMessageStatus;
  channel: Channel;
  /** Canonical receiving address, or `null` for catch-all/unmatched mail. */
  address: string | null;
  plusTag: string | null;
  from: { email: string | null; name: string | null };
  to: InboundAddressPair[];
  cc: InboundAddressPair[];
  envelope: { from: string | null; to: string[] };
  subject: string | null;
  /** The mail's `Message-ID` header. */
  messageId: string | null;
  inReplyTo: string | null;
  text: string | null;
  html: string | null;
  /** The plain-text reply with quoted history/signature stripped. */
  strippedReply: string | null;
  /** Whether the stored body was truncated. */
  truncated: boolean;
  headers: Record<string, string>;
  attachments: InboundAttachment[];
  /** SES scanning verdicts (e.g. spam/virus/SPF/DKIM), as reported. */
  verdicts: Record<string, string>;
  sizeBytes: number;
  /** Authenticated API URL for the raw RFC 822 source. */
  rawUrl: string;
  receivedAt: string;
  [key: string]: unknown;
}

export interface ListInboundMessagesParams {
  /** Page size (1–100). Defaults to 50. */
  limit?: number;
  /**
   * Only return messages received before this time. ISO 8601 string or `Date`.
   * Combine with the last item's `receivedAt` to page backwards.
   */
  before?: string | Date;
  /** Filter to messages received on this address's public id. */
  address?: string;
}
