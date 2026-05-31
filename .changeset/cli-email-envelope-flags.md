---
"@senderkit/sdk": patch
"@senderkit/cli": patch
---

Fix CLI `--cc`, `--bcc`, and `--attachments` flags throwing a Zod validation error

The shared MCP/CLI input shapes typed `cc`/`bcc` as `string[]` and `attachments` as an object array with no string coercion, so the commander-supplied string values failed validation even though the flags were advertised in `--help`. They now accept a comma-separated or JSON-array string (`cc`/`bcc`) or a JSON-array string (`attachments`) from the CLI while real arrays/objects from the MCP server still pass through unchanged, mirroring how `vars`/`metadata` already work.

Also fix the runtime `VERSION` constant in both packages, which had drifted behind `package.json` (the SDK sends it as the `User-Agent` header; the CLI uses it for `--version` and the MCP server identity). `version.ts` is now regenerated from `package.json` by a `sync-version` step wired into the `changeset version` release script, so it can no longer go stale, with drift-guard tests in both packages.
