---
"@senderkit/sdk": patch
---

Align the MCP manifest's inbound tool definitions with the hosted app's corrected versions (the same adoption pattern as the earlier cc/bcc/limit wording fix):

- `senderkit_inbound_addresses_create` is now annotated `destructiveHint: false` — creating an address is additive and fully reversed by deleting it, so clients need not demand confirmation.
- The `livemode` field description no longer claims test-mode addresses "don't count against quota"; every address, test or live, counts toward the plan's inbound-address limit.
- `senderkit_inbound_messages_list` / `senderkit_inbound_messages_get` are titled "List Inbound Messages" / "Get Inbound Message", and the remaining inbound tool descriptions and field descriptions now match the app's served wording — including a friendlier ISO 8601 validation message on the `before` cursor.
