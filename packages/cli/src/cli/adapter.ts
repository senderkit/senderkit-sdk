import { Command as Commander } from "commander";
import type { z } from "zod";
import type { Command, CommandCtx } from "../core/command";
import { buildClient } from "../core/context";
import { describeField, kebab } from "./introspect";
import { handleError } from "./errors";

interface GlobalOpts {
  apiKey?: string;
  baseUrl?: string;
  json?: boolean;
}

/**
 * Assemble a command's raw input from positional args and options, run it, and
 * print the result (human-readable or `--json`). Exported for direct testing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runCommand(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  command: Command<any, any>,
  rawInput: Record<string, unknown>,
  globals: GlobalOpts,
  ctx?: CommandCtx,
): Promise<void> {
  const input = command.schema.parse(rawInput);
  const client = ctx?.client ?? buildClient(globals);
  const output = await command.run(input, { client });
  if (globals.json) {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } else {
    process.stdout.write(`${command.format(output)}\n`);
  }
}

/** Register every registry command onto the commander program. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerCommands(program: Commander, registry: Command<any, any>[]): void {
  for (const command of registry) {
    const leaf = resolveParent(program, command.path).command(
      command.path[command.path.length - 1]!,
    );
    leaf.summary(command.summary);
    leaf.description(command.summary);

    const positional = new Set((command.positional ?? []).map(String));
    const shape = command.schema.shape as z.ZodRawShape;

    // Positional arguments, in declared order.
    for (const name of command.positional ?? []) {
      const info = describeField(shape[name as string]!);
      const token = info.optional ? `[${String(name)}]` : `<${String(name)}>`;
      leaf.argument(token, command.flagHelp?.[String(name)] ?? info.description);
    }

    // Remaining fields become options.
    for (const [name, field] of Object.entries(shape)) {
      if (positional.has(name)) continue;
      const info = describeField(field);
      const flag = kebab(name);
      let desc = command.flagHelp?.[name] ?? info.description ?? "";
      if (info.enumValues) desc += ` (choices: ${info.enumValues.join(", ")})`;

      if (info.kind === "boolean") {
        leaf.option(`--${flag}`, desc.trim());
      } else if (info.optional) {
        leaf.option(`--${flag} <value>`, desc.trim());
      } else {
        leaf.requiredOption(`--${flag} <value>`, desc.trim());
      }
    }

    leaf.action(async (...args: unknown[]) => {
      const self = args.pop() as Commander;
      const localOpts = args.pop() as Record<string, unknown>;
      const positionalValues = args;

      const raw: Record<string, unknown> = {};
      (command.positional ?? []).forEach((name, i) => {
        if (positionalValues[i] !== undefined) raw[String(name)] = positionalValues[i];
      });
      for (const [k, v] of Object.entries(localOpts)) {
        if (v !== undefined) raw[k] = v;
      }

      const globals = self.optsWithGlobals() as GlobalOpts;
      try {
        await runCommand(command, raw, globals);
      } catch (err) {
        handleError(err);
      }
    });
  }
}

/** Walk/create the parent command chain for a multi-segment path. */
function resolveParent(program: Commander, path: string[]): Commander {
  let parent = program;
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i]!;
    const existing = parent.commands.find((c) => c.name() === segment);
    parent = existing ?? parent.command(segment).description(`${segment} commands`);
  }
  return parent;
}
