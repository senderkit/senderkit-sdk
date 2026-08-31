---
"@senderkit/cli": minor
"@senderkit/sdk": patch
---

The CLI-bundled MCP server (stdio and HTTP) now declares an `outputSchema` on
every tool and returns conforming `structuredContent`, bringing it to parity
with the hosted server. MCP clients get a JSON Schema for each tool's result via
`tools/list` and a validated structured result on every call. Results are
projected through the shared manifest schemas, so internal-only fields are
dropped and the two servers stay field-for-field identical.

The `@senderkit/sdk` change is documentation only: the `McpToolSpec.outputSchema`
comment now reflects that the CLI-bundled server declares the schema too.
