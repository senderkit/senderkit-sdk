import type { z } from "zod";
import {
  contextInput,
  sendInput,
  sendRawInput,
  templatesListInput,
  templatesGetInput,
  messagesListInput,
  messagesGetInput,
  cancelMessageInput,
  inboundAddressesListInput,
  inboundAddressesCreateInput,
  inboundAddressesDeleteInput,
  inboundMessagesListInput,
  inboundMessagesGetInput,
  inboundDomainsListInput,
  inboundDomainsCreateInput,
  inboundDomainsDeleteInput,
} from "./mcp-schemas";

// Single MCP entry point: re-export the input shapes + SEND_TOOL_LIVE_MODE_NOTE
// so everything MCP-related is importable from `@senderkit/sdk/mcp`.
export * from "./mcp-schemas";

/**
 * MCP behaviour hints surfaced to clients (and the Connectors Directory review).
 * A tool declares exactly one hint: it is read-only, or it is a write — either
 * destructive (`destructiveHint: true`) or explicitly non-destructive
 * (`destructiveHint: false`, additive/reversible operations a client need not
 * treat as irreversible).
 */
export type ToolAnnotations =
  | { readOnlyHint: true; destructiveHint?: never }
  | { destructiveHint: boolean; readOnlyHint?: never };

/**
 * The declarative surface of one MCP tool, shared by the CLI-bundled server and
 * the app-hosted server. Handlers stay in each package; the `description` is the
 * base wording with NO transport-specific send-mode note — each server appends
 * its own (the CLI's API-key note, the app's OAuth note).
 */
export interface McpToolSpec {
  name: string;
  title: string;
  description: string;
  annotations: ToolAnnotations;
  inputSchema: z.ZodRawShape;
}

export const MCP_TOOLS: readonly McpToolSpec[] = [
  {
    name: "senderkit_context",
    title: "Get Workspace Context",
    description:
      "Returns the connected workspace (id, name, slug) and the send mode (live " +
      "or test) for this connection. The mode is fixed for the whole connection. " +
      "Call this before sending so you can tell the user which workspace they're " +
      "in and whether messages will be really delivered (live) or only recorded " +
      "without delivery (test).",
    annotations: { readOnlyHint: true },
    inputSchema: contextInput,
  },
  {
    name: "senderkit_send",
    title: "Send Templated Message",
    description:
      "Send a transactional email, SMS, push, or web-push notification to a " +
      "recipient using a saved template.",
    annotations: { destructiveHint: true },
    inputSchema: sendInput,
  },
  {
    name: "senderkit_send_raw",
    title: "Send Raw Message",
    description:
      "Send a transactional email, SMS, push, or web-push notification with " +
      "inline content, without a registered template.",
    annotations: { destructiveHint: true },
    inputSchema: sendRawInput,
  },
  {
    name: "senderkit_templates_list",
    title: "List Templates",
    description:
      "List all message templates in the workspace across email, SMS, push, " +
      "and web-push, with slugs and channels.",
    annotations: { readOnlyHint: true },
    inputSchema: templatesListInput,
  },
  {
    name: "senderkit_templates_get",
    title: "Get Template",
    description:
      "Fetch a template's content, variables, and current version by slug — " +
      "inspect what will actually be delivered before sending or editing.",
    annotations: { readOnlyHint: true },
    inputSchema: templatesGetInput,
  },
  {
    name: "senderkit_messages_list",
    title: "List Messages",
    description:
      "List sent and scheduled messages across email, SMS, push, and " +
      "web-push. Filter by channel, template, delivery status, or metadata — " +
      "use this to monitor deliverability, debug failed sends, or audit " +
      "transactional message history.",
    annotations: { readOnlyHint: true },
    inputSchema: messagesListInput,
  },
  {
    name: "senderkit_messages_get",
    title: "Get Message",
    description:
      "Fetch full details and delivery status for a single message by ID — " +
      "check whether a specific email or SMS was delivered, bounced, or failed.",
    annotations: { readOnlyHint: true },
    inputSchema: messagesGetInput,
  },
  {
    name: "senderkit_cancel_message",
    title: "Cancel Scheduled Message",
    description:
      "Cancel a still-pending message (scheduled or queued) by its public id.",
    annotations: { destructiveHint: true },
    inputSchema: cancelMessageInput,
  },
  {
    name: "senderkit_inbound_addresses_list",
    title: "List Inbound Addresses",
    description:
      "List the workspace's programmatic inbound email addresses — the " +
      "addresses that receive mail and forward it or fire a webhook into the " +
      "workspace.",
    annotations: { readOnlyHint: true },
    inputSchema: inboundAddressesListInput,
  },
  {
    name: "senderkit_inbound_addresses_create",
    title: "Create Inbound Address",
    description:
      "Create a new inbound email address that receives mail for the " +
      "workspace and, optionally, forwards it and/or fires a webhook on " +
      "receipt. Enforces the workspace's plan limit and validates " +
      "forwardTo/webhookEndpointId.",
    // Additive: mints a new address; deleting it again fully reverses it.
    annotations: { destructiveHint: false },
    inputSchema: inboundAddressesCreateInput,
  },
  {
    name: "senderkit_inbound_addresses_delete",
    title: "Delete Inbound Address",
    description:
      "Delete one of the workspace's inbound email addresses by id. The " +
      "address immediately stops receiving new mail; already-received " +
      "messages are unaffected.",
    annotations: { destructiveHint: true },
    inputSchema: inboundAddressesDeleteInput,
  },
  {
    name: "senderkit_inbound_messages_list",
    title: "List Inbound Messages",
    description:
      "List received inbound email messages for the workspace's programmatic " +
      "addresses, newest first. Filter by address or a receivedAt cursor — " +
      "use this to check whether mail has arrived, or to page through recent " +
      "receipts.",
    annotations: { readOnlyHint: true },
    inputSchema: inboundMessagesListInput,
  },
  {
    name: "senderkit_inbound_messages_get",
    title: "Get Inbound Message",
    description:
      "Fetch a single received inbound email message by id — envelope, " +
      "headers, subject, body, attachments (as authenticated v1 API links — " +
      "Bearer key with the inbound scope, not signed/presigned), and " +
      "spam/auth verdicts.",
    annotations: { readOnlyHint: true },
    inputSchema: inboundMessagesGetInput,
  },
  {
    name: "senderkit_inbound_domains_list",
    title: "List Inbound Domains",
    description:
      "List the workspace's custom inbound domains — including the shared " +
      "{slug}.in.senderkit.email domain, if used — with their verification " +
      "status and (for pending custom domains) the DNS records still needed.",
    annotations: { readOnlyHint: true },
    inputSchema: inboundDomainsListInput,
  },
  {
    name: "senderkit_inbound_domains_create",
    title: "Claim Inbound Domain",
    description:
      'Claim a custom domain for receiving mail (e.g. "inbound.acme.com"). ' +
      "Returns the DNS records (MX, DKIM) the user must publish — tell them " +
      "exactly what to add. If the domain already has live MX records pointing " +
      "elsewhere, this fails with an existing_mx error naming the current " +
      "host(s); get the user's explicit confirmation before retrying with " +
      "acknowledgeExistingMx: true, since claiming will redirect ALL of that " +
      "domain's mail to SenderKit. Nothing is received until the records are " +
      "live and verification completes.",
    annotations: { destructiveHint: true },
    inputSchema: inboundDomainsCreateInput,
  },
  {
    name: "senderkit_inbound_domains_delete",
    title: "Delete Inbound Domain",
    description:
      "Delete a custom inbound domain by id. Its addresses stop receiving mail " +
      "immediately. The workspace's shared {slug}.in.senderkit.email domain " +
      "cannot be deleted.",
    annotations: { destructiveHint: true },
    inputSchema: inboundDomainsDeleteInput,
  },
];

/** Union of every tool name in {@link MCP_TOOLS}. */
export type McpToolName =
  | "senderkit_context"
  | "senderkit_send"
  | "senderkit_send_raw"
  | "senderkit_templates_list"
  | "senderkit_templates_get"
  | "senderkit_messages_list"
  | "senderkit_messages_get"
  | "senderkit_cancel_message"
  | "senderkit_inbound_addresses_list"
  | "senderkit_inbound_addresses_create"
  | "senderkit_inbound_addresses_delete"
  | "senderkit_inbound_messages_list"
  | "senderkit_inbound_messages_get"
  | "senderkit_inbound_domains_list"
  | "senderkit_inbound_domains_create"
  | "senderkit_inbound_domains_delete";

// Keyed by the finite name union (not `string`) so known-key access stays a
// non-optional `McpToolSpec` even under `noUncheckedIndexedAccess`.
export const MCP_TOOLS_BY_NAME = Object.fromEntries(
  MCP_TOOLS.map((t) => [t.name, t]),
) as Record<McpToolName, McpToolSpec>;
