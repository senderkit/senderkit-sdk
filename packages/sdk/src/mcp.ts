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
  contextOutput,
  sendOutput,
  sendRawOutput,
  templatesListOutput,
  templatesGetOutput,
  messagesListOutput,
  messagesGetOutput,
  cancelMessageOutput,
  inboundAddressesListOutput,
  inboundAddressesCreateOutput,
  inboundAddressesDeleteOutput,
  inboundMessagesListOutput,
  inboundMessagesGetOutput,
  inboundDomainsListOutput,
  inboundDomainsCreateOutput,
  inboundDomainsDeleteOutput,
} from "./mcp-schemas";

// Single MCP entry point: re-export the input shapes + SEND_TOOL_LIVE_MODE_NOTE
// so everything MCP-related is importable from `@senderkit/sdk/mcp`.
export * from "./mcp-schemas";

/**
 * MCP behaviour hints surfaced to clients (and the connector directory
 * reviews). Every tool states the full trio explicitly: OpenAI's ChatGPT/Codex
 * plugin review rejects manifests whose tools omit `readOnlyHint`,
 * `openWorldHint`, or `destructiveHint`, so the manifest ships completed
 * values instead of leaving clients to infer the spec's defaults.
 */
export interface ToolAnnotations {
  /** True when the tool only reads workspace state. */
  readOnlyHint: boolean;
  /**
   * True when the tool reaches beyond SenderKit — only the send tools, which
   * deliver email/SMS/push/web-push to external recipients.
   */
  openWorldHint: boolean;
  /**
   * True when the tool's effect is not recoverable (a cancelled send, a
   * deleted address or domain, redirected domain mail). `false` on reads and
   * on additive writes a client need not treat as irreversible.
   */
  destructiveHint: boolean;
}

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
  /**
   * Shape of the tool's structured result (`structuredContent`), exposed to
   * clients as JSON Schema via `tools/list`. Describes the hosted server's
   * result — the v1 REST response the tool wraps, minus internal identifiers.
   * A server that declares it MUST return conforming `structuredContent`
   * (MCP spec 2025-06-18). Both the app-hosted server and the CLI-bundled
   * stdio/HTTP server declare it and return conforming results; the CLI server
   * projects the SDK client's shapes through this schema, which drops the
   * client's internal-only fields so the two servers stay field-for-field
   * identical.
   */
  outputSchema: z.ZodRawShape;
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
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
    inputSchema: contextInput,
    outputSchema: contextOutput,
  },
  {
    name: "senderkit_send",
    title: "Send Templated Message",
    description:
      "Send a transactional email, SMS, push, or web-push notification to a " +
      "recipient using a saved template.",
    annotations: {
      readOnlyHint: false,
      openWorldHint: true,
      destructiveHint: true,
    },
    inputSchema: sendInput,
    outputSchema: sendOutput,
  },
  {
    name: "senderkit_send_raw",
    title: "Send Raw Message",
    description:
      "Send a transactional email, SMS, push, or web-push notification with " +
      "inline content, without a registered template.",
    annotations: {
      readOnlyHint: false,
      openWorldHint: true,
      destructiveHint: true,
    },
    inputSchema: sendRawInput,
    outputSchema: sendRawOutput,
  },
  {
    name: "senderkit_templates_list",
    title: "List Templates",
    description:
      "List all message templates in the workspace across email, SMS, push, " +
      "and web-push, with slugs and channels.",
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
    inputSchema: templatesListInput,
    outputSchema: templatesListOutput,
  },
  {
    name: "senderkit_templates_get",
    title: "Get Template",
    description:
      "Fetch a template's content, variables, and current version by slug — " +
      "inspect what will actually be delivered before sending or editing.",
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
    inputSchema: templatesGetInput,
    outputSchema: templatesGetOutput,
  },
  {
    name: "senderkit_messages_list",
    title: "List Messages",
    description:
      "List sent and scheduled messages across email, SMS, push, and " +
      "web-push. Filter by channel, template, delivery status, or metadata — " +
      "use this to monitor deliverability, debug failed sends, or audit " +
      "transactional message history.",
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
    inputSchema: messagesListInput,
    outputSchema: messagesListOutput,
  },
  {
    name: "senderkit_messages_get",
    title: "Get Message",
    description:
      "Fetch full details and delivery status for a single message by ID — " +
      "check whether a specific email or SMS was delivered, bounced, or failed.",
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
    inputSchema: messagesGetInput,
    outputSchema: messagesGetOutput,
  },
  {
    name: "senderkit_cancel_message",
    title: "Cancel Scheduled Message",
    description:
      "Cancel a still-pending message (scheduled or queued) by its public id.",
    annotations: {
      readOnlyHint: false,
      openWorldHint: false,
      destructiveHint: true,
    },
    inputSchema: cancelMessageInput,
    outputSchema: cancelMessageOutput,
  },
  {
    name: "senderkit_inbound_addresses_list",
    title: "List Inbound Addresses",
    description:
      "List the workspace's programmatic inbound email addresses — the " +
      "addresses that receive mail and forward it or fire a webhook into the " +
      "workspace.",
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
    inputSchema: inboundAddressesListInput,
    outputSchema: inboundAddressesListOutput,
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
    annotations: {
      readOnlyHint: false,
      openWorldHint: false,
      destructiveHint: false,
    },
    inputSchema: inboundAddressesCreateInput,
    outputSchema: inboundAddressesCreateOutput,
  },
  {
    name: "senderkit_inbound_addresses_delete",
    title: "Delete Inbound Address",
    description:
      "Delete one of the workspace's inbound email addresses by id. The " +
      "address immediately stops receiving new mail; already-received " +
      "messages are unaffected.",
    annotations: {
      readOnlyHint: false,
      openWorldHint: false,
      destructiveHint: true,
    },
    inputSchema: inboundAddressesDeleteInput,
    outputSchema: inboundAddressesDeleteOutput,
  },
  {
    name: "senderkit_inbound_messages_list",
    title: "List Inbound Messages",
    description:
      "List received inbound email messages for the workspace's programmatic " +
      "addresses, newest first. Filter by address or a receivedAt cursor — " +
      "use this to check whether mail has arrived, or to page through recent " +
      "receipts.",
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
    inputSchema: inboundMessagesListInput,
    outputSchema: inboundMessagesListOutput,
  },
  {
    name: "senderkit_inbound_messages_get",
    title: "Get Inbound Message",
    description:
      "Fetch a single received inbound email message by id — envelope, " +
      "headers, subject, body, attachments (as authenticated v1 API links — " +
      "Bearer key with the inbound scope, not signed/presigned), and " +
      "spam/auth verdicts.",
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
    inputSchema: inboundMessagesGetInput,
    outputSchema: inboundMessagesGetOutput,
  },
  {
    name: "senderkit_inbound_domains_list",
    title: "List Inbound Domains",
    description:
      "List the workspace's custom inbound domains — including the shared " +
      "{slug}.in.senderkit.email domain, if used — with their verification " +
      "status and (for pending custom domains) the DNS records still needed.",
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
    inputSchema: inboundDomainsListInput,
    outputSchema: inboundDomainsListOutput,
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
    annotations: {
      readOnlyHint: false,
      openWorldHint: false,
      destructiveHint: true,
    },
    inputSchema: inboundDomainsCreateInput,
    outputSchema: inboundDomainsCreateOutput,
  },
  {
    name: "senderkit_inbound_domains_delete",
    title: "Delete Inbound Domain",
    description:
      "Delete a custom inbound domain by id. Its addresses stop receiving mail " +
      "immediately. The workspace's shared {slug}.in.senderkit.email domain " +
      "cannot be deleted.",
    annotations: {
      readOnlyHint: false,
      openWorldHint: false,
      destructiveHint: true,
    },
    inputSchema: inboundDomainsDeleteInput,
    outputSchema: inboundDomainsDeleteOutput,
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
