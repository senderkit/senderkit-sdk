---
"@senderkit/sdk": patch
---

Correct the `blocked` message documentation to match the API.

The previous release advertised a `Message.blockedReason` field carrying the
"human-readable trigger" for a blocked send. senderkit-app never returned it:
the REST `messages.list` / `messages.get` projection (and the MCP tools built
on it) deliberately omit the abuse detection breakdown, which is operator-only.
The app has now codified this (the customer-facing `timeline` carries only a
generic "Blocked by automated content safety checks." entry; the detailed
reason stays in the operator-only admin abuse review).

- Remove the never-populated `Message.blockedReason` field. Reads still expose
  any extra server fields through the existing index signature, so this only
  drops a misleading type/doc — no field that the API actually sent.
- Update the `Message.status` and `MESSAGE_STATUSES` docs to stop pointing at
  `blockedReason` and describe the generic, customer-facing block reason
  instead.
