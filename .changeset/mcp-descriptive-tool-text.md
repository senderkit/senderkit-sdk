---
"@senderkit/sdk": patch
"@senderkit/cli": patch
---

Make MCP tool and field descriptions descriptive, not instructions to the model

ChatGPT's tool-call review flags descriptions that tell the model what to check
or say as a "Suspicious Instruction". `senderkit_context`,
`senderkit_inbound_domains_create`, its `acknowledgeExistingMx` field, and the
API-key send-mode note now describe what they do and return; consent for the
domain claim is carried by its destructive/open-world annotations.
