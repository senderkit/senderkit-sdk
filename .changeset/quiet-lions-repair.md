---
"@senderkit/sdk": patch
"@senderkit/cli": patch
---

Correct the `Message` read type: drop the `blockedReason` field, which the public REST API never returns (message reads use a lean, fixed projection that does not include it), and reword the `blocked` status documentation to describe it generically as a terminal status set by automated content-safety checks. No runtime behavior change — the field was always absent from responses. `blocked` remains a valid `MESSAGE_STATUSES` value and `messages.list` filter.
