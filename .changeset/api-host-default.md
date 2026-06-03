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

No code changes are required for callers that pass an explicit `baseUrl`. The
MCP server default already targets `https://mcp.senderkit.com/mcp` and is
unchanged.
