import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";
import {
  apiKeyRemoteSpec,
  CLIENT_IDS,
  claudeAddArgs,
  claudeAddArgsRemote,
  DEFAULT_REMOTE_URL,
  install,
  oauthRemoteSpec,
  printSnippet,
  remoteSpec,
  serverBlock,
  type Runner,
} from "../src/mcp/install";

function freshHome(): string {
  return mkdtempSync(join(tmpdir(), "sk-home-"));
}

describe("serverBlock", () => {
  it("embeds the key when provided", () => {
    expect(serverBlock("sk_test_abc").env["SENDERKIT_API_KEY"]).toBe("sk_test_abc");
  });
  it("uses a placeholder when no key", () => {
    expect(serverBlock().env["SENDERKIT_API_KEY"]).toBe("${SENDERKIT_API_KEY}");
  });
});

describe("install — mcpServers-style clients", () => {
  it("creates a cursor config", () => {
    const home = freshHome();
    const [r] = install({ client: "cursor", apiKey: "sk_test_abc", home });
    expect(r!.created).toBe(true);
    const written = JSON.parse(readFileSync(join(home, ".cursor", "mcp.json"), "utf8"));
    expect(written.mcpServers.senderkit).toEqual({
      command: "senderkit",
      args: ["mcp"],
      env: { SENDERKIT_API_KEY: "sk_test_abc" },
    });
  });

  it("preserves existing servers and JSONC comments", () => {
    const home = freshHome();
    mkdirSync(join(home, ".cursor"));
    writeFileSync(
      join(home, ".cursor", "mcp.json"),
      '{\n  // keep me\n  "mcpServers": { "other": { "command": "x" } }\n}\n',
    );
    install({ client: "cursor", home });
    const raw = readFileSync(join(home, ".cursor", "mcp.json"), "utf8");
    expect(raw).toContain("// keep me");
    const written = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, ""));
    expect(written.mcpServers.other).toEqual({ command: "x" });
    expect(written.mcpServers.senderkit).toBeDefined();
  });

  it("writes windsurf to mcp_config.json", () => {
    const home = freshHome();
    install({ client: "windsurf", apiKey: "k", home });
    const written = JSON.parse(
      readFileSync(join(home, ".codeium", "windsurf", "mcp_config.json"), "utf8"),
    );
    expect(written.mcpServers.senderkit.args).toEqual(["mcp"]);
  });
});

describe("install — per-schema clients", () => {
  it("vscode uses the `servers` key with type stdio", () => {
    const home = freshHome();
    install({ client: "vscode", apiKey: "k", home });
    const path =
      process.platform === "darwin"
        ? join(home, "Library", "Application Support", "Code", "User", "mcp.json")
        : join(home, ".config", "Code", "User", "mcp.json");
    const written = JSON.parse(readFileSync(path, "utf8"));
    expect(written.servers.senderkit).toMatchObject({
      type: "stdio",
      command: "senderkit",
      args: ["mcp"],
    });
  });

  it("zed uses the `context_servers` key", () => {
    const home = freshHome();
    install({ client: "zed", apiKey: "k", home });
    const written = JSON.parse(
      readFileSync(join(home, ".config", "zed", "settings.json"), "utf8"),
    );
    expect(written.context_servers.senderkit).toMatchObject({ command: "senderkit", args: ["mcp"] });
  });

  it("opencode uses the `mcp` key with command array and environment", () => {
    const home = freshHome();
    install({ client: "opencode", apiKey: "k", home });
    const written = JSON.parse(
      readFileSync(join(home, ".config", "opencode", "opencode.json"), "utf8"),
    );
    expect(written.mcp.senderkit).toMatchObject({
      type: "local",
      command: ["senderkit", "mcp"],
      enabled: true,
      environment: { SENDERKIT_API_KEY: "k" },
    });
  });

  it("codex writes a [mcp_servers.senderkit] TOML table", () => {
    const home = freshHome();
    install({ client: "codex", apiKey: "k", home });
    const parsed = parseToml(readFileSync(join(home, ".codex", "config.toml"), "utf8")) as any;
    expect(parsed.mcp_servers.senderkit.command).toBe("senderkit");
    expect(parsed.mcp_servers.senderkit.args).toEqual(["mcp"]);
    expect(parsed.mcp_servers.senderkit.env.SENDERKIT_API_KEY).toBe("k");
  });

  it("codex preserves existing tables", () => {
    const home = freshHome();
    mkdirSync(join(home, ".codex"));
    writeFileSync(join(home, ".codex", "config.toml"), 'model = "gpt-5"\n');
    install({ client: "codex", home });
    const parsed = parseToml(readFileSync(join(home, ".codex", "config.toml"), "utf8")) as any;
    expect(parsed.model).toBe("gpt-5");
    expect(parsed.mcp_servers.senderkit).toBeDefined();
  });
});

describe("install — detection for 'all'", () => {
  it("writes nothing under a fresh home", () => {
    expect(install({ client: "all", home: freshHome() })).toHaveLength(0);
  });

  it("writes only to detected clients", () => {
    const home = freshHome();
    mkdirSync(join(home, ".cursor"));
    mkdirSync(join(home, ".codex"));
    const results = install({ client: "all", home });
    expect(results.map((r) => r.id).sort()).toEqual(["codex", "cursor"]);
  });
});

describe("claude code hybrid", () => {
  it("builds claude mcp add args; --env only for a concrete key", () => {
    expect(claudeAddArgs(serverBlock("sk_test_abc"))).toEqual([
      "mcp", "add", "senderkit", "--scope", "user",
      "--env", "SENDERKIT_API_KEY=sk_test_abc", "--", "senderkit", "mcp",
    ]);
    expect(claudeAddArgs(serverBlock())).toEqual([
      "mcp", "add", "senderkit", "--scope", "user", "--", "senderkit", "mcp",
    ]);
  });

  it("uses the claude CLI when available (no file written)", () => {
    const home = freshHome();
    const runner: Runner = { which: () => true, run: () => ({ ok: true, stderr: "" }) };
    const [r] = install({ client: "claude-code", apiKey: "k", home, runner });
    expect(r!.method).toBe("claude-cli");
    expect(existsSync(join(home, ".claude.json"))).toBe(false);
  });

  it("falls back to a file write when the CLI is missing or fails", () => {
    const home = freshHome();
    const runner: Runner = { which: () => false, run: () => ({ ok: false, stderr: "" }) };
    const [r] = install({ client: "claude-code", apiKey: "k", home, runner });
    expect(r!.method).toBe("file");
    const written = JSON.parse(readFileSync(join(home, ".claude.json"), "utf8"));
    expect(written.mcpServers.senderkit).toBeDefined();
  });
});

describe("printSnippet", () => {
  it("renders the per-client schema from scratch", () => {
    const snip = printSnippet("codex", serverBlock("k"));
    expect(snip.format).toBe("toml");
    expect(snip.content).toContain("[mcp_servers.senderkit]");
  });

  it("covers every client id", () => {
    for (const id of CLIENT_IDS) {
      expect(printSnippet(id, serverBlock("k")).content.length).toBeGreaterThan(0);
    }
  });
});

describe("remote install — OAuth (default)", () => {
  it("oauthRemoteSpec is url-only with no headers", () => {
    const spec = oauthRemoteSpec();
    expect(spec.url).toBe(DEFAULT_REMOTE_URL);
    expect(spec.headers).toEqual({});
    expect(spec.bearerEnvVar).toBeUndefined();
  });

  it("native clients get a url-only entry (no credential)", () => {
    const home = freshHome();
    install({ client: "cursor", home, remote: oauthRemoteSpec() });
    const written = JSON.parse(readFileSync(join(home, ".cursor", "mcp.json"), "utf8"));
    expect(written.mcpServers.senderkit).toEqual({ url: DEFAULT_REMOTE_URL });
    expect(written.mcpServers.senderkit.headers).toBeUndefined();
  });

  it("claude-code (file fallback) writes type:http url-only", () => {
    const home = freshHome();
    const runner: Runner = { which: () => false, run: () => ({ ok: false, stderr: "" }) };
    install({ client: "claude-code", home, runner, remote: oauthRemoteSpec() });
    const written = JSON.parse(readFileSync(join(home, ".claude.json"), "utf8"));
    expect(written.mcpServers.senderkit).toEqual({ type: "http", url: DEFAULT_REMOTE_URL });
  });

  it("codex writes a native streamable-HTTP url (no bridge, no token)", () => {
    const home = freshHome();
    install({ client: "codex", home, remote: oauthRemoteSpec() });
    const parsed = parseToml(readFileSync(join(home, ".codex", "config.toml"), "utf8")) as any;
    expect(parsed.mcp_servers.senderkit.url).toBe(DEFAULT_REMOTE_URL);
    expect(parsed.mcp_servers.senderkit.command).toBeUndefined();
    expect(parsed.mcp_servers.senderkit.bearer_token_env_var).toBeUndefined();
  });

  it("claudeAddArgsRemote omits --header in OAuth mode", () => {
    const args = claudeAddArgsRemote(oauthRemoteSpec("https://mcp.senderkit.com"));
    expect(args).toEqual([
      "mcp", "add", "senderkit", "--scope", "user", "--transport", "http",
      "https://mcp.senderkit.com",
    ]);
  });
});

describe("remote install — API key (opt-in)", () => {
  it("apiKeyRemoteSpec carries a bearer header and env-var name", () => {
    const spec = apiKeyRemoteSpec("sk_live_x");
    expect(spec.url).toBe(DEFAULT_REMOTE_URL);
    expect(spec.headers.Authorization).toBe("Bearer sk_live_x");
    expect(spec.bearerEnvVar).toBe("SENDERKIT_API_KEY");
  });

  it("remoteSpec stays a back-compat alias for apiKeyRemoteSpec", () => {
    expect(remoteSpec("k").headers.Authorization).toBe("Bearer k");
  });

  it("native clients get url + bearer headers", () => {
    const home = freshHome();
    install({ client: "cursor", home, remote: apiKeyRemoteSpec("sk_test_abc") });
    const written = JSON.parse(readFileSync(join(home, ".cursor", "mcp.json"), "utf8"));
    expect(written.mcpServers.senderkit).toEqual({
      url: DEFAULT_REMOTE_URL,
      headers: { Authorization: "Bearer sk_test_abc" },
    });
  });

  it("vscode uses type:http for remote", () => {
    const home = freshHome();
    install({ client: "vscode", home, remote: apiKeyRemoteSpec("k") });
    const path =
      process.platform === "darwin"
        ? join(home, "Library", "Application Support", "Code", "User", "mcp.json")
        : join(home, ".config", "Code", "User", "mcp.json");
    expect(JSON.parse(readFileSync(path, "utf8")).servers.senderkit.type).toBe("http");
  });

  it("opencode uses type:remote for remote", () => {
    const home = freshHome();
    install({ client: "opencode", home, remote: apiKeyRemoteSpec("k") });
    const written = JSON.parse(
      readFileSync(join(home, ".config", "opencode", "opencode.json"), "utf8"),
    );
    expect(written.mcp.senderkit).toMatchObject({ type: "remote", url: DEFAULT_REMOTE_URL });
  });

  it("codex writes a native url + bearer_token_env_var (no bridge)", () => {
    const home = freshHome();
    install({ client: "codex", home, remote: apiKeyRemoteSpec("k") });
    const parsed = parseToml(readFileSync(join(home, ".codex", "config.toml"), "utf8")) as any;
    expect(parsed.mcp_servers.senderkit.url).toBe(DEFAULT_REMOTE_URL);
    expect(parsed.mcp_servers.senderkit.bearer_token_env_var).toBe("SENDERKIT_API_KEY");
    expect(parsed.mcp_servers.senderkit.command).toBeUndefined();
  });

  it("bridge clients (claude-desktop) get an npx mcp-remote command with header", () => {
    const home = freshHome();
    install({ client: "claude-desktop", home, remote: apiKeyRemoteSpec("sk_test_abc") });
    const path = join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
    // darwin path; on Linux the file lands elsewhere, so guard.
    if (existsSync(path)) {
      const e = JSON.parse(readFileSync(path, "utf8")).mcpServers.senderkit;
      expect(e.command).toBe("npx");
      expect(e.args).toContain("mcp-remote");
      expect(e.args).toContain("Authorization: Bearer sk_test_abc");
    }
  });

  it("claudeAddArgsRemote builds an http transport command with --header", () => {
    const args = claudeAddArgsRemote(apiKeyRemoteSpec("sk_test_abc", "https://mcp.senderkit.com"));
    expect(args).toEqual([
      "mcp", "add", "senderkit", "--scope", "user", "--transport", "http",
      "https://mcp.senderkit.com", "--header", "Authorization: Bearer sk_test_abc",
    ]);
  });
});
