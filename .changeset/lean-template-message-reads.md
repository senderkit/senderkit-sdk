---
"@senderkit/sdk": minor
"@senderkit/cli": patch
---

Align read types with the leaner server contract: `GET /v1/messages`,
`GET /v1/messages/:id`, and `GET /v1/templates/:slug` no longer return the heavy
rendered `content` blob (it could overflow the LLM/MCP context window).

- **Breaking (types):** `TemplateVersion.content` has been removed — `templates.get`
  now returns only `versionNumber`, `variables`, and `publishedAt` under
  `currentVersion`.
- Documented on the `Message` type that reads omit `content` while keeping
  `vars`, `timeline`, and `metadata`.

No runtime/behavior change in the SDK or CLI (the CLI `templates get` output
already surfaced only the version number).
