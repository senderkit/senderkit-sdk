---
"@senderkit/sdk": patch
"@senderkit/cli": patch
---

Document that SMS recipients must be an E.164 phone number, matching the hosted API's validation. The API now rejects a non-E.164 SMS `to` with `400 invalid_recipient` (for both template and raw sends) instead of accepting it and failing later at dispatch.

- The `senderkit_send_raw` `to` field description now spells out the per-channel recipient formats — including the E.164 requirement for `sms` — bringing it in line with `senderkit_send`, which already documented it. This flows through to the `senderkit send-raw` CLI help.
- The SDK README's SMS example now notes the E.164 requirement and the `400 invalid_recipient` response.
