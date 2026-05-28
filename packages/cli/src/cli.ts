import { Command as Commander } from "commander";
import { registry } from "./core/registry";
import { registerCommands } from "./cli/adapter";
import { registerBuiltins } from "./cli/builtins";
import { registerMcp } from "./cli/mcp-command";
import { handleError, setJsonMode } from "./cli/errors";
import { VERSION } from "./version";

// Detect `--json` before commander parses so error paths (including parse
// errors) honor the flag and emit structured JSON instead of colored text.
setJsonMode(process.argv.includes("--json"));

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

program.parseAsync(process.argv).catch(handleError);
