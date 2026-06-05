# @senderkit/cli

[![npm version](https://img.shields.io/npm/v/@senderkit/cli)](https://www.npmjs.com/package/@senderkit/cli)
[![CI](https://github.com/senderkit/senderkit-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/senderkit/senderkit-sdk/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/senderkit/senderkit-sdk/branch/main/graph/badge.svg)](https://codecov.io/gh/senderkit/senderkit-sdk)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/senderkit/senderkit-sdk/badge)](https://scorecard.dev/viewer/?uri=github.com/senderkit/senderkit-sdk)

The SenderKit command-line interface and MCP server. Send transactional
notifications and inspect templates/messages from your terminal — or let an AI
assistant (Claude Code, Claude Desktop, Cursor) do it over MCP.

Both surfaces are generated from a single command registry built on
[`@senderkit/sdk`](../sdk), so the CLI and the MCP tools never drift.

## Install

```bash
npm install -g @senderkit/cli
# or run without installing
npx @senderkit/cli --help
```

## Authentication

The API key is resolved in this order:

1. `--api-key <key>` flag
2. `SENDERKIT_API_KEY` environment variable
3. `~/.senderkit/config.json` (written by `senderkit login` or `config set`)

```bash
senderkit login                      # prompts, verifies, and saves the key
senderkit config set apiKey sk_live_…
senderkit config list                # API key shown masked
```

Mode (live vs test) is derived from the key prefix — `sk_live_…` or `sk_test_…`.

## Commands

```bash
senderkit send <template> <to> [--vars '{…}'] [--channel email|sms|push|web-push] \
                               [--version N] [--metadata '{…}'] [--idempotency-key K]

senderkit send-raw <to> --channel email --subject "Hi" --html "<p>…</p>" [--text …] [--from …]
senderkit send-raw <to> --channel sms --body "Your code is 123456"
senderkit send-raw <to> --channel push --title "Shipped" --body "…" [--badge 1] [--push-data '{…}']
senderkit send-raw '<subscription-json>' --channel web-push --title "Back in stock" --body "…" \
                                          [--icon https://…] [--click-url https://…] [--push-data '{…}']

senderkit templates list
senderkit templates get <slug>

senderkit messages list [--status delivered] [--channel email] [--template welcome] [--limit 50] [--cursor …]
senderkit messages get <id>
senderkit messages cancel <id>

senderkit context   # report the active connection's live/test mode
```

Global flags: `--api-key`, `--base-url`, and `--json` (emit raw JSON instead of
human-readable output, for scripting and CI).

```bash
senderkit templates list --json | jq '.[].slug'
```

## MCP server

`senderkit mcp` runs the server over stdio. Each command is exposed as a tool:
`senderkit_send`, `senderkit_send_raw`, `senderkit_templates_list`,
`senderkit_templates_get`, `senderkit_messages_list`, `senderkit_messages_get`,
`senderkit_cancel_message`, and `senderkit_context` (reports the active
live/test mode; `senderkit_send` / `senderkit_send_raw` results also carry a
`mode` field).

Auto-configure your client:

```bash
senderkit mcp install                       # all detected clients
senderkit mcp install --client cursor       # a specific client
senderkit mcp install --client codex --print  # print the config to paste manually
```

Supported clients (each detected by its config directory, and written in its own
schema):

| Client | Config | Notes |
| --- | --- | --- |
| Claude Code | `claude mcp add` / `~/.claude.json` | Uses the `claude` CLI when present |
| Claude Desktop | `claude_desktop_config.json` | `mcpServers` |
| Cursor | `~/.cursor/mcp.json` | `mcpServers` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | `mcpServers` |
| VS Code | `…/Code/User/mcp.json` | `servers` (`type: "stdio"`) |
| Zed | `~/.config/zed/settings.json` | `context_servers` |
| Codex | `~/.codex/config.toml` | TOML `[mcp_servers.senderkit]` |
| opencode | `~/.config/opencode/opencode.json` | `mcp` (`type: "local"`) |

Existing config is edited surgically — comments and other servers are preserved.
If no key is configured, a `${SENDERKIT_API_KEY}` placeholder is written, and you
supply the key via the environment instead.

### Remote MCP

Instead of spawning the local process, clients can connect to a hosted SenderKit
MCP endpoint over HTTP. Add `--remote` to `install`:

```bash
senderkit mcp install --remote                       # default https://mcp.senderkit.com
senderkit mcp install --remote --url https://my-host/mcp --client cursor
```

The API key travels per request in an `Authorization: Bearer sk_…` header.
Clients with first-class remote support (Claude Code, Cursor, VS Code, Zed,
opencode) get a native URL entry; the rest (Claude Desktop, Windsurf, Codex) are
wired through the [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) stdio
bridge automatically.

### Self-hosting the server

`senderkit mcp --http` serves the same tools over Streamable HTTP instead of
stdio, authenticating each request from its `Authorization: Bearer` header (one
process serves every caller):

```bash
senderkit mcp --http --port 3000 --path /mcp
```

Requests without a bearer token get `401`; this is the building block for a
hosted deployment.

## License

MIT
