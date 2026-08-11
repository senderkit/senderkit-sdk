---
"@senderkit/sdk": patch
---

Make the inbound `verdicts` field documentation provider-neutral: it now describes the map as "scanning verdicts (e.g. spam/virus/SPF/DKIM), as reported" without naming the underlying receiving infrastructure. The shipped type and its runtime shape are unchanged.
