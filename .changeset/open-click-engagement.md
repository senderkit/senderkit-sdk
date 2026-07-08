---
"@senderkit/sdk": minor
"@senderkit/cli": minor
---

Surface provider-reported open/click engagement on messages.

- **`openedAt`** — first provider-reported email open, as an ISO 8601 string, or
  `null` until opened. Set once on the first open; later opens don't update it.
- **`clickedAt`** — first provider-reported link click, as an ISO 8601 string, or
  `null` until a link is clicked. Set once on the first click; later clicks don't
  update it.

Both fields are returned by `messages.get` and `messages.list`.

- **SDK:** `openedAt` / `clickedAt` added to the `Message` type.
- **CLI:** `senderkit messages get` now prints `openedAt` / `clickedAt`.
- **Webhooks:** two new subscribable event types — `message.opened` and
  `message.clicked`. They're engagement signals and never change a message's
  status (`delivered` stays terminal). The `message.clicked` payload additionally
  carries the clicked `link`.
