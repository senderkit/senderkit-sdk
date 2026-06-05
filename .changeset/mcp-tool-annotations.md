---
"@senderkit/cli": minor
---

Add MCP tool annotations required by the Anthropic Claude Connectors Directory.

- Every MCP tool now declares a human-readable `title` and exactly one behaviour hint (`readOnlyHint` or `destructiveHint`), surfaced through `tools/list` on both the CLI-bundled stdio server and the app-hosted HTTP server.
- `Command` gains `title` and a `ToolAnnotations` union typed so a tool is declared as either read-only or destructive — never both, never neither (enforced at compile time).
- Read-only: `senderkit_context`, `senderkit_messages_list`, `senderkit_messages_get`, `senderkit_templates_list`, `senderkit_templates_get`. Destructive: `senderkit_send`, `senderkit_send_raw`, `senderkit_cancel_message`.
