# V2.5 Node data pipeline

Implemented separately under `node25/`. Application ingestion, normalization, publication, validation
and Parquet materialization run on Node 22.20 without a Python subprocess. The existing V1/V2 pipelines
remain separate. Employee/profile collection and paid data providers are excluded.

## Implemented paths and release

Two explicit intake paths produce the same public records:

1. `scripts/materialize.mjs --from-v2 DIR` verifies the pinned sanitized V2 manifest/shards, validates
   their strict public schemas and creates the native DuckDB/Parquet store. This was the initial parity
   import, not the only implemented ingestion path.
2. `scripts/import-upstream.mjs` downloads the original pinned CSVs and optional audited HTML into
   private staging. `scripts/original-source.mjs` parses/normalizes those inputs and merges the committed
   sanitized 92-record local seed. The current Parquet was regenerated through this original-source
   **Node** path, not through a Python exporter.

The active release is:

| Measure | Result |
|---|---|
| Node semantic dataset version | `2d18d6d0d99a370a7ebc6a7d0d637cbca917682b504110427727ba76a339041b` |
| Reference V2 dataset | `9bd992ecffd1bb6fad5a0715ca8c38a75b1bb4416df342c49abbb02a38b8de28` |
| Combined / upstream / local distinct postings | 86,190 / 86,144 / 92 |
| Exact source ID overlaps | 46 |
| Rejected pinned CSV rows | 0 |
| Eligible USD pay: combined / upstream / local | 28,246 / 28,246 / 3 |
| Parquet file size, all three modes | 15,987,880 bytes |
| Parquet SHA-256 | `e5e4ddaece24bafd53801f7c78bcde594ef2206b13d6867ffec23651fdbef792` |

[`node25/store/release.json`](../node25/store/release.json) records counts, catalogs, source as-of,
methods, limitations, file integrity and honest collection readiness. The store also contains
`postings.parquet`, a small sanitized `local-seed.json`, admin operational `collection-history.json` and the
[full parity receipt](../node25/store/parity-receipt.json). No private SQLite, descriptions, raw evidence,
upstream CSV/HTML archive or authentication token is included.

## Runtime and ordinary build

From `node25/`, using Node 22.20:

```sh
npm ci --ignore-scripts
npm run data:validate
node --test test/data.test.mjs
npm run build
```

Dependencies are pinned in the lockfile. `@duckdb/node-api` is `1.5.6-r.1`; the compatible prebuilt Linux
native binding was actually imported and queried. Installation used `--ignore-scripts`; no native
source-build or Python toolchain fallback was used. An unsupported platform fails its native import
rather than being represented as supported. No Vercel Analytics dependency is present.

`npm run build` validates the committed store, checks TypeScript and builds Vite. It does not download
sources, access the private database, refresh jobs or call a Python CLI. Missing/corrupt committed data
fails validation; rebuilding requires an explicit command. Vercel can therefore use `node25/` as a
self-contained root. The Node service reads this sanitized store; it does not load full posting arrays
into the browser. Its serving/query behavior is owned by the separate server lane.

## Reproduce original upstream intake

The upstream source is public repository `yimizhao2015/jobmarket-lens`, commit
`7e415fe62d0597e9c6c806bf813b30f8e8c88c98`, as of `2026-10-16T12:53:22Z`.
The Node importer retrieves these exact paths at that commit:

| Path | Expected SHA-256 |
|---|---|
| `data/Job postings.csv` | `7063958088835db11499eb36858d54329fb003d2dba711565e396a90fa82fba6` |
| `data/data source.csv` | `48a6c193b54601dafe9f34c18d7699177e08671e35b526d1cb248a67bcfde02e` |
| `web/index.html` | `bc6a3b4ec490615c39ea31298deb41ecc925021e0e160afadf2d25e5b947a6d3` |

```sh
npm run data:import -- --dry-run
npm run data:import
npm run data:materialize -- --from-upstream
npm run data:validate
```

Default staging is repository-level `.private/node25/upstream/<commit>/`, outside the application root
and excluded from deployment. `--output DIR` selects another private intake location; paths inside
`node25/` are rejected. `--input DIR` reads offline copies with filenames `Job postings.csv`,
`data source.csv` and `index.html`. The importer does not resolve a moving branch or silently accept a
new source commit; a new pin requires a new audit.

UTF-8 decoding is strict. Header, identity, date, URL, status, numeric and duplicate checks produce
private reject reports. Pinned checksum mismatch fails ingestion. Dry-run caches files and writes
reports but does not admit the intake for materialization. The exporter rereads and verifies original
CSV bytes, not mutable intermediate accepted-record JSON.

The optional HTML supplement is enabled by default. Its exact audited hash, 86,144 unique IDs, shared
fields and reported open statuses must match CSV. A mismatch is quarantined with a reason; safe CSV-only
intake remains usable. `--no-typed` explicitly disables the supplement. Missing typed input in an
explicit offline directory is an error, rather than an unreported network fallback.

## Salary, identity and provenance semantics

The Node implementation reproduces the V2 CSV salary parser, including original units, conservative
validation flags and rounding. A dollar symbol alone does not establish USD because the original CSV
formatter also printed it for missing currency. Typed currency is recovered only when native bounds,
source-format precision and period agree. Typed annual maxima are ignored; annual values are recomputed.
Unknown currencies, mismatches and suspicious/nonfinite/negative ranges remain ineligible. USD pay
counts require the validated annual USD population, not every posting with numeric pay text.

Company/requisition IDs are preserved. Combined mode counts exact overlaps once; upstream and local
retain their source values. Same-day local evidence wins ties. Missing qualification values can fall
back without erasing established values; sparse `fieldProvenance` identifies those overrides.
Meaningless all-null locations do not replace meaningful locations. Source-specific conflicts and
unknowns remain visible. Imported availability never creates local observation timestamps, inventory
completeness or closure events. Source absence is not closure.

Skills/licenses/SOC are the already normalized upstream mentions/classifications mapped to stable IDs,
with a versioned public taxonomy seed. This is not a new raw-description extraction or classification
model. The local public seed preserves V2's sanitized observations and requires no private database to
build. Combined analyzed-text coverage follows the selected skills source, so upstream mentions do not
become locally analyzed full-text observations.

## Parquet and integrity contract

The [shared integration contract](../node25/shared/CONTRACT.md) fixes physical columns:
`mode`, `id`, `companyId`, `title`, `occupationId`, `level`, `arrangement`, `availability`,
`hasDescription`, `eligiblePay`, `annualLow`, `annualHigh`, `countries`, `skillIds`, `detailJSON`.
`countries` and `skillIds` are string lists. `(mode,id)` is unique. `detailJSON` is the complete strict
public posting object, not private evidence. Native SQL consumers must quote camelCase column names.

Materialization writes sorted mode/ID rows with Zstandard compression and 8,192-row Parquet row groups.
Transient sanitized NDJSON stays in a temporary directory and is removed afterward. A Node-derived
semantic version hashes canonical mode records/catalogs/methods/source as-of. Canonical JSON sorts
object keys, preserves arrays and rejects nonfinite numbers. Physical Parquet bytes have a separate
hash: writer layout or JSON key order can change those bytes without changing posting semantics.

Build verification checks the file hash/length, strict Zod release metadata, strict public seed and every
streamed `detailJSON` record. It verifies physical column names, scalar/list/detail consistency, public
catalog and provenance references, eligible salary consistency, distinct counts, source unions and
overlaps. This catches private fields even if a modified Parquet is accompanied by an updated hash.
Current deep validation takes approximately 15 seconds in this workspace; it is a build gate, not a
per-query operation. The service can verify trusted committed file hashes at startup separately.

## Full parity audit and tests

With admitted original Node intake and the existing V2 public artifacts available:

```sh
npm run data:parity -- --output store/parity-receipt.json
```

`--v2 DIR` and `--intake-dir DIR` override the two audit inputs. The command compares every public field
by canonical record, not just counts or IDs, and writes matched per-mode canonical row hashes. It found
**zero mismatches across 172,426 source-mode records**. The receipt includes exact input checksums,
Node version, reference release and all three eligible pay populations. V2 files are needed only for
this explicit cross-version audit/import path, not an ordinary Node application build.

Fourteen data tests passed, including native SQL checks against the actual store, pinned CSV/typed
failures, unsafe URLs, duplicate IDs, salary validation, field/provenance fallback, unknown/private
fields, seed rejection, absence semantics, file tampering and a forged-hash Parquet containing a private
description sentinel. These data tests do not establish browser usability, deployed latency or server
access control; those require the other integration lanes.

## Optional private history archive and remaining scope

```sh
npm run data:migrate
```

This opt-in Node command opens the legacy `data/lens.db` read-only and archives the four existing tables
under `.private/node25/legacy-history/`. It verifies the database hash before/after, records archive
integrity and initializes an empty native run ledger. The observed migration retained 92 postings, 92 versions,
92 observations and seven snapshots without changing the database. Node 22's built-in SQLite API emits
an experimental-feature warning; this module is not imported by the public query service.

A separate explicit, coordinator-approved `node scripts/publish-history.mjs` projection publishes seven
historical snapshot summaries to `store/collection-history.json` and `release.collection.runs`. Only
company, run date, status, collected count, site total and inventory completeness survive; every row is
labeled `engine: legacy-python` and `kind: historical-import`. Raw notes, errors, URLs and descriptions
are excluded by a strict schema. The history file has a release hash, and build verification reconciles
its rows with release metadata. It remains outside static assets and must be served only through the
authenticated admin route. This operational addition does not change the posting semantic version.

The private archive is a preservation/migration input, not a newly implemented writable collection-history
engine. No Node collector has run and no refresh is scheduled. Existing robots/refusal decisions,
pagination completeness, raw-description normalization, source-specific adapters, private GitHub backup
uploads and restore automation are not magically ported by installing the Node app. Those production
collection responsibilities remain explicit follow-up work; the release's collection panel reports
`scheduled: false`, seven clearly labeled historical snapshots, no native Node collection runs, and these limitations. No background job or paid provider is enabled.
