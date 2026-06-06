---
"@senderkit/sdk": minor
"@senderkit/cli": patch
---

Add `@senderkit/sdk/mcp`: a canonical MCP tool manifest (name, title, base
description, annotations, input schema) shared by the CLI and the app-hosted
server. CLI commands now derive their tool metadata from it, so tool
names/titles/descriptions/annotations no longer drift between surfaces.

`@senderkit/sdk/mcp` is now the single MCP entry point — it re-exports the input
shapes and `SEND_TOOL_LIVE_MODE_NOTE`. **Breaking:** the `@senderkit/sdk/mcp-schemas`
subpath has been removed; import those from `@senderkit/sdk/mcp` instead.
