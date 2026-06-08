---
"@senderkit/cli": minor
---

`senderkit mcp install --remote` now defaults to **OAuth** instead of an API
key, matching the configs shipped by the `senderkit-skills` plugin. A `url`-only
entry is written with no credential on disk; the client drives sign-in (Claude
Code `/mcp`, Cursor → Settings → MCP, `codex mcp login senderkit`).

- New `--api-key-auth` flag opts back into bearer-token auth (`Authorization:
  Bearer …`, or `bearer_token_env_var` for Codex) for remote installs.
- **Codex** remote installs now write a native streamable-HTTP `url` entry
  instead of routing through the `mcp-remote` stdio bridge — Codex's native
  remote MCP support is stable and OAuth-capable.
- API: `oauthRemoteSpec()` and `apiKeyRemoteSpec()` replace the single
  `remoteSpec()` (kept as a back-compat alias for the API-key form); added
  `isApiKeyAuth()` and the `RemoteSpec.bearerEnvVar` field.

Local stdio installs (`senderkit mcp install` with no `--remote`) are unchanged.
