---
"@senderkit/sdk": patch
"@senderkit/cli": patch
---

Point the default REST base URL at the dedicated `api.senderkit.com` host

The SDK (and the CLI, which inherits the SDK default) now default `baseUrl` to
`https://api.senderkit.com` instead of `https://senderkit.com/api`.

SenderKit now serves the public REST API from a dedicated host that exposes the
clean `/v1/*` surface, so `senderkit.send(...)` hits
`https://api.senderkit.com/v1/send`. This matches the OpenAPI spec's canonical
server and every published HTTP sample. The dedicated host also avoids the
apex→www canonicalization redirect that strips the `Authorization` header on
cross-host requests.

The CLI's hosted MCP default is also corrected from
`https://mcp.senderkit.com/mcp` to `https://mcp.senderkit.com`. On the new
dedicated MCP host the subdomain root *is* the endpoint — any other path
(including `/mcp`) returns 404 — so the old default would have failed.

No code changes are required for callers that pass an explicit `baseUrl` or
`--url`.
