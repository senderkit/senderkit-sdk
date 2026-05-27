import type { SenderKit } from "@senderkit/sdk";
import type { z } from "zod";

export interface CommandCtx {
  client: SenderKit;
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
  /** One-line description used for CLI help and the MCP tool description. */
  summary: string;
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
