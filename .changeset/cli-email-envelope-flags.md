---
"@senderkit/sdk": patch
"@senderkit/cli": patch
---

Fix CLI `--cc`, `--bcc`, and `--attachments` flags throwing a Zod validation error

The shared MCP/CLI input shapes typed `cc`/`bcc` as `string[]` and `attachments` as an object array with no string coercion, so the commander-supplied string values failed validation even though the flags were advertised in `--help`. They now accept a comma-separated or JSON-array string (`cc`/`bcc`) or a JSON-array string (`attachments`) from the CLI while real arrays/objects from the MCP server still pass through unchanged, mirroring how `vars`/`metadata` already work.

Also bump the SDK runtime `VERSION` constant to `0.2.0` so the `User-Agent` header matches the published package version, with a test guarding against future drift.
