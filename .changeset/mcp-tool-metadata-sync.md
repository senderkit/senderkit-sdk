---
"@senderkit/sdk": minor
"@senderkit/cli": patch
---

Sync the MCP tool manifest with the richer metadata the hosted server (senderkit-app) now serves.

The hosted MCP server had diverged from the shared `@senderkit/sdk` manifest by
overriding tool descriptions and tightening two input fields at the app layer.
This brings the canonical manifest — used by the CLI-bundled stdio/HTTP MCP
server and the CLI's `--help` — back in lockstep.

- **Tool descriptions** (`senderkit_send`, `senderkit_send_raw`,
  `senderkit_templates_list`, `senderkit_templates_get`,
  `senderkit_messages_list`, `senderkit_messages_get`) now lead with the
  email/SMS/push/web-push channel keywords and describe the use case. The
  send-tool descriptions remain the base wording; each server still appends its
  own live/test mode note.
- **`senderkit_messages_list.status`** is now a strict enum
  (`scheduled, queued, rendered, dispatched, sent, delivered, failed,
  opted_out, canceled`) instead of free-form text, matching the API, which
  already rejects unknown statuses with a 400. Exported as `MESSAGE_STATUSES`.
- **`senderkit_send.to`** description now covers all four channels (email /
  E.164 phone / push device token / web-push PushSubscription).
- **Template slug** field descriptions (`senderkit_send.template`,
  `senderkit_templates_get.slug`) note that slugs are lowercase — the app now
  canonicalizes slugs to lowercase on create/rename, so by-slug lookups should
  use the lowercase form.
