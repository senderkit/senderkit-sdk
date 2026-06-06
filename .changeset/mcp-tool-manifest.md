---
"@senderkit/sdk": minor
"@senderkit/cli": patch
---

Add `@senderkit/sdk/mcp`: a canonical MCP tool manifest (name, title, base
description, annotations, input schema) shared by the CLI and the app-hosted
server. CLI commands now derive their tool metadata from it, so tool
names/titles/descriptions/annotations no longer drift between surfaces.
