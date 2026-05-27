import { Command as Commander } from "commander";
import { registry } from "./core/registry.js";
import { registerCommands } from "./cli/adapter.js";
import { registerBuiltins } from "./cli/builtins.js";
import { registerMcp } from "./cli/mcp-command.js";
import { VERSION } from "./version.js";

const program = new Commander();

program
  .name("senderkit")
  .description("SenderKit CLI — send notifications and inspect templates/messages.")
  .version(VERSION)
  .enablePositionalOptions()
  .option("--api-key <key>", "API key (overrides SENDERKIT_API_KEY and config).")
  .option("--base-url <url>", "Override the API base URL.")
  .option("--json", "Output raw JSON instead of human-readable text.");

registerCommands(program, registry);
registerBuiltins(program);
registerMcp(program);

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
