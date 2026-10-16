# V2.5 build and deployment report

Deployed 2026-10-16: **https://lens.feedos.si**. V2 remains at **https://jobmarket.feedos.si**.
[Draft PR #2](https://github.com/liyue2055/jobmarket-lens/pull/2) targets the V2 feature branch;
no merge or replacement of V2 was performed. V1 GitHub Pages remains separate.

## Delivered behavior

The Node.js/TypeScript app provides a linked research canvas, occupation/employer matrix, country and
employer facets, exact frozen-cohort comparisons, skill co-mentions, evidence, record inspection and
stable 100-row pages. The native DuckDB service returns named analytical results; the browser does not
fetch the full posting table. CSV streams all selected contributors and the same 37 public fields as V2.
The logo, SVG wordmark/favicon, social PNG, self-hosted fonts and visual tokens form the new
[brand system](V2_5_BRAND_GUIDE.md). No video functionality was added.

The protected owner console shows deployment/dataset/runtime information and seven sanitized historical
collection summaries. It uses scrypt verification and a signed three-hour HttpOnly/Secure/SameSite=Strict
session. Password/signing values are encrypted server environment variables, excluded from Git and the
browser. Local owner access is saved at `.private/node25/admin-access.txt`; never publish that file.

Visitor analytics uses the optional self-hosted **Umami** tracker/reporting adapter and
[Docker/PostgreSQL package](../node25/analytics/README.md). Vercel Analytics was removed at the user's
request. No persistent Umami host/database is configured, so visitor counts remain unavailable. The
adapter sends only public page paths and fixed titles, respects DNT/GPC and excludes admin/search/state.
Its provider API is fixture-tested; live Umami operation has not been verified. No paid service was bought.

## Data and release identity

The original pinned CSV/typed-supplement intake, normalization, merge and publication run in Node, with
no Python subprocess. Every public field matches the V2 reference across 172,426 source-mode records.
The [pipeline report](V2_5_DATA_PIPELINE.md) and [parity receipt](../node25/store/parity-receipt.json)
record hashes and reproduction commands. Ordinary builds validate committed sanitized stores offline.

| Mode | Distinct postings | Eligible USD pay |
|---|---:|---:|
| Combined | 86,190 | 28,246 |
| Upstream | 86,144 | 28,246 |
| Local | 92 | 3 |

Overlap is 46 IDs. Default reported/observed-open combined view is 82,851 records. The complete
three-mode Parquet is 15,987,880 bytes. Node semantic dataset identity is
`2d18d6d0d99a370a7ebc6a7d0d637cbca917682b504110427727ba76a339041b`; reference V2 identity is
`9bd992ecffd1bb6fad5a0715ca8c38a75b1bb4416df342c49abbb02a38b8de28`.

These are dated posting snapshots. Imported absence is not closure, closure is not a hire and recorded
skills are not a measure of available employees. Private descriptions/SQLite/raw evidence remain outside
Git and deployed functions. Historical admin counts are explicit allowlisted projections, not raw history.

## Validation actually completed

- All **30 Node tests**, strict TypeScript/build and **nine browser scenarios** passed in GitHub CI at
  `7297d617c4c12e234de41d18a027d467db856b3c`. Preserved V2 and publication checks also passed.
- On the custom domain, **eight browser scenarios passed**. The local fixture-password owner scenario
  intentionally skipped live; actual production owner login, secure three-hour cookie, seven historical
  runs and logout were independently verified using the private owner credential.
- Tested public workspaces, mobile record drawer and fixture admin pass automated WCAG 2 A/AA and 2.1 AA
  axe checks. Mobile 390×844 keyboard/focus, reduced motion and overflow checks passed. This is specific
  automated coverage, not comprehensive accessibility or human-usability certification.
- Live native queries reproduce all three population/pay counts. Store/environment paths and missing
  assets return 404; unauthenticated admin API returns 401. HTTPS validates on both version domains.
- Full live export returns **86,190 unique IDs, 37 columns and 28,246 eligible-USD records**, with the exact
  V2 ID set and matching contributor hash. Its 111,540,525 decoded bytes streamed in 10.08 seconds in one
  check. The browser retrieves this bulk file only after an explicit export action.
- Deep publication validation checks every public detail record, scalar/list/pay agreement, references,
  counts, union and hashes; tampered files and forged-hash private fields are rejected. Dependency audit
  reported zero findings on the installed lockfile.

The export check ran on `6cf7afc`; backend, scripts and stores are identical in `7297d61`. Final live
browser and owner smoke checks ran on `7297d61`. [Machine-readable evidence](V2_5_DEPLOYMENT_CHECKS.json)
records these scopes rather than treating every check as having run on every commit.

## Observed comparison and limits

One sequential, fresh-browser-context Chromium comparison used the same cloud workstation, viewport
and observed-open population. Origin/CDN/native-service caches were uncontrolled and warm from checks.

| Observation | V2 | V2.5 |
|---|---:|---:|
| Analytical requests | 23, including worker-loaded shards | 3: catalog, overview, record page |
| Encoded analytical response bodies | 5,709,399 bytes | 24,183 bytes |
| First summary | 739 ms | 481 ms |
| Enabled cohort controls / first page ready | 7,729 ms | 632 ms |

[Browser evidence](V2_5_BROWSER_COMPARISON.json) includes each request. Headers are excluded where the
browser did not expose sizes. These timings are one observation, not robust p95, cold-service or mobile
claims. Main-thread heap excludes V2's worker and is not proof of the proposed 50% whole-browser peak
memory improvement. The [fixed service workload](V2_5_SERVICE_BENCHMARK.json) separately labels local
cache-hit-heavy concurrency observations; it is not a capacity guarantee.

Named-device/network/memory benchmarks, formative user sessions, live Umami persistence, new Node
collector adapters/scheduling, private backup/restore automation and a demonstrated paired rollback
remain follow-up work. Optional Wasm, Mosaic integration and projection views are not claimed complete.

## Hosting and recovery

| Setting | Deployed value |
|---|---|
| Vercel project | `self-59d1/jobmarket-lens-node25` |
| Project ID | `prj_jRe2fQJFmJbRPXof0ddvV8Po574L` |
| Final deployment | `dpl_HyQTbKsHgMEXvtiWwfHmGT6pK68A` |
| Unique URL | https://jobmarket-lens-node25-5w4gy6rbd-self-59d1.vercel.app |
| Runtime source | `7297d617c4c12e234de41d18a027d467db856b3c` |
| Root/runtime | `node25` / Node 22.x |
| Install/build/output | `npm ci --ignore-scripts` / `npm run build` / `dist` |
| Function | Native Node/DuckDB, sanitized store only, 60-second maximum |
| Plan/domain | Existing Hobby plan and new `lens.feedos.si` subdomain; no purchase |

Production was explicitly deployed from reviewed Git sources. The Git production branch remains
`main`; feature pushes create previews. The Node function verifies content hashes before loading an
immutable sanitized table, disables external DuckDB access, binds named query values and bounds queues,
JSON responses and interactive execution. Function counters/throttling are per-instance, not durable
analytics or a global lockout.

Restore an entire known-good Vercel deployment, including app, release metadata and Parquet, if a later
release regresses. The preceding verified deployment is `dpl_HfZr9pN7noXBMnnWLLAzjw545g82` (`6cf7afc`).
After recovery verify HTTPS, dataset identity, counts, contributor hashes, exports, admin and navigation.
Do not replace only the release JSON. The procedure is recorded, not exercised. Retain the known-good
release in Vercel and keep admin/analytics credentials in server environment configuration.
