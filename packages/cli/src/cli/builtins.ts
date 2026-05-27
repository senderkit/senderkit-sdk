import { createInterface } from "node:readline/promises";
import { Command as Commander } from "commander";
import { SenderKit } from "@senderkit/sdk";
import pc from "picocolors";
import {
  CONFIG_KEYS,
  type ConfigKey,
  configPath,
  maskKey,
  readConfig,
  setConfigValue,
} from "../core/config";
import { resolveBaseUrl } from "../core/context";
import { success } from "./format";
import { handleError } from "./errors";

function assertConfigKey(key: string): asserts key is ConfigKey {
  if (!(CONFIG_KEYS as readonly string[]).includes(key)) {
    throw new Error(
      `Unknown config key "${key}". Valid keys: ${CONFIG_KEYS.join(", ")}.`,
    );
  }
}

export function registerBuiltins(program: Commander): void {
  const config = program
    .command("config")
    .description("Read and write persisted configuration.");

  config
    .command("set")
    .description("Set a config value (written to ~/.senderkit/config.json).")
    .argument("<key>", `One of: ${CONFIG_KEYS.join(", ")}`)
    .argument("<value>")
    .action((key: string, value: string) => {
      try {
        assertConfigKey(key);
        setConfigValue(key, value);
        process.stdout.write(`${success(`Set ${key} in ${configPath()}`)}\n`);
      } catch (err) {
        handleError(err);
      }
    });

  config
    .command("get")
    .description("Print a single config value.")
    .argument("<key>", `One of: ${CONFIG_KEYS.join(", ")}`)
    .action((key: string) => {
      try {
        assertConfigKey(key);
        const value = readConfig()[key];
        if (value === undefined) process.exit(1);
        process.stdout.write(`${key === "apiKey" ? maskKey(value) : value}\n`);
      } catch (err) {
        handleError(err);
      }
    });

  config
    .command("list")
    .description("Print all config values (API key masked).")
    .action(() => {
      const cfg = readConfig();
      const entries = Object.entries(cfg);
      if (entries.length === 0) {
        process.stdout.write("No config set.\n");
        return;
      }
      for (const [k, v] of entries) {
        const shown = k === "apiKey" && typeof v === "string" ? maskKey(v) : v;
        process.stdout.write(`${pc.dim(`${k}:`)} ${shown}\n`);
      }
    });

  program
    .command("login")
    .description("Prompt for an API key, verify it, and save it.")
    .action(async () => {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      try {
        const apiKey = (await rl.question("SenderKit API key: ")).trim();
        rl.close();
        if (!apiKey) throw new Error("No API key entered.");

        const baseUrl = resolveBaseUrl();
        const client = new SenderKit(baseUrl ? { apiKey, baseUrl } : { apiKey });
        await client.templates.list(); // verifies the key works

        setConfigValue("apiKey", apiKey);
        process.stdout.write(`${success(`Saved API key to ${configPath()}`)}\n`);
      } catch (err) {
        rl.close();
        handleError(err);
      }
    });
}
