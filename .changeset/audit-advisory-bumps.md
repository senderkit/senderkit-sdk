---
"@senderkit/cli": patch
---

Resolve `pnpm audit` advisories by bumping vulnerable transitive dependencies.

- **`hono`** → `>=4.12.25` (pnpm override). Pulled in at runtime via
  `@modelcontextprotocol/sdk`; clears 5 advisories (GHSA-wwfh-h76j-fc44,
  GHSA-j6c9-x7qj-28xf, GHSA-rv63-4mwf-qqc2, GHSA-wgpf-jwqj-8h8p,
  GHSA-88fw-hqm2-52qc).
- **`js-yaml`** → `>=4.2.0` (pnpm override). Dev-only, via `@changesets/cli`
  (GHSA-h67p-54hq-rp68).
- **`vite`** → `^8.0.16`, pinned as a direct devDependency in the three
  test packages. Dev-only, via `vitest` (GHSA-fx2h-pf6j-xcff,
  GHSA-v6wh-96g9-6wx3). An override alone doesn't move it because `vite` is
  both a dependency and a peerDependency of `vitest`, so the version is pinned
  where the peer is consumed instead.

`pnpm audit --audit-level=moderate` now reports no known vulnerabilities.
