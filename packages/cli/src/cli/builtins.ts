import { createInterface } from "node:readline";
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
      try {
        const apiKey = (await readApiKey()).trim();
        if (!apiKey) throw new Error("No API key entered.");

        const baseUrl = resolveBaseUrl();
        const client = new SenderKit(baseUrl ? { apiKey, baseUrl } : { apiKey });
        await client.templates.list(); // verifies the key works

        setConfigValue("apiKey", apiKey);
        process.stdout.write(`${success(`Saved API key to ${configPath()}`)}\n`);
      } catch (err) {
        handleError(err);
      }
    });
}

async function readApiKey(): Promise<string> {
  if (process.stdin.isTTY) {
    return readSecretFromTty("SenderKit API key: ");
  }
  return readFirstLine();
}

function readFirstLine(): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: process.stdin });
    rl.once("line", (line) => {
      rl.close();
      resolve(line);
    });
    rl.once("close", () => resolve(""));
    rl.once("error", reject);
  });
}

const CTRL_C = "\x03";
const DEL = "\x7f";
const BS = "\x08";

function readSecretFromTty(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write(prompt);

    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let buf = "";
    const cleanup = (): void => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
    };
    const onData = (data: string): void => {
      for (const ch of data) {
        if (ch === "\r" || ch === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(buf);
          return;
        }
        if (ch === CTRL_C) {
          cleanup();
          stdout.write("\n");
          reject(new Error("Aborted."));
          return;
        }
        if (ch === DEL || ch === BS) {
          buf = buf.slice(0, -1);
          continue;
        }
        if (ch >= " ") buf += ch;
      }
    };
    stdin.on("data", onData);
  });
}
