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
} from "./mcp-schemas";

// Single MCP entry point: re-export the input shapes + SEND_TOOL_LIVE_MODE_NOTE
// so everything MCP-related is importable from `@senderkit/sdk/mcp`.
export * from "./mcp-schemas";

/**
 * MCP behaviour hints surfaced to clients (and the Connectors Directory review).
 * A tool is read-only OR destructive — never both, never neither.
 */
export type ToolAnnotations =
  | { readOnlyHint: true; destructiveHint?: never }
  | { destructiveHint: true; readOnlyHint?: never };

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
      "List the addresses provisioned on the workspace's shared receiving " +
      "domain — the addresses that can receive mail into this workspace.",
    annotations: { readOnlyHint: true },
    inputSchema: inboundAddressesListInput,
  },
  {
    name: "senderkit_inbound_addresses_create",
    title: "Create Inbound Address",
    description:
      "Provision a new address on the workspace's shared receiving domain so " +
      "it can receive mail. Optionally forward received mail to another address " +
      "or bind the address to a specific webhook endpoint.",
    annotations: { destructiveHint: true },
    inputSchema: inboundAddressesCreateInput,
  },
  {
    name: "senderkit_inbound_addresses_delete",
    title: "Delete Inbound Address",
    description:
      "Delete an inbound address by its public id. Mail sent to it afterward is " +
      "dropped like any other unmatched recipient.",
    annotations: { destructiveHint: true },
    inputSchema: inboundAddressesDeleteInput,
  },
  {
    name: "senderkit_inbound_messages_list",
    title: "List Received Messages",
    description:
      "List messages received on the workspace's inbound addresses, newest " +
      "first. Filter by address or page backwards with a `before` timestamp — " +
      "use this to monitor or triage incoming mail.",
    annotations: { readOnlyHint: true },
    inputSchema: inboundMessagesListInput,
  },
  {
    name: "senderkit_inbound_messages_get",
    title: "Get Received Message",
    description:
      "Fetch a single received message by id, including its parsed text/HTML " +
      "body, stripped reply, headers, scanning verdicts, and attachment list.",
    annotations: { readOnlyHint: true },
    inputSchema: inboundMessagesGetInput,
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
  | "senderkit_inbound_messages_get";

// Keyed by the finite name union (not `string`) so known-key access stays a
// non-optional `McpToolSpec` even under `noUncheckedIndexedAccess`.
export const MCP_TOOLS_BY_NAME = Object.fromEntries(
  MCP_TOOLS.map((t) => [t.name, t]),
) as Record<McpToolName, McpToolSpec>;
