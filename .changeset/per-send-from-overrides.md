---
"@senderkit/sdk": minor
"@senderkit/cli": minor
---

Add per-send From overrides on email sends, identical on templated and raw sends.

- **`from`** — optional From **address** override (bare address). Previously
  available on `sendRaw` only; now also accepted on `send` (templated).
- **`fromName`** — new on both `send` and `sendRaw`: optional From **display
  name** override, rendered by the sender as `Name <address>`. Max 128
  characters; no control characters or angle brackets.

Either field can be set on its own; both fall back to the provider connection's
configured values. On managed sending the `from` address is honored only on the
workspace's verified sending domain, while `fromName` always applies.

- **SDK:** `from` / `fromName` added to `SendRequest` and `fromName` to
  `SendRawEmailRequest`; both forwarded to `/v1/send`.
- **MCP:** `senderkit_send` and `senderkit_send_raw` gain `from` / `fromName`
  inputs.
- **CLI:** `senderkit send` and `senderkit send-raw` gain `--from` / `--from-name`.
