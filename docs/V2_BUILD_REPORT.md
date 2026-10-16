# V2 build and verification report

Date: 2026-10-16. Implementation branch: `feat/v2-workspace`.
Status: **working local review candidate; not deployed or production accepted**.
[V2 specification](V2_DESIGN_SPEC.md) remains the release target. V3 and the proposed
[V2.5 Node alternative](V2_5_NODE_DATA_VIRTUALIZATION_DESIGN.md) are separate design efforts.

## What is implemented

The new React/TypeScript/Vite application in `frontend/` provides Explore, Compare, Skills and Evidence.
It has shared worker queries, source-specific views, exact categorical drill-down, explicit unknowns,
frozen A/B cohorts with overlap, recorded-versus-analyzed-text skill shares, supported co-mentions,
record and metric-contributor inspection, pay eligibility, safe CSV, versioned share/state files and
browser history. Source/method explanations and unavailable optional lenses are visible. Dense charts
have keyboard/list alternatives; detail and filter panels manage focus and reduced-motion preferences.

The Python pipeline now imports checksum-pinned public source files, optionally audits their matching
HTML currency supplement, reads local evidence without migrating it, merges with field provenance,
and exports strict public schemas and content-addressed files. It works with no private database.
The application/build uses only committed sanitized artifacts. See [data pipeline](V2_DATA_PIPELINE.md)
for reproduction commands, hashes, merge rules and currency safeguards.

V1's `web/` files and Pages deployment workflow are unchanged. V2 has separate build/check configuration
and a Vercel configuration with explicit workspace rewrites, immutable release caching and genuine
missing-data behavior by filesystem routing. No Vercel project/account was provisioned.

## Actual data release

Dataset version: `9bd992ecffd1bb6fad5a0715ca8c38a75b1bb4416df342c49abbb02a38b8de28`.

| Source mode | Distinct postings | Employers | Eligible USD pay | Locally analyzed text |
|---|---:|---:|---:|---:|
| Combined | 86,190 | 311 | 28,246 | 92 |
| Upstream | 86,144 | 310 | 28,246 | 0 |
| Local | 92 | 7 | 3 | 92 |

Overlap: 46 exact IDs. Rejected input rows: zero. Default observed/reported-open combined query:
82,851 records; the full release also contains 3,339 upstream-reported closed records. Counts describe
the pinned October 16 snapshot, not real-time vacancies or the full labor market.

Independent reconciliation passed all 41 public file hashes/lengths, source modes, maximum 5,000-row
shards, exact union/overlap, unique IDs, catalog/provenance references and forbidden field/path checks.
The local private database's hash remained unchanged. Detailed combined posting JSON is 140,925,161
bytes; offline compression estimates are about 7 MB. This is not a measured hosted transfer size.

## Verification evidence

- Python: 28 tests covering the existing pipeline and new intake/merge/export guards, including no-DB
  export, typed-currency agreement, quarantine, ambiguous dollars, private sentinels and absent values.
- V1 embedded publication boundary: passes with 92 postings.
- Frontend build: strict input validation, TypeScript, deterministic unit tests, Vite compilation and
  strict compiled-public-output validation; **22 unit tests passed**.
- Independent compiled-browser inspection: real full inventory, search, source switch, CSV, navigation
  and mobile checks produced no page errors and no horizontal overflow at 390×844.
- Independent Python CSV parsing: 92 exported local records, identical contributor ID set and valid
  field boundaries. Export includes public pay/skills/provenance fields and formula-like text escaping.
- Compiled Playwright suite: **all six scenarios passed** (52.2 seconds). Covers full inventory and
  local filtering, frozen comparisons and skill contributors, independent CSV parsing, mobile focus/
  reduced motion/no overflow, corrupted-shard rejection, deep links, invalid/shared/imported state,
  and exact skill-cell drill-down counts.
- Axe WCAG 2 A/AA and 2.1 AA rules: zero violations in the four tested local workspaces and the tested
  record drawer. This automated scope does not establish comprehensive accessibility compliance.
- Dependency audit: zero reported findings after patching the build/test dependencies.
- Repository CI includes Node/Python/build/browser checks without changing the V1 Pages artifact.

Machine-readable [browser inspection](V2_BROWSER_CHECKS.json) and
[engine comparison](V2_ENGINE_BENCHMARK.json) state their methods and limits.

## Performance decision and limits

Keep one indexed JavaScript query engine in a browser worker for V2. A Node-runtime comparison measured
full production analysis p95 of about **123 ms at 86,190 records** and **79 ms at a labeled 100k stress
fixture**, over 35 requests with repeated queries using the bounded cache. The workload selects initial employer
IDs and the default query; it is not comprehensive coverage of every broad country/occupation query. The cold first full query
still took about **1.3 seconds**. A representative employer/occupation count kernel matched DuckDB-Wasm
results, while the tested Wasm path added startup cost. This is not a browser or Node-native DuckDB
service benchmark, nor a comparison of every SQL workload.

The latest independent local Chromium check displayed a useful summary in **602 ms**, but full
interaction took **9.6 seconds** while all detailed data loaded and validated. Five subsequent worker
query responses ranged from **54 to 267 ms**. These are unthrottled local observations on an AMD EPYC
host under concurrent verification, not mobile/4G results or a robust browser p95. No claim is made
that mobile startup, whole-browser memory budgets or all performance targets are satisfied.

V2.5's proposed selective server-side access addresses this browser-ownership/startup cost, subject to
an identical-data benchmark; changing languages alone is not evidence of improvement.

## Preview

[Desktop screenshot](v2-built-desktop.png) · [Mobile screenshot](v2-built-mobile.png).
These are actual compiled-application captures, not the earlier design concept.

```sh
cd frontend
npm ci
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview -- --port 4173
```

Use Node 22.20.0. See [frontend instructions](../frontend/README.md).

## Remaining release gates

The core local build is reviewable. Production release remains incomplete:

- Actual Vercel account/project connection, deployed deep-link/missing-asset/cache checks, live payload
  inspection and paired app/data rollback verification (AT14–AT15).
- Named mobile hardware/network performance and memory measurements; broader workload coverage.
- The specified 5–8 formative user sessions and task-completion evidence. Automated browser and axe checks
  are useful evidence but do not establish full accessibility or substitute for those sessions.
- Optional similarity projection/geography/history remain gated with explanations; no career, hire or
  employee-supply inference is enabled.

No paid providers were used, employee profiles collected, or V3/V2.5 application code implemented.
