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

const channel = z.enum(["email", "sms", "push"]);

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

/** Shape for `senderkit_send` — templated send. */
export const sendInput = {
  template: z.string().describe('Template slug, e.g. "welcome".'),
  to: z.string().describe("Recipient address."),
  vars,
  channel: channel.optional().describe("Force a channel (defaults to the template's primary)."),
  version: positiveInt.describe("Pin a specific template version."),
  metadata,
  scheduledAt,
  idempotencyKey,
  ...emailEnvelope,
};

/** Shape for `senderkit_send_raw` — inline content send. */
export const sendRawInput = {
  channel: channel.describe("Channel: email, sms, or push."),
  to: z.string().describe("Recipient address."),
  // email
  subject: z.string().optional().describe("Email subject (email)."),
  preheader: z.string().optional().describe("Email preheader (email)."),
  html: z.string().optional().describe("Email HTML body (email)."),
  text: z.string().optional().describe("Email plain-text body (email)."),
  from: z.string().optional().describe("From override (email)."),
  // sms + push
  body: z.string().optional().describe("Message body (sms, push)."),
  // push
  title: z.string().optional().describe("Notification title (push)."),
  badge: nonNegativeInt.describe("Badge count (push)."),
  sound: z.string().optional().describe("Notification sound (push)."),
  pushData: pushData.describe("Push data payload as a JSON object of strings (push)."),
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
  slug: z.string().describe("Template slug."),
};

/** Shape for `senderkit_messages_list`. */
export const messagesListInput = {
  limit: positiveInt.describe("Max messages to return."),
  cursor: z.string().optional().describe("Pagination cursor."),
  status: z.string().optional().describe("Filter by status (e.g. delivered)."),
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

/**
 * Description-suffix appended to `senderkit_send` and `senderkit_send_raw`
 * so callers know the request will dispatch a real message and the mode
 * depends on the API key prefix. Kept here so both servers stay in sync.
 */
export const SEND_TOOL_LIVE_MODE_NOTE =
  " Dispatches a real message; live vs test mode is determined by the API key prefix (sk_live_ / sk_test_).";
