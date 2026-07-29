---
"@senderkit/sdk": minor
"@senderkit/cli": minor
---

Add inbound email — receive mail, not just send it.

A new `inbound` namespace covers three things: **addresses** to receive on,
**messages** that arrive on them, and **domains** to receive under. Requires an
API key with the `inbound` scope.

Addresses live on the workspace's shared `{slug}.in.senderkit.email` domain,
which is created lazily on first use. Pass a `localPart` to pick one, omit it for
an unguessable generated address, or pass `"*"` for a catch-all that takes every
local part no exact address claims — an exact address always wins.

Received mail is retained for **30 days**; fetching the raw source or an
attachment after that rejects with a `SenderKitApiError` (`410`).

- **SDK:** `client.inbound.addresses` (`list`, `create`, `delete`),
  `client.inbound.messages` (`list`, `get`, `raw`, `attachment`), and
  `client.inbound.domains` (`list`, `create`, `delete`). `messages.get` returns
  the parsed body, headers, attachment metadata and SPF/DKIM/DMARC verdicts;
  `raw` returns `message/rfc822` bytes and `attachment(id, index)` returns one
  attachment by its zero-based `index`. Types are exported from the package root
  — `InboundAddress`, `InboundDomain`, `InboundMessage`,
  `InboundMessageSummary`, `InboundAttachment`, `InboundDnsRecord`,
  `InboundMessageStatus`, and the matching param/response types.
- **CLI:** eight new commands — `senderkit inbound addresses list|create|delete`,
  `senderkit inbound messages list|get`, and
  `senderkit inbound domains list|create|delete`.
- **MCP:** eight new tools mirroring those commands, named
  `senderkit_inbound_{addresses,messages,domains}_*`.

Claiming a custom domain returns the DNS `records` to publish; nothing is
received until they are live and the domain flips to `verified`. If the domain
already has MX records pointing elsewhere, `domains.create` rejects with a
`SenderKitApiError` (`409`, `code: "existing_mx"`) naming the current mail hosts
— confirm with the user, then retry with `acknowledgeExistingMx: true`. The
shared domain cannot be deleted.
