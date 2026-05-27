import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

export interface SenderKitConfig {
  apiKey?: string;
  baseUrl?: string;
}

export const CONFIG_KEYS = ["apiKey", "baseUrl"] as const;
export type ConfigKey = (typeof CONFIG_KEYS)[number];

export function configDir(): string {
  return join(homedir(), ".senderkit");
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

export function readConfig(): SenderKitConfig {
  const path = configPath();
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (parsed && typeof parsed === "object") return parsed as SenderKitConfig;
    return {};
  } catch {
    return {};
  }
}

export function writeConfig(config: SenderKitConfig): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  // Ensure perms even if the file already existed with looser bits.
  chmodSync(path, 0o600);
}

export function setConfigValue(key: ConfigKey, value: string): SenderKitConfig {
  const config = readConfig();
  config[key] = value;
  writeConfig(config);
  return config;
}

/** Mask an API key for display, keeping the mode prefix recognizable. */
export function maskKey(key: string): string {
  if (key.length <= 12) return "****";
  return `${key.slice(0, 11)}…${key.slice(-4)}`;
}
