---
"@senderkit/sdk": patch
"@senderkit/cli": patch
---

Correct the `blocked` message documentation: the detailed block reason is operator-only and is not returned by the API.

A prior release documented an optional `Message.blockedReason` field, but the
app's message read endpoints (`GET /api/v1/messages` and
`GET /api/v1/messages/:id`) never project that column — the detailed
anti-phishing/abuse signal breakdown is deliberately operator-only (senderkit-app
#211), so a sender can't learn how detection works. The field was therefore never
populated on any SDK/MCP/CLI response.

- **`Message`** — remove the `blockedReason` field (it was never returned) and
  reword the `status` doc accordingly. The `[key: string]: unknown` index
  signature is unchanged, so this is not a runtime change for any caller.
- The `blocked` lifecycle status is unaffected: it is still a real, returned
  `status` value and remains in `MESSAGE_STATUSES` and the
  `senderkit_messages_list.status` filter.
