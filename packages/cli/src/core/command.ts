import type { SenderKit } from "@senderkit/sdk";
import type { McpToolSpec, ToolAnnotations } from "@senderkit/sdk/mcp";
import type { z } from "zod";

export interface CommandCtx {
  client: SenderKit;
}

// The behaviour-hint union lives in the shared MCP manifest; re-export it so
// existing `import { ToolAnnotations } from "../command"` sites keep working.
export type { ToolAnnotations };

/**
 * Shared command fields derived from the canonical MCP manifest
 * (`@senderkit/sdk/mcp`). `summary` defaults to the manifest description; pass
 * `overrides.summary` only when the terminal help text must read differently
 * than the LLM-facing description (allowlisted in the CLI parity test).
 *
 * `schema` is intentionally NOT sourced here — each command imports its
 * precisely-typed shape from `@senderkit/sdk/mcp-schemas` directly so `run`'s
 * input keeps its exact field types (the manifest erases shapes to
 * `z.ZodRawShape`).
 */
export function fromSpec(
  spec: McpToolSpec,
  overrides?: { summary?: string },
): Pick<Command, "mcpName" | "title" | "summary" | "annotations"> {
  return {
    mcpName: spec.name,
    title: spec.title,
    summary: overrides?.summary ?? spec.description,
    annotations: spec.annotations,
  };
}

/**
 * A single capability, declared once and consumed by both the CLI and MCP
 * adapters. `schema` is a plain `ZodObject` so its raw `.shape` can drive both
 * CLI flag generation and the MCP tool input schema.
 */
export interface Command<
  Shape extends z.ZodRawShape = z.ZodRawShape,
  Output = unknown,
> {
  /** CLI route, e.g. `["templates", "get"]`. */
  path: string[];
  /** MCP tool name, e.g. `"senderkit_templates_get"`. */
  mcpName: string;
  /** Human-readable MCP tool title, e.g. `"Get Template"`. */
  title: string;
  /** One-line description used for CLI help and the MCP tool description. */
  summary: string;
  /** MCP behaviour hints (read-only vs destructive). */
  annotations: ToolAnnotations;
  /** Shared input schema. Validation for the CLI; input schema for MCP. */
  schema: z.ZodObject<Shape>;
  /** Schema fields rendered as positional CLI args (in order). */
  positional?: (keyof Shape)[];
  run(input: z.infer<z.ZodObject<Shape>>, ctx: CommandCtx): Promise<Output>;
  /** Human-readable rendering for the CLI (non-`--json` output). */
  format(output: Output): string;
}

/** Helper that preserves the precise `Shape`/`Output` types of a command. */
export function defineCommand<Shape extends z.ZodRawShape, Output>(
  command: Command<Shape, Output>,
): Command<Shape, Output> {
  return command;
}
