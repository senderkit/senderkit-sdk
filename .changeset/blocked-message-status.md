---
"@senderkit/sdk": minor
"@senderkit/cli": patch
---

Add the `blocked` message status introduced by the outbound abuse scanner.

senderkit-app now runs outbound anti-phishing detection over email and SMS
content. A flagged send is halted and the message lands in a new terminal
`blocked` state with a human-readable `blockedReason`. This brings the SDK,
CLI, and MCP surface back in lockstep with the app's `messageStatusEnum`.

- **`MESSAGE_STATUSES`** now includes `blocked` (between `opted_out` and
  `canceled`), mirroring the app enum. The `senderkit_messages_list.status`
  MCP/CLI filter is a strict `z.enum(MESSAGE_STATUSES)`, so before this change
  it rejected `status: "blocked"` as invalid input — callers can now filter for
  blocked messages.
- **`Message.blockedReason`** is documented on the message type (optional
  `string | null`), alongside a note that `blocked` is set by the abuse scanner.
