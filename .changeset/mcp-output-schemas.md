---
"@senderkit/sdk": minor
---

Add an `outputSchema` to every MCP manifest tool (`McpToolSpec.outputSchema`, plus the matching `*Output` Zod shapes exported from `@senderkit/sdk/mcp`) describing each tool's structured result, so servers can advertise it via `tools/list` and return conforming `structuredContent` per the MCP 2025-06-18 spec. The shapes mirror the v1 REST responses the tools wrap, minus internal identifiers. Also exports the `TEMPLATE_STATUSES`, `INBOUND_MESSAGE_STATUSES`, `INBOUND_DOMAIN_KINDS`, and `INBOUND_DOMAIN_STATUSES` enums the shapes use.
