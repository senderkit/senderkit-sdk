---
"@senderkit/sdk": patch
"@senderkit/cli": patch
---

Make MCP tool metadata match tool behavior

OpenAI's MCP tool scan flagged three manifest entries:

- `senderkit_templates_get` described returning a template's content and
  "what will actually be delivered", but the result omits rendered content.
  The description now lists what it returns: channel, status, and the current
  version's number, publish time, and declared variables.
- `senderkit_inbound_addresses_create` (can forward received mail to any
  external address) and `senderkit_inbound_domains_create` (redirects a
  domain's mail; depends on the user's DNS) are now `openWorldHint: true`.
