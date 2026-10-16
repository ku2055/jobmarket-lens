# V2 data pipeline

Implemented on 2026-10-16. This document describes the importer, exporter and generated public release,
not a completed browser-performance or production-release approval. V1's `web/` application and private
collection history remain separate. V3 employee/profile integrations are outside this pipeline.

## Inputs and reproducible intake

The initial upstream release is pinned to public repository `yimizhao2015/jobmarket-lens`, commit
`7e415fe62d0597e9c6c806bf813b30f8e8c88c98`, with source as-of timestamp
`2026-10-16T12:53:22Z`. Source date is distinct from retrieval or export time.

| File | SHA-256 | Size |
|---|---|---|
| `data/Job postings.csv` | `7063958088835db11499eb36858d54329fb003d2dba711565e396a90fa82fba6` | 37,993,867 bytes |
| `data/data source.csv` | `48a6c193b54601dafe9f34c18d7699177e08671e35b526d1cb248a67bcfde02e` | 68,465 bytes |
| Optional `web/index.html` | `bc6a3b4ec490615c39ea31298deb41ecc925021e0e160afadf2d25e5b947a6d3` | 5,774,887 bytes |

The [CSV audit](V2_UPSTREAM_SOURCE_AUDIT.json) records the original counts and CSV hashes. The optional
HTML hash is also pinned in `scripts/import_upstream.py`; it is not accepted merely because a local
file claims the correct commit.

From the repository root, install the existing Python requirements in a project environment, then run:

```sh
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 scripts/import_upstream.py --commit 7e415fe62d0597e9c6c806bf813b30f8e8c88c98 --dry-run
python3 scripts/import_upstream.py --commit 7e415fe62d0597e9c6c806bf813b30f8e8c88c98
```

The importer downloads the two public CSVs at that exact SHA, or uses their existing private intake
cache. The default directory is `.private/upstream/<commit>/`, already excluded from Git and deployment.
It validates encoding, exact headers, posting identity, relevant numeric/date fields, statuses and URLs;
incompatible rows are recorded in private per-file reject reports. A missing/incompatible file is not
treated as a valid empty inventory. Pinned byte-length or hash mismatch stops ingestion.

Dry-run still retrieves/caches original CSVs and writes `report.json` and reject reports, but does not
write accepted-record JSON. The exporter rejects an intake whose latest report says `dryRun: true`.
An admitted import writes `postings.json`, `companies.json`, original CSVs, rejects and the report.
The exporter independently reparses verified original CSVs rather than trusting those derived JSON files.

`--input-dir DIR` supports an offline directory containing the two original CSV filenames;
`--output-dir DIR` selects the private intake/report destination. Intake paths within `frontend/public/`
or `web/` are rejected. `--refresh-latest` resolves the upstream `main` commit once before retrieving
files; it creates a different release and is not the reproducible initial V2 import. The optional typed
supplement is currently accepted only for the explicitly audited initial commit.

## Optional typed currency recovery

The upstream CSV prints `$` for both USD and missing currency. CSV-only dollar ranges therefore retain
native numeric bounds but have unknown currency, no eligible annual comparison values and the
`ambiguous_csv_currency` flag. The pipeline does not infer USD from country or the symbol.

To reproduce the richer initial release without depending on any existing `/tmp` files:

```sh
mkdir -p .private/upstream
curl --fail --location \
  'https://raw.githubusercontent.com/yimizhao2015/jobmarket-lens/7e415fe62d0597e9c6c806bf813b30f8e8c88c98/web/index.html' \
  --output .private/upstream/audited-index.html
python3 scripts/import_upstream.py \
  --commit 7e415fe62d0597e9c6c806bf813b30f8e8c88c98 \
  --typed-supplement .private/upstream/audited-index.html
python3 scripts/export_v2.py --source-mode combined --output frontend/public/data
```

The source URL above is the original public same-commit HTML. No private upstream repository is used.
Importer validation requires its exact audited hash, matching unique ID sets and row counts, and
matching title, ticker, URL, posting date, last-seen date and reported open status for all 86,144 rows.
An accepted supplement is archived as `typed-supplement.html` and recorded in the report. A mismatched
supplement is archived under the quarantine filename with a reason; CSV import remains usable with
unknown currencies. Export independently rechecks accepted supplement bytes and shared-field alignment.

Only currency recovery is used. Before recovering it, native low/high values must match CSV values at
the source formatter's precision and the pay period must agree. Mismatches remain ineligible and receive
`typed_pay_mismatch`. Typed annual pay maxima are never trusted: annual values are recomputed from native
bounds and validated periods. Unknown currencies, nonfinite/negative/inverted values, unsupported
periods and suspicious annual maxima remain excluded as applicable. USD pay summaries count only valid
USD records; other currencies are not silently converted.

An intake rerun without `--typed-supplement` produces the safe CSV-only method again. Include that option
when intentionally reproducing the initial release's eligible salary population.

## Local evidence and merge behavior

`scripts/export_v2.py` opens optional `data/lens.db` through SQLite `mode=ro`; it does not call the legacy
store connector or run migrations. It preserves the existing complete-inventory closure rules and reads
actual local observation timestamps. Normalization happens privately; the existing
`scripts/public_data.py` posting allowlist forms the local publication boundary, with explicit skill
and license ID conversion. Descriptions, matched snippets, raw records and source-company notes are
not exported.

Exact `ticker:source requisition ID` identifies overlaps. The pipeline retains three separate public
record populations: `combined`, `upstream` and `local`. Combined counts a shared ID once; switching
source mode selects that source's own values instead of relabeling a merged record.

Merge freshness compares supported source/observation dates, with local evidence preferred on the same
day. Groups preserve availability, dates, locations, pay and skill semantics. All-null locations do not
replace meaningful locations. Missing qualification fields fall back individually to established
non-null values. `provenance` records each group's primary source; sparse `fieldProvenance` entries
override that source for individual fallback qualification fields. Conflicting non-null group values
remain marked. False, zero and unknown values retain distinct meanings.

Imported records never gain fabricated local first/last observations, inventory completeness or closure
events. Absence from an imported release does not close a local record. Combined analyzed-description
coverage follows the chosen skills source: upstream-sourced skills keep `hasDescription: null` even
when the same ID also has local evidence. Source mode and denominator remain necessary context for
skill shares. This is a cross-section, not a hiring-growth series or employee-supply estimate.

## Export and public contract

```sh
python3 scripts/export_v2.py
python3 scripts/export_v2.py --intake-dir .private/upstream/7e415fe62d0597e9c6c806bf813b30f8e8c88c98 \
  --local-db data/lens.db --output frontend/public/data
```

`--source-mode` is a documented compatibility argument: the exporter always emits all three modes and
the application defaults to combined. It does not discard the other populations. Do not interpret it
as a source-data filtering or privacy control.

[`release.schema.json`](../frontend/src/data/contracts/release.schema.json) is the strict draft-07
JSON Schema contract. `scripts/v2_data.py` validates the supported schema subset during export; the
frontend independently validates public inputs/output against the shared schemas. Every posting has
explicit nullable unknown fields, source IDs, availability/as-of/source basis, quality flags,
group provenance and sparse field overrides. Nested objects reject undeclared fields.

The public layout is:

```text
frontend/public/data/manifest.json
frontend/public/data/releases/<datasetVersion>/companies.json
frontend/public/data/releases/<datasetVersion>/taxonomy.json
frontend/public/data/releases/<datasetVersion>/sources.json
frontend/public/data/releases/<datasetVersion>/summary.json
frontend/public/data/releases/<datasetVersion>/postings-combined-000.json
frontend/public/data/releases/<datasetVersion>/postings-upstream-000.json
frontend/public/data/releases/<datasetVersion>/postings-local-000.json
```

Posting shards contain `{sourceMode, postings}` with at most 5,000 records. The manifest lists each
relative path, kind, source mode, record count, byte length and SHA-256. Catalogs supply stable company,
occupation, skill, license and source references. Summary counts and denominators are source-specific.
An empty local population has no local posting shard and an explicit zero count.

Canonical serialization is Python JSON with sorted object keys, compact separators, UTF-8 text and no
nonfinite numbers. Dataset identity hashes canonical schema/method/count/input-release metadata and
artifact content hashes; operational build/retrieval timestamps are excluded. Local input release
hashes describe sanitized normalized local content, not private descriptions. Per-file hashes describe
the actual published UTF-8 bytes. Consumers verify those bytes before decoding rather than hashing
newly serialized JavaScript objects. Shards omit dataset-version self-references to avoid circular
hashes. The manifest is activated only after artifact validation and writes, through a temporary-file
replacement. Retain app and data versions together for a release rollback.

## Operating without a private database

A missing local file is supported; a corrupt or unreadable database is an error rather than silently
missing evidence. To produce a separate upstream-only staging release while preserving the current
public artifacts:

```sh
V2_NO_DB_DIR="$(mktemp -d)"
python3 scripts/export_v2.py \
  --local-db "$V2_NO_DB_DIR/missing.db" \
  --output "$V2_NO_DB_DIR/public-data"
```

This produces identical upstream/combined populations, a zero local population,
`localEvidenceAvailable: false`, and an explicit limitation. It does not create the missing database.
The ordinary frontend build consumes pre-exported public files and requires neither private SQLite nor
network collection. Run intake/export locally as bounded ingestion work; Vercel builds only the static
frontend and its validated public artifacts. No credentials or `VITE_*` secrets belong in the payload.

## Verification and initial release evidence

At data-lane handoff, all **28 Python tests** passed:

```sh
python3 -m unittest discover -s tests -v
python3 scripts/check_publication.py
```

The suite covers identity/field conflicts, preserved observations, unknowns, salary safeguards, typed
supplement hash/shared-field/bounds checks, nested private-field rejection, corrupt/missing databases,
CSV tampering, deterministic fixture exports and private sentinels in discarded source notes/derived
JSON. The V1 checker still reported 92 public postings. Real export verified that the private database
SHA-256 stayed unchanged. Independent artifact verification checked all 41 byte hashes/lengths, shard
limits, unique identities, catalog/source/provenance references, exact mode counts and set reconciliation.

| Initial typed release measure | Result |
|---|---|
| Dataset version | `9bd992ecffd1bb6fad5a0715ca8c38a75b1bb4416df342c49abbb02a38b8de28` |
| Upstream accepted postings | 86,144 |
| Local postings | 92 |
| Combined distinct postings | 86,190 |
| Exact ID overlaps | 46 |
| Rejected CSV rows | 0 |
| Eligible validated USD pay: combined / upstream / local | 28,246 / 28,246 / 3 |
| Full export time in this workspace | 87.41 seconds |
| Combined posting JSON bytes | 140,925,161 |
| Combined gzip level-6 size estimate | 7,041,786 bytes |

The gzip number is an offline compression measurement, not a measured deployed transfer size or
browser-ready time. The three populations use separate files, so loading combined need not transfer
upstream and local duplicates. Browser parsing, worker memory, mobile performance and serving
compression still require the frontend/release acceptance gates.
