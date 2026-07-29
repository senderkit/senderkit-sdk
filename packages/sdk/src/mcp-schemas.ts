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
  .describe("ISO 8601 timestamp for scheduled delivery (e.g. 2026-06-01T09:00:00Z).")
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
    .preprocess(csvOrJsonArray, z.array(z.string()))
    .optional()
    .describe("Email-only. Cc recipients (CLI: comma-separated or JSON array)."),
  bcc: z
    .preprocess(csvOrJsonArray, z.array(z.string()))
    .optional()
    .describe("Email-only. Bcc recipients (CLI: comma-separated or JSON array)."),
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
      "Recipient address. For web-push, the JSON-encoded browser PushSubscription (endpoint + keys).",
    ),
  // email
  subject: z.string().optional().describe("Email subject (email)."),
  preheader: z.string().optional().describe("Email preheader (email)."),
  html: z.string().optional().describe("Email HTML body (email)."),
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
  limit: positiveInt.describe("Max messages to return."),
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
      "1-64 chars of a-z 0-9 . _ -, starting and ending alphanumeric. " +
        'Lowercased. Omit to auto-generate an unguessable local part. Pass "*" ' +
        "for a catch-all that receives every local part no exact address claims.",
    ),
  description: z.string().max(200).optional().describe("Optional human label for the address."),
  forwardTo: z
    .string()
    .max(320)
    .optional()
    .describe("Optional address to also forward received mail to. Cannot be another inbound address."),
  webhookEndpointId: z
    .string()
    .uuid()
    .optional()
    .describe(
      "Optional webhook endpoint id to bind this address to. When unset, " +
        "message.received events fan out to every endpoint subscribed to them.",
    ),
  domainId: z
    .string()
    .uuid()
    .optional()
    .describe(
      "A verified custom inbound domain id (from senderkit_inbound_domains_list) " +
        "to mint the address on. Omit for the workspace's shared receiving domain.",
    ),
  livemode: z
    .boolean()
    .optional()
    .describe(
      "Live mode (default true). Test-mode addresses receive real mail but fan " +
        "out only to test webhook endpoints and don't count against quota.",
    ),
};

/** Shape for `senderkit_inbound_addresses_delete`. */
export const inboundAddressesDeleteInput = {
  id: z.string().describe('Public inbound address id (e.g. "inb_…") to delete.'),
};

/** Shape for `senderkit_inbound_domains_list`. No inputs. */
export const inboundDomainsListInput = {};

/** Shape for `senderkit_inbound_domains_create`. */
export const inboundDomainsCreateInput = {
  domain: z
    .string()
    .describe(
      'Custom domain to claim for receiving, e.g. "inbound.acme.com". Must not ' +
        "already be claimed and must not be a senderkit.com/senderkit.email suffix.",
    ),
  acknowledgeExistingMx: z
    .boolean()
    .optional()
    .describe(
      "Only pass true after the user has explicitly confirmed they want to " +
        "redirect this domain's mail to SenderKit. Omit on the first attempt — " +
        "if the domain already has live MX records, the call fails with an " +
        "existing_mx error naming the current host(s) so you can confirm first.",
    ),
};

/** Shape for `senderkit_inbound_domains_delete`. */
export const inboundDomainsDeleteInput = {
  id: z.string().describe("Inbound domain id (UUID) to delete."),
};

/** Shape for `senderkit_inbound_messages_list`. */
export const inboundMessagesListInput = {
  limit: positiveInt.describe("Max messages to return (1-100)."),
  before: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe("Only return messages received before this ISO 8601 timestamp (for backward paging)."),
  address: z.string().optional().describe("Filter to messages received on this address's public id."),
};

/** Shape for `senderkit_inbound_messages_get`. */
export const inboundMessagesGetInput = {
  id: z.string().describe('Public inbound message id (e.g. "rcv_…").'),
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
