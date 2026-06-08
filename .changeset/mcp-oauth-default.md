---
"@senderkit/cli": minor
---

`senderkit mcp install` now defaults to the **hosted** MCP endpoint
(`https://mcp.senderkit.com`) over **OAuth**, matching the configs shipped by the
`senderkit-skills` plugin. A `url`-only entry is written with no credential on
disk; the client drives sign-in (Claude Code `/mcp`, Cursor → Settings → MCP,
`codex mcp login senderkit`).

**Behavior change:** previously the default wrote a local stdio server
(`senderkit mcp` subprocess + `SENDERKIT_API_KEY`). To keep that, pass the new
`--local` flag.

- `--local` opts into the local stdio subprocess.
- `--api-key-auth` opts into bearer-token auth for the hosted endpoint
  (`Authorization: Bearer …`, or `bearer_token_env_var` for Codex) instead of OAuth.
- `--remote` is still accepted (now the default) for back-compat; `--url` sets a
  custom endpoint.
- **Codex** remote installs now write a native streamable-HTTP `url` entry
  instead of routing through the `mcp-remote` stdio bridge — Codex's native
  remote MCP support is stable and OAuth-capable.
- API: `oauthRemoteSpec()` and `apiKeyRemoteSpec()` replace the single
  `remoteSpec()` (kept as a back-compat alias for the API-key form); added
  `isApiKeyAuth()` and the `RemoteSpec.bearerEnvVar` field.
