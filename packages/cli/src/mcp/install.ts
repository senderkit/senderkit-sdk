import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { applyEdits, modify } from "jsonc-parser";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";

export type ClientId =
  | "claude-code"
  | "claude-desktop"
  | "cursor"
  | "windsurf"
  | "vscode"
  | "zed"
  | "codex"
  | "opencode";

/** Canonical stdio server description; adapters reshape it per client. */
export interface ServerBlock {
  command: string;
  args: string[];
  env: Record<string, string>;
}

export const SERVER_NAME = "senderkit";

/** Default hosted SenderKit MCP endpoint. */
export const DEFAULT_REMOTE_URL = "https://mcp.senderkit.com";

/** Env var name the hosted server reads for API-key (bearer) auth. */
export const API_KEY_ENV_VAR = "SENDERKIT_API_KEY";

/**
 * A remote (hosted) MCP server. `headers` is empty in OAuth mode — the client
 * performs the OAuth handshake itself and no credential is written to disk.
 * `bearerEnvVar` is set only in API-key mode, for clients (Codex) that
 * reference the token by env-var name rather than via an HTTP header.
 */
export interface RemoteSpec {
  url: string;
  headers: Record<string, string>;
  bearerEnvVar?: string;
}

/** True when this spec carries static API-key auth (vs. OAuth). */
export function isApiKeyAuth(remote: RemoteSpec): boolean {
  return Object.keys(remote.headers).length > 0 || remote.bearerEnvVar !== undefined;
}

/** The base server block. Embeds a concrete key or a placeholder. */
export function serverBlock(apiKey?: string): ServerBlock {
  return {
    command: "senderkit",
    args: ["mcp"],
    env: { SENDERKIT_API_KEY: apiKey ?? "${SENDERKIT_API_KEY}" },
  };
}

/**
 * OAuth remote: `url` only, no committed credential. This is the default and
 * matches the shapes shipped by the senderkit-skills plugin manifests; the
 * client drives the OAuth sign-in on first use.
 */
export function oauthRemoteSpec(url: string = DEFAULT_REMOTE_URL): RemoteSpec {
  return { url, headers: {} };
}

/** API-key remote: authenticate with a bearer token (header / env var). Opt-in. */
export function apiKeyRemoteSpec(apiKey?: string, url: string = DEFAULT_REMOTE_URL): RemoteSpec {
  return {
    url,
    headers: { Authorization: `Bearer ${apiKey ?? `\${${API_KEY_ENV_VAR}}`}` },
    bearerEnvVar: API_KEY_ENV_VAR,
  };
}

/**
 * @deprecated Use {@link apiKeyRemoteSpec} (API-key auth) or
 * {@link oauthRemoteSpec} (OAuth, the default). Retained for back-compat.
 */
export const remoteSpec = apiKeyRemoteSpec;

type Format = "json" | "toml";

interface ClientAdapter {
  id: ClientId;
  label: string;
  format: Format;
  path(home: string): string;
  detect(home: string): boolean;
  /** Produce updated file contents for a local stdio server ("" if new). */
  render(existingText: string, block: ServerBlock): string;
  /** Produce updated file contents pointing at a remote MCP endpoint. */
  renderRemote(existingText: string, remote: RemoteSpec): string;
}

function appData(home: string): string {
  return process.env["APPDATA"] ?? join(home, "AppData", "Roaming");
}

function claudeDesktopPath(home: string): string {
  switch (platform()) {
    case "darwin":
      return join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
    case "win32":
      return join(appData(home), "Claude", "claude_desktop_config.json");
    default:
      return join(home, ".config", "Claude", "claude_desktop_config.json");
  }
}

function vscodeUserPath(home: string): string {
  switch (platform()) {
    case "darwin":
      return join(home, "Library", "Application Support", "Code", "User", "mcp.json");
    case "win32":
      return join(appData(home), "Code", "User", "mcp.json");
    default:
      return join(home, ".config", "Code", "User", "mcp.json");
  }
}

/** Surgically set a nested key in JSON/JSONC text, preserving comments/format. */
function renderJson(text: string, path: (string | number)[], value: unknown): string {
  const source = text.trim() === "" ? "{}" : text;
  const edits = modify(source, path, value, {
    formattingOptions: { insertSpaces: true, tabSize: 2 },
  });
  let out = applyEdits(source, edits);
  if (!out.endsWith("\n")) out += "\n";
  return out;
}

/** Set `mcp_servers.senderkit` in TOML text (normalizes formatting). */
function renderTomlServer(text: string, value: unknown): string {
  const obj = (text.trim() ? parseToml(text) : {}) as Record<string, unknown>;
  const servers = (obj["mcp_servers"] as Record<string, unknown>) ?? {};
  servers[SERVER_NAME] = value;
  obj["mcp_servers"] = servers;
  return `${stringifyToml(obj)}\n`;
}

/** Shared `{ command, args, env }` entry used by mcpServers-style clients. */
function mcpServersEntry(block: ServerBlock) {
  return { command: block.command, args: block.args, env: block.env };
}

/** Flatten headers into repeated `--header "K: V"` CLI args. */
function headerArgs(headers: Record<string, string>): string[] {
  return Object.entries(headers).flatMap(([k, v]) => ["--header", `${k}: ${v}`]);
}

/**
 * Attach `headers` to a remote config entry only when non-empty. In OAuth mode
 * `remote.headers` is `{}`, so the written config is `url`-only — no credential
 * key — matching the plugin manifests.
 */
function withHeaders<T extends object>(base: T, remote: RemoteSpec): T {
  return Object.keys(remote.headers).length > 0 ? { ...base, headers: remote.headers } : base;
}

/**
 * A stdio→remote bridge entry via `npx mcp-remote`, for clients that lack
 * first-class remote MCP support. Shaped like a normal command server.
 */
function bridgeEntry(remote: RemoteSpec) {
  return {
    command: "npx",
    args: ["-y", "mcp-remote", remote.url, ...headerArgs(remote.headers)],
  };
}

const ADAPTERS: ClientAdapter[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    format: "json",
    path: (home) => join(home, ".claude.json"),
    detect: (home) => existsSync(join(home, ".claude.json")) || existsSync(join(home, ".claude")),
    render: (text, block) => renderJson(text, ["mcpServers", SERVER_NAME], mcpServersEntry(block)),
    renderRemote: (text, remote) =>
      renderJson(
        text,
        ["mcpServers", SERVER_NAME],
        withHeaders({ type: "http", url: remote.url }, remote),
      ),
  },
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    format: "json",
    path: claudeDesktopPath,
    detect: (home) => existsSync(dirname(claudeDesktopPath(home))),
    render: (text, block) => renderJson(text, ["mcpServers", SERVER_NAME], mcpServersEntry(block)),
    // No native remote support → stdio bridge.
    renderRemote: (text, remote) =>
      renderJson(text, ["mcpServers", SERVER_NAME], bridgeEntry(remote)),
  },
  {
    id: "cursor",
    label: "Cursor",
    format: "json",
    path: (home) => join(home, ".cursor", "mcp.json"),
    detect: (home) =>
      existsSync(join(home, ".cursor", "mcp.json")) || existsSync(join(home, ".cursor")),
    render: (text, block) => renderJson(text, ["mcpServers", SERVER_NAME], mcpServersEntry(block)),
    renderRemote: (text, remote) =>
      renderJson(text, ["mcpServers", SERVER_NAME], withHeaders({ url: remote.url }, remote)),
  },
  {
    id: "windsurf",
    label: "Windsurf",
    format: "json",
    path: (home) => join(home, ".codeium", "windsurf", "mcp_config.json"),
    detect: (home) => existsSync(join(home, ".codeium", "windsurf")),
    render: (text, block) => renderJson(text, ["mcpServers", SERVER_NAME], mcpServersEntry(block)),
    // Remote support is uneven → stdio bridge.
    renderRemote: (text, remote) =>
      renderJson(text, ["mcpServers", SERVER_NAME], bridgeEntry(remote)),
  },
  {
    id: "vscode",
    label: "VS Code",
    format: "json",
    path: vscodeUserPath,
    detect: (home) => existsSync(dirname(vscodeUserPath(home))),
    render: (text, block) =>
      renderJson(text, ["servers", SERVER_NAME], {
        type: "stdio",
        command: block.command,
        args: block.args,
        env: block.env,
      }),
    renderRemote: (text, remote) =>
      renderJson(
        text,
        ["servers", SERVER_NAME],
        withHeaders({ type: "http", url: remote.url }, remote),
      ),
  },
  {
    id: "zed",
    label: "Zed",
    format: "json",
    path: (home) => join(home, ".config", "zed", "settings.json"),
    detect: (home) => existsSync(join(home, ".config", "zed")),
    render: (text, block) =>
      renderJson(text, ["context_servers", SERVER_NAME], mcpServersEntry(block)),
    renderRemote: (text, remote) =>
      renderJson(text, ["context_servers", SERVER_NAME], withHeaders({ url: remote.url }, remote)),
  },
  {
    id: "codex",
    label: "Codex",
    format: "toml",
    path: (home) => join(home, ".codex", "config.toml"),
    detect: (home) => existsSync(join(home, ".codex")),
    render: (text, block) =>
      renderTomlServer(text, { command: block.command, args: block.args, env: block.env }),
    // Codex has stable native streamable-HTTP MCP support with OAuth
    // (`codex mcp login senderkit`). Write the native `url` entry; in API-key
    // mode add `bearer_token_env_var` rather than an HTTP header.
    renderRemote: (text, remote) =>
      renderTomlServer(text, {
        url: remote.url,
        ...(remote.bearerEnvVar ? { bearer_token_env_var: remote.bearerEnvVar } : {}),
      }),
  },
  {
    id: "opencode",
    label: "opencode",
    format: "json",
    path: (home) => join(home, ".config", "opencode", "opencode.json"),
    detect: (home) => existsSync(join(home, ".config", "opencode")),
    render: (text, block) =>
      renderJson(text, ["mcp", SERVER_NAME], {
        type: "local",
        command: [block.command, ...block.args],
        enabled: true,
        environment: block.env,
      }),
    renderRemote: (text, remote) =>
      renderJson(
        text,
        ["mcp", SERVER_NAME],
        withHeaders({ type: "remote", url: remote.url, enabled: true }, remote),
      ),
  },
];

export const CLIENT_IDS = ADAPTERS.map((a) => a.id);

export function getAdapter(id: ClientId): ClientAdapter {
  const adapter = ADAPTERS.find((a) => a.id === id);
  if (!adapter) throw new Error(`Unknown client "${id}".`);
  return adapter;
}

export type InstallMethod = "file" | "claude-cli";

export interface InstallResult {
  id: ClientId;
  label: string;
  path: string;
  method: InstallMethod;
  created: boolean;
  command?: string;
}

function writeFileWith(
  adapter: ClientAdapter,
  home: string,
  render: (text: string) => string,
): InstallResult {
  const path = adapter.path(home);
  const created = !existsSync(path);
  const text = created ? "" : readFileSync(path, "utf8");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, render(text));
  return { id: adapter.id, label: adapter.label, path, method: "file", created };
}

/** Build the `claude mcp add` argument list for a local stdio server. */
export function claudeAddArgs(block: ServerBlock): string[] {
  const args = ["mcp", "add", SERVER_NAME, "--scope", "user"];
  const key = block.env["SENDERKIT_API_KEY"];
  if (key && !key.includes("${")) args.push("--env", `SENDERKIT_API_KEY=${key}`);
  args.push("--", block.command, ...block.args);
  return args;
}

/** Build the `claude mcp add` argument list for a remote HTTP server. */
export function claudeAddArgsRemote(remote: RemoteSpec): string[] {
  return [
    "mcp", "add", SERVER_NAME, "--scope", "user", "--transport", "http",
    remote.url, ...headerArgs(remote.headers),
  ];
}

export interface Runner {
  which(command: string): boolean;
  run(command: string, args: string[]): { ok: boolean; stderr: string };
}

export const defaultRunner: Runner = {
  which: (command) =>
    spawnSync(platform() === "win32" ? "where" : "which", [command]).status === 0,
  run: (command, args) => {
    const r = spawnSync(command, args, { encoding: "utf8" });
    return { ok: r.status === 0, stderr: r.stderr ?? "" };
  },
};

/**
 * Configure Claude Code. Prefers `claude mcp add` when the `claude` binary is
 * present; falls back to writing `~/.claude.json` (the file merge is idempotent).
 */
function installClaudeCode(
  adapter: ClientAdapter,
  home: string,
  runner: Runner,
  render: (text: string) => string,
  remote: RemoteSpec | undefined,
): InstallResult {
  if (runner.which("claude")) {
    const args = remote ? claudeAddArgsRemote(remote) : claudeAddArgs(serverBlock());
    if (runner.run("claude", args).ok) {
      return {
        id: adapter.id,
        label: adapter.label,
        path: adapter.path(home),
        method: "claude-cli",
        created: false,
        command: `claude ${args.join(" ")}`,
      };
    }
  }
  return writeFileWith(adapter, home, render);
}

export interface InstallOptions {
  client: ClientId | "all";
  apiKey?: string;
  home?: string;
  runner?: Runner;
  /** When set, point clients at this remote endpoint instead of a local command. */
  remote?: RemoteSpec;
}

/**
 * Install the MCP server config into the requested client(s).
 * For "all", only writes to clients that appear installed.
 */
export function install(options: InstallOptions): InstallResult[] {
  const home = options.home ?? homedir();
  const runner = options.runner ?? defaultRunner;
  const block = serverBlock(options.apiKey);
  const selected =
    options.client === "all"
      ? ADAPTERS.filter((a) => a.detect(home))
      : ADAPTERS.filter((a) => a.id === options.client);
  return selected.map((adapter) => {
    const render = options.remote
      ? (text: string) => adapter.renderRemote(text, options.remote!)
      : (text: string) => adapter.render(text, block);
    return adapter.id === "claude-code"
      ? installClaudeCode(adapter, home, runner, render, options.remote)
      : writeFileWith(adapter, home, render);
  });
}

/** Render a client's config snippet from scratch, for `--print`. */
export function printSnippet(
  client: ClientId,
  block: ServerBlock,
  remote?: RemoteSpec,
): { path: string; format: Format; content: string } {
  const adapter = getAdapter(client);
  return {
    path: adapter.path(homedir()),
    format: adapter.format,
    content: remote ? adapter.renderRemote("", remote) : adapter.render("", block),
  };
}
