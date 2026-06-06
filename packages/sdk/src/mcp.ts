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
} from "./mcp-schemas";

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
      "Returns the active workspace id and send mode (live or test) for this " +
      "connection. The mode is fixed for the whole connection. Call this before " +
      "sending so you can tell the user whether messages will be really " +
      "delivered (live) or only recorded without delivery (test).",
    annotations: { readOnlyHint: true },
    inputSchema: contextInput,
  },
  {
    name: "senderkit_send",
    title: "Send Templated Message",
    description: "Send a templated message to a recipient.",
    annotations: { destructiveHint: true },
    inputSchema: sendInput,
  },
  {
    name: "senderkit_send_raw",
    title: "Send Raw Message",
    description: "Send inline content without a registered template.",
    annotations: { destructiveHint: true },
    inputSchema: sendRawInput,
  },
  {
    name: "senderkit_templates_list",
    title: "List Templates",
    description: "List available templates.",
    annotations: { readOnlyHint: true },
    inputSchema: templatesListInput,
  },
  {
    name: "senderkit_templates_get",
    title: "Get Template",
    description: "Fetch a single template by slug.",
    annotations: { readOnlyHint: true },
    inputSchema: templatesGetInput,
  },
  {
    name: "senderkit_messages_list",
    title: "List Messages",
    description: "List messages, optionally filtered.",
    annotations: { readOnlyHint: true },
    inputSchema: messagesListInput,
  },
  {
    name: "senderkit_messages_get",
    title: "Get Message",
    description: "Fetch a single message by ID.",
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
];

export const MCP_TOOLS_BY_NAME: Record<string, McpToolSpec> = Object.fromEntries(
  MCP_TOOLS.map((t) => [t.name, t]),
);
