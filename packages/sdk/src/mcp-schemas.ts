/**
 * Shared Zod input shapes for the SenderKit MCP tool surface.
 *
 * Imported by both the CLI-bundled stdio server (`@senderkit/cli`) and the
 * app-hosted HTTP server (`senderkit-app`) so the two stay in lockstep. Each
 * export is a {@link z.ZodRawShape} — a plain object of Zod fields — so it can
 * be passed directly as `inputSchema` to the MCP SDK or wrapped with
 * `z.object(shape)` when a parser is needed.
 *
 * Tool implementations stay in each package: the CLI dispatches to the public
 * `@senderkit/sdk` client; the app calls internal services directly. Only the
 * input contracts are shared.
 */
import { z } from "zod";

/**
 * Accept either an object (MCP) or a JSON string (CLI). Invalid JSON is left
 * untouched so the downstream record check produces a clear "expected object"
 * error instead of a confusing JSON parse error.
 */
function jsonOrPassthrough(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Accept either a real array (MCP) or a string (CLI) for list-valued flags. A
 * JSON-array string is parsed; any other string is split on commas (so
 * `--cc a@x.com,b@y.com` works). Non-string, non-array values pass through for
 * the downstream `z.array` to reject with a clear error.
 */
function csvOrJsonArray(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

const channel = z.enum(["email", "sms", "push", "web-push"]);

const vars = z
  .preprocess(jsonOrPassthrough, z.record(z.string(), z.unknown()))
  .describe("Template variables as a JSON object.")
  .optional();

const metadata = z
  .preprocess(
    jsonOrPassthrough,
    z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  )
  .describe("Free-form metadata as a JSON object of scalar values.")
  .optional();

const pushData = z
  .preprocess(jsonOrPassthrough, z.record(z.string(), z.string()))
  .optional();

/** Strings ("true"/"false") coerce to booleans for CLI flags; real bools pass through. */
const cliBoolean = z
  .preprocess((v) => {
    if (typeof v === "string") {
      if (v === "true") return true;
      if (v === "false") return false;
    }
    return v;
  }, z.boolean())
  .optional();

/** Coerce numeric strings (CLI args) to numbers; real numbers pass through. */
const positiveInt = z.coerce.number().int().positive().optional();
const nonNegativeInt = z.coerce.number().int().nonnegative().optional();

const scheduledAt = z
  .string()
  .datetime({ offset: true })
  .describe(
    "ISO 8601 timestamp for scheduled delivery (e.g. 2026-06-01T09:00:00Z). " +
      "Must be in the future and at most 30 days ahead — check the current date " +
      "before computing it. Omit to send immediately.",
  )
  .optional();

const idempotencyKey = z
  .string()
  .describe("Idempotency key. Repeat values return the original send instead of duplicating.")
  .optional();

const attachment = z.object({
  filename: z.string(),
  contentType: z.string(),
  content: z.string().describe("Base64-encoded attachment bytes."),
  inline: z.boolean().optional(),
  contentId: z.string().optional(),
});

/**
 * Per-send From overrides, identical on templated and raw email sends. `from`
 * is a bare address; the display name goes in `fromName`, never inline. Both
 * are email-only and fall back to the provider connection's configured values.
 */
const fromOverride = z
  .string()
  .optional()
  .describe(
    "Email-only. Optional From address override (bare address — put the display " +
      "name in fromName). Defaults to the connection's From address.",
  );

const fromName = z
  .string()
  .max(128)
  .optional()
  .describe(
    "Email-only. Optional From display name, rendered as `Name <address>`. " +
      "Max 128 chars; no control characters or angle brackets.",
  );

const emailEnvelope = {
  cc: z
    .preprocess(csvOrJsonArray, z.array(z.string()).max(50))
    .optional()
    .describe("Email-only. Cc recipients as a JSON array of addresses (max 50)."),
  bcc: z
    .preprocess(csvOrJsonArray, z.array(z.string()).max(50))
    .optional()
    .describe("Email-only. Bcc recipients as a JSON array of addresses (max 50)."),
  replyTo: z.string().optional().describe("Email-only. Reply-To address."),
  attachments: z
    .preprocess(jsonOrPassthrough, z.array(attachment))
    .optional()
    .describe("Email-only. JSON array; up to 10 MB total across all attachments."),
};

/**
 * The message lifecycle statuses (mirrors the app's `messageStatusEnum`).
 * Bounces normalize to `failed` with the reason on the message timeline.
 * `suppressed` means the provider accepted the request but never attempted
 * delivery — the recipient address failed validation, or was already suppressed
 * for this sender; it is distinct from `failed`, which is a bounce reported by
 * the receiving mail server. `blocked` is a terminal state set when a send is
 * halted by automated content safety checks; the generic reason (when any) is
 * recorded on the message timeline.
 */
export const MESSAGE_STATUSES = [
  "scheduled",
  "queued",
  "rendered",
  "dispatched",
  "sent",
  "delivered",
  "failed",
  "opted_out",
  "suppressed",
  "blocked",
  "canceled",
] as const;

/** Shape for `senderkit_send` — templated send. */
export const sendInput = {
  template: z
    .string()
    .describe('Template slug (lowercase), e.g. "welcome".'),
  to: z
    .string()
    .describe(
      "Recipient address for the template's channel: an email address, an " +
        "E.164 phone number (sms), a device token (push), or the JSON-encoded " +
        "browser PushSubscription (web-push).",
    ),
  vars,
  channel: channel.optional().describe("Force a channel (defaults to the template's primary)."),
  version: positiveInt.describe("Pin a specific template version."),
  metadata,
  scheduledAt,
  idempotencyKey,
  from: fromOverride,
  fromName,
  ...emailEnvelope,
};

/** Shape for `senderkit_send_raw` — inline content send. */
export const sendRawInput = {
  channel: channel.describe("Channel: email, sms, push, or web-push."),
  to: z
    .string()
    .describe(
      "Recipient address for the chosen channel: an email address (email), an " +
        "E.164 phone number such as +15551234567 (sms), a device token (push), or " +
        "the JSON-encoded browser PushSubscription — endpoint + keys — (web-push).",
    ),
  // email
  subject: z
    .string()
    .optional()
    .describe('Email subject. Required when channel is "email".'),
  preheader: z.string().optional().describe("Email preheader (email)."),
  html: z
    .string()
    .optional()
    .describe(
      'Email HTML body. Required when channel is "email" — a text-only email ' +
        "send is rejected; wrap plain text in minimal HTML instead.",
    ),
  text: z.string().optional().describe("Email plain-text body (email)."),
  from: fromOverride,
  fromName,
  // sms + push + web-push
  body: z.string().optional().describe("Message body (sms, push, web-push)."),
  // push + web-push
  title: z.string().optional().describe("Notification title (push, web-push)."),
  badge: nonNegativeInt.describe("Badge count (push, web-push)."),
  sound: z.string().optional().describe("Notification sound (push)."),
  pushData: pushData.describe("Data payload as a JSON object of strings (push, web-push)."),
  // web-push
  icon: z.string().optional().describe("Icon URL shown in the notification (web-push)."),
  clickUrl: z.string().optional().describe("URL opened when the notification is clicked (web-push)."),
  // shared
  vars,
  metadata,
  interpolate: cliBoolean.describe("Run server-side variable substitution over content."),
  scheduledAt,
  idempotencyKey,
  ...emailEnvelope,
};

/** Shape for `senderkit_templates_list`. No inputs. */
export const templatesListInput = {};

/** Shape for `senderkit_templates_get`. */
export const templatesGetInput = {
  slug: z
    .string()
    .describe("Template slug (lowercase; slugs are canonicalized on creation)."),
};

/** Shape for `senderkit_messages_list`. */
export const messagesListInput = {
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe("Max messages to return, 1-200 (default 50)."),
  cursor: z.string().optional().describe("Pagination cursor."),
  status: z
    .enum(MESSAGE_STATUSES)
    .optional()
    .describe(
      "Filter by lifecycle status: scheduled, queued, rendered, dispatched, " +
        "sent, delivered, failed, opted_out, suppressed, blocked, or canceled.",
    ),
  channel: channel.optional().describe("Filter by channel."),
  template: z.string().optional().describe("Filter by template slug."),
  metadata: metadata.describe("Filter by metadata (each key/value must match)."),
};

/** Shape for `senderkit_messages_get`. */
export const messagesGetInput = {
  id: z.string().describe('Public message id (e.g. "msg_…").'),
};

/** Shape for `senderkit_cancel_message`. */
export const cancelMessageInput = {
  id: z.string().describe('Public message id (e.g. "msg_…") to cancel.'),
};

/** Shape for `senderkit_context`. No inputs. */
export const contextInput = {};

// --------------------------------------------------------------------------- //
// Inbound — receiving addresses and received mail (`inbound` scope).
// --------------------------------------------------------------------------- //

/** Shape for `senderkit_inbound_addresses_list`. No inputs. */
export const inboundAddressesListInput = {};

/** Shape for `senderkit_inbound_addresses_create`. */
export const inboundAddressesCreateInput = {
  localPart: z
    .string()
    .min(1)
    .max(64)
    .optional()
    .describe(
      'Local part before the @, e.g. "invoices" for ' +
        "invoices@{slug}.in.senderkit.email — 1-64 chars of a-z, 0-9, dot, " +
        "underscore, dash, starting and ending alphanumeric (lowercased; " +
        'some names are reserved). Pass "*" for a catch-all that receives ' +
        "mail for every local part no exact address claims. Omit to mint an " +
        "unguessable random one.",
    ),
  description: z
    .string()
    .max(200)
    .optional()
    .describe("Optional internal note describing what this address is for."),
  forwardTo: z
    .string()
    .max(320)
    .optional()
    .describe(
      "Email address to forward received mail to. Must be a plausible address " +
        "and cannot be another inbound address (would create a mail loop).",
    ),
  webhookEndpointId: z
    .string()
    .uuid()
    .optional()
    .describe(
      "This workspace's webhook endpoint id to fire message.received events " +
        "to on receipt — a bound endpoint receives them even if not " +
        "subscribed, but must be active and match this address's livemode " +
        "(test-mode addresses bind test-mode endpoints). When unset, events " +
        "fan out to every active endpoint subscribed to message.received in " +
        "the address's mode.",
    ),
  domainId: z
    .string()
    .uuid()
    .optional()
    .describe(
      "Which verified inbound domain to mint on (from " +
        "senderkit_inbound_domains_list). Omit for the workspace's shared " +
        "{slug}.in.senderkit.email domain.",
    ),
  livemode: z
    .boolean()
    .optional()
    .describe(
      "Live mode (default true). Test-mode addresses receive real mail but " +
        "fan out only to test-mode webhook endpoints, and their forwards are " +
        "recorded as test sends without real delivery. Every address, test " +
        "or live, counts toward the plan's inbound-address limit.",
    ),
};

/** Shape for `senderkit_inbound_addresses_delete`. */
export const inboundAddressesDeleteInput = {
  id: z.string().describe('Inbound address publicId (e.g. "inb_…") to delete.'),
};

/** Shape for `senderkit_inbound_domains_list`. No inputs. */
export const inboundDomainsListInput = {};

/** Shape for `senderkit_inbound_domains_create`. */
export const inboundDomainsCreateInput = {
  domain: z
    .string()
    .describe(
      'Custom domain to claim for receiving, e.g. "inbound.acme.com". Must ' +
        "not already be claimed (by this or another workspace) and must not " +
        "be a senderkit.com/senderkit.email suffix.",
    ),
  acknowledgeExistingMx: z
    .boolean()
    .optional()
    .describe(
      "Only pass true after the user has explicitly confirmed they want to " +
        "redirect this domain's mail to SenderKit. Omit on the first attempt — " +
        "if the domain already has live MX records, the call fails with an " +
        "existing_mx error naming the current host(s) so you can get that " +
        "confirmation first.",
    ),
};

/** Shape for `senderkit_inbound_domains_delete`. */
export const inboundDomainsDeleteInput = {
  id: z.string().describe("Inbound domain id (UUID) to delete."),
};

/** Shape for `senderkit_inbound_messages_list`. */
export const inboundMessagesListInput = {
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Max messages to return, 1-100 (default 50)."),
  before: z
    .string()
    .datetime({
      offset: true,
      message: "must be an ISO 8601 timestamp (e.g. 2026-07-31T12:00:00Z)",
    })
    .optional()
    .describe(
      "ISO 8601 cursor — only return messages received strictly before this instant.",
    ),
  address: z
    .string()
    .optional()
    .describe('Inbound address publicId (e.g. "inb_…") to filter by.'),
};

/** Shape for `senderkit_inbound_messages_get`. */
export const inboundMessagesGetInput = {
  id: z.string().describe('Inbound message publicId (e.g. "rcv_…").'),
};

/**
 * Description-suffix appended to `senderkit_send` and `senderkit_send_raw`
 * so callers know the request will dispatch a real message and the mode
 * depends on the API key prefix. Kept here so both servers stay in sync.
 *
 * This wording is specific to the API-key transport (the CLI-bundled stdio /
 * HTTP server). The app-hosted server also accepts OAuth connections, where the
 * mode comes from consent rather than a key prefix, so it supplies its own note.
 * Both surface the live/test mode via the `senderkit_context` tool and the
 * `mode` field on send results.
 */
export const SEND_TOOL_LIVE_MODE_NOTE =
  " Dispatches a real message; live vs test mode is determined by the API key prefix" +
  " (sk_live_ / sk_test_). Call senderkit_context first if you need to confirm the active mode.";

// --------------------------------------------------------------------------- //
// Output shapes — the structured result each tool returns.
//
// Per the MCP spec (2025-06-18) a tool that declares `outputSchema` MUST return
// `structuredContent` conforming to it, so these describe exactly what the
// hosted server (mcp.senderkit.com) puts in `structuredContent` — the same
// object it serializes into the text `content` for older clients. They mirror
// the v1 REST responses the tools wrap, minus internal identifiers (database
// row ids, workspace ids, provider-connection ids) that a caller never needs.
// Like the input shapes, each is a ZodRawShape so it can be passed straight to
// the MCP SDK's `registerTool` or wrapped with `z.object(shape)` to validate.
// --------------------------------------------------------------------------- //

/**
 * ISO 8601 timestamp (`2026-06-01T09:00:00.000Z`). Plain string at runtime so a
 * timestamp can never fail validation on the server; `format: date-time` in
 * the emitted JSON Schema tells clients what it is.
 */
const isoTimestamp = z.string().meta({ format: "date-time" });

const sendMode = z
  .enum(["live", "test"])
  .describe(
    "The connection's send mode: live messages are really delivered; test " +
      "messages are recorded but not delivered.",
  );

/** Template lifecycle states (mirrors the app's `templateStatusEnum`). */
export const TEMPLATE_STATUSES = ["active", "draft", "archived"] as const;

/** Received-message states (mirrors the app's `inboundMessageStatusEnum`). */
export const INBOUND_MESSAGE_STATUSES = ["received", "dropped", "quota_exceeded"] as const;

/** Inbound domain kinds / verification states (mirror the app's enums). */
export const INBOUND_DOMAIN_KINDS = ["shared", "custom"] as const;
export const INBOUND_DOMAIN_STATUSES = ["pending", "verified", "failed"] as const;

/** Shape of the `senderkit_context` result. */
export const contextOutput = {
  workspace: z.object({
    id: z.string().describe("Workspace id."),
    slug: z.string().describe("Workspace slug (also the shared inbound domain prefix)."),
    name: z.string().describe("Workspace display name."),
  }),
  mode: sendMode,
};

/** Shape of the `senderkit_send` / `senderkit_send_raw` result. */
export const sendOutput = {
  id: z
    .string()
    .describe(
      'Public message id (e.g. "msg_…"). Pass it to senderkit_messages_get to ' +
        "track delivery, or to senderkit_cancel_message while it is still pending.",
    ),
  status: z
    .enum(["queued", "scheduled"])
    .describe('"scheduled" when scheduledAt was in the future; otherwise "queued".'),
  livemode: z.boolean().describe("Whether the message was created in live mode."),
  mode: sendMode,
};

/** `senderkit_send_raw` returns the same shape as `senderkit_send`. */
export const sendRawOutput = sendOutput;

const templateSummary = {
  slug: z.string().describe("Template slug — pass to senderkit_send / senderkit_templates_get."),
  channel: channel.describe("The template's primary channel."),
  description: z.string().nullable().describe("Internal note, or null."),
  status: z
    .enum(TEMPLATE_STATUSES)
    .describe(
      "active = has a published version; draft = never published (sendable in " +
        "test mode only); archived = retired.",
    ),
  updatedAt: isoTimestamp.describe("When the template was last changed."),
};

/** Shape of the `senderkit_templates_list` result. */
export const templatesListOutput = {
  data: z.array(z.object(templateSummary)).describe("Every template in the workspace."),
};

/** Shape of the `senderkit_templates_get` result. */
export const templatesGetOutput = {
  ...templateSummary,
  currentVersion: z
    .object({
      versionNumber: z.number().int().describe("Version number (1-based)."),
      variables: z
        .array(z.unknown())
        .describe(
          "Declared template variables — objects with name, type (string | " +
            "array | object | boolean) and optional description, required, " +
            "example, itemShape. Fill these in `vars` when sending.",
        ),
      publishedAt: isoTimestamp
        .nullable()
        .describe("When this version was published, or null for an unpublished draft."),
    })
    .nullable()
    .describe(
      "The current version's metadata (rendered content is omitted to keep " +
        "results small), or null when the template has no version yet.",
    ),
};

const timelineEntry = z
  .object({
    t: isoTimestamp.describe("When the event happened."),
    e: z.string().describe("Event name (e.g. queued, dispatched, sent, delivered, failed)."),
    meta: z.unknown().optional().describe("Event-specific detail, when any."),
  })
  .describe("One lifecycle event.");

/** One message as returned by `senderkit_messages_list` / `senderkit_messages_get`. */
const messageRecord = {
  publicId: z
    .string()
    .describe(
      'Public message id (e.g. "msg_…") — the id senderkit_messages_get and ' +
        "senderkit_cancel_message take.",
    ),
  templateSlug: z
    .string()
    .nullable()
    .describe("Template the message was sent from, or null for a raw send."),
  channel: channel.describe("Delivery channel."),
  status: z
    .enum(MESSAGE_STATUSES)
    .describe(
      "Lifecycle status. failed = bounce or provider error (see error/timeline); " +
        "suppressed = never attempted (address invalid or already suppressed); " +
        "blocked = halted by automated content safety checks.",
    ),
  livemode: z.boolean().describe("Whether the message was created in live mode."),
  recipient: z.string().describe("Recipient address / number / token as supplied."),
  vars: z
    .record(z.string(), z.unknown())
    .describe("Template variables supplied at send time."),
  metadata: z
    .record(z.string(), z.unknown())
    .describe("Caller-supplied metadata (scalar values) attached at send time."),
  fromOverride: z
    .string()
    .nullable()
    .describe("Per-message From address override (email), or null."),
  fromNameOverride: z
    .string()
    .nullable()
    .describe("Per-message From display-name override (email), or null."),
  interpolate: z
    .boolean()
    .describe("Raw sends only: whether server-side variable substitution ran."),
  pinnedVersion: z
    .number()
    .int()
    .nullable()
    .describe("Template version pinned by the caller, or null."),
  idempotencyKey: z.string().nullable().describe("Caller-supplied idempotency key, or null."),
  provider: z
    .string()
    .nullable()
    .describe("Provider that handled (or is handling) delivery, or null before dispatch."),
  providerMessageId: z
    .string()
    .nullable()
    .describe("The provider's own id for this message, or null."),
  latencyMs: z
    .number()
    .int()
    .nullable()
    .describe("Provider round-trip time in milliseconds, or null."),
  openedAt: isoTimestamp
    .nullable()
    .describe("First reported email open (open tracking), or null."),
  clickedAt: isoTimestamp
    .nullable()
    .describe("First reported link click (click tracking), or null."),
  error: z.string().nullable().describe("Provider/bounce error message, or null."),
  timeline: z.array(timelineEntry).describe("Lifecycle events, oldest first."),
  scheduledAt: isoTimestamp
    .nullable()
    .describe("Deliver-at time for a scheduled send, or null for an immediate one."),
  createdAt: isoTimestamp.describe("When the message was created."),
};

/** Shape of the `senderkit_messages_list` result. */
export const messagesListOutput = {
  data: z.array(z.object(messageRecord)).describe("Messages, newest first."),
  nextCursor: z
    .string()
    .nullable()
    .describe("Pass as `cursor` to fetch the next page; null when there are no more."),
};

/** Shape of the `senderkit_messages_get` result. */
export const messagesGetOutput = messageRecord;

/** Shape of the `senderkit_cancel_message` result. */
export const cancelMessageOutput = {
  id: z.string().describe('The canceled message\'s public id (e.g. "msg_…").'),
  status: z.literal("canceled"),
};

const inboundAddress = {
  id: z.string().describe('Inbound address id (e.g. "inb_…").'),
  address: z
    .string()
    .describe("The full receiving address, e.g. support@acme.in.senderkit.email."),
  description: z.string().nullable().describe("Internal note, or null."),
  forwardTo: z
    .string()
    .nullable()
    .describe("Address received mail is also forwarded to, or null."),
  active: z.boolean().describe("Whether the address currently receives mail."),
  livemode: z.boolean().describe("Live-mode address (true) or test-mode (false)."),
  createdAt: isoTimestamp.describe("When the address was created."),
};

/** Shape of the `senderkit_inbound_addresses_list` result. */
export const inboundAddressesListOutput = {
  data: z.array(z.object(inboundAddress)).describe("The workspace's inbound addresses."),
};

/** Shape of the `senderkit_inbound_addresses_create` result. */
export const inboundAddressesCreateOutput = inboundAddress;

/** Shape of the `senderkit_inbound_addresses_delete` result. */
export const inboundAddressesDeleteOutput = {
  deleted: z.literal(true),
};

const inboundMessageStatus = z
  .enum(INBOUND_MESSAGE_STATUSES)
  .describe(
    "received = stored and the webhook/forward pipeline ran; dropped = arrived " +
      "on a verified domain but matched no address; quota_exceeded = stored but " +
      "the pipeline was skipped.",
  );

/** Shape of the `senderkit_inbound_messages_list` result. */
export const inboundMessagesListOutput = {
  data: z
    .array(
      z.object({
        id: z.string().describe('Inbound message id (e.g. "rcv_…").'),
        status: inboundMessageStatus,
        from: z.string().nullable().describe("Header From address, or null."),
        subject: z.string().nullable(),
        plusTag: z
          .string()
          .nullable()
          .describe("The +tag segment of the addressed local part, if any."),
        sizeBytes: z.number().int().describe("Size of the raw message in bytes."),
        receivedAt: isoTimestamp.describe("When the message was received."),
      }),
    )
    .describe("Received messages, newest first."),
};

const inboundAddressPair = z.object({
  email: z.string(),
  name: z.string().nullable(),
});

/** Shape of the `senderkit_inbound_messages_get` result. */
export const inboundMessagesGetOutput = {
  id: z.string().describe('Inbound message id (e.g. "rcv_…").'),
  status: inboundMessageStatus,
  channel: channel,
  address: z
    .string()
    .nullable()
    .describe("Canonical receiving address, or null for catch-all/unmatched mail."),
  plusTag: z.string().nullable().describe("The +tag segment of the addressed local part, if any."),
  from: z.object({ email: z.string().nullable(), name: z.string().nullable() }),
  to: z.array(inboundAddressPair),
  cc: z.array(inboundAddressPair),
  envelope: z.object({
    from: z.string().nullable().describe("SMTP envelope sender (MAIL FROM)."),
    to: z.array(z.string()).describe("SMTP envelope recipients (RCPT TO)."),
  }),
  subject: z.string().nullable(),
  messageId: z.string().nullable().describe("The mail's Message-ID header."),
  inReplyTo: z.string().nullable().describe("The In-Reply-To header, if any."),
  text: z.string().nullable().describe("Plain-text body, or null."),
  html: z.string().nullable().describe("HTML body, or null."),
  strippedReply: z
    .string()
    .nullable()
    .describe("The plain-text reply with quoted history and signature stripped."),
  truncated: z.boolean().describe("Whether the stored body was truncated."),
  headers: z.record(z.string(), z.string()).describe("Mail headers."),
  attachments: z.array(
    z.object({
      index: z.number().int().describe("Zero-based index used in the attachment URL."),
      filename: z.string().nullable(),
      contentType: z.string(),
      size: z.number().int().describe("Size in bytes."),
      url: z
        .string()
        .describe(
          "Authenticated v1 API URL for the bytes — fetch with a Bearer API key " +
            "holding the inbound scope (not a public/signed link).",
        ),
    }),
  ),
  verdicts: z
    .record(z.string(), z.string())
    .describe("Scanning verdicts (spam, virus, SPF, DKIM, DMARC) as reported."),
  sizeBytes: z.number().int().describe("Size of the raw message in bytes."),
  rawUrl: z
    .string()
    .describe("Authenticated v1 API URL for the raw RFC 822 source (Bearer key, inbound scope)."),
  receivedAt: isoTimestamp.describe("When the message was received."),
};

const inboundDnsRecord = z.object({
  type: z.enum(["TXT", "MX"]),
  name: z.string().describe("Host/name to create the record at."),
  value: z.string().describe("Record value."),
  priority: z.number().int().optional().describe("MX priority (MX records only)."),
  purpose: z.string().describe("Why the record is needed."),
});

const inboundDomain = {
  id: z.string().describe("Inbound domain id (UUID) — the id senderkit_inbound_domains_delete takes."),
  domain: z.string().describe("The domain, e.g. inbound.acme.com."),
  kind: z
    .enum(INBOUND_DOMAIN_KINDS)
    .describe("shared = the managed {slug}.in.senderkit.email domain; custom = a claimed domain."),
  status: z
    .enum(INBOUND_DOMAIN_STATUSES)
    .describe("Verification state; only verified domains receive mail."),
  records: z
    .array(inboundDnsRecord)
    .describe(
      "DNS records the user must publish (custom domains only; empty for the " +
        "shared domain). Surface them verbatim.",
    ),
  verifiedAt: isoTimestamp.nullable().describe("When verification completed, or null."),
  createdAt: isoTimestamp.describe("When the domain was claimed."),
};

/** Shape of the `senderkit_inbound_domains_list` result. */
export const inboundDomainsListOutput = {
  domains: z.array(z.object(inboundDomain)).describe("The workspace's inbound domains."),
};

/** Shape of the `senderkit_inbound_domains_create` result. */
export const inboundDomainsCreateOutput = inboundDomain;

/** Shape of the `senderkit_inbound_domains_delete` result. */
export const inboundDomainsDeleteOutput = {
  deleted: z.literal(true),
};
