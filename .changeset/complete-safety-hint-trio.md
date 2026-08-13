---
"@senderkit/sdk": minor
"@senderkit/cli": minor
---

Complete the MCP safety-hint trio on every manifest tool. `ToolAnnotations` is now an interface requiring explicit `readOnlyHint`, `openWorldHint`, and `destructiveHint` values — OpenAI's ChatGPT/Codex plugin review rejects tools that omit any of the three — and every `MCP_TOOLS` entry carries the completed trio. The send tools (`senderkit_send`, `senderkit_send_raw`) are the only `openWorldHint: true` tools, since they deliver messages to recipients outside SenderKit; read-only tools explicitly declare `openWorldHint: false, destructiveHint: false`. The CLI-bundled MCP server surfaces the completed trio over `tools/list` with no other behavior change.

For type consumers this widens the previous one-hint union: code that constructed a partial `ToolAnnotations` (e.g. `{ readOnlyHint: true }`) must now state all three hints.
