# V2 data agent: execution handoff

Status: team setup and repository inspection only, 2026-10-16. No V2 ingestion, merge, application code,
API collection, or deployment has been performed by preparing this handoff.

Authority: [V2 specification](../V2_DESIGN_SPEC.md),
[implementation backlog](../V2_IMPLEMENTATION_BACKLOG.md), and
[pinned upstream audit](../V2_UPSTREAM_SOURCE_AUDIT.json). V3 workforce/profile work remains separate.

## Ownership and boundaries

The V2 data agent owns WP01 (data intake) and WP02 (data contract, identity, merge, public export).
The frontend agent owns WP03 onward and consumes validated public releases. The coordinator resolves
cross-agent contract decisions and integration order. This document is the only file owned during setup.

Proposed implementation ownership, to be allocated before coding:

| Data agent owns | Shared review or dependent owner |
|---|---|
| `scripts/import_upstream.py`, `scripts/export_v2.py`, private intake/storage adapters | Coordinator reviews privacy and reproducibility |
| Python intake, merge and publication tests | Frontend supplies cross-language contract fixtures |
| JSON Schema documents under `frontend/src/data/contracts/` | Frontend reviews names/types before first implementation; one writer at a time |
| Explicit V2 publication extensions in `scripts/check_publication.py` | Keep existing V1 validation; frontend owns compiled-output invocation |
| Sanitized versioned release artifacts and import/merge reports | Frontend owns loading, query worker, visual/metric interpretation |
| Proposed ignore rules for intake archives | Coordinator reviews repository exclusions |

Do not edit the collector's historical tables to accommodate imports. Do not change the live V1 site,
run a collector, retrieve employee profiles, purchase a service, or add a vendor integration during V2.

## Verified repository state

These observations come from local source and committed reports, not a new source download or import.

* `scripts/build_dataset.py` reads optional local SQLite evidence through `collector/store.py`,
  normalizes with `normalize/{parse,skills,soc}.py`, applies `PUBLIC_POSTING_FIELDS`, and builds
  `web/data.json`, the embedded `web/index.html`, and a richer private normalized CSV. Calling it would
  regenerate V1 outputs; it is not the V2 exporter.
* `scripts/public_data.py` defines the local posting and snapshot allowlists. Private evidence such as
  description text, extraction/pay snippets, and raw responses must remain excluded. The existing
  publication projection is the input boundary for the local-to-V2 adapter.
* `collector/store.py` maintains `postings`, `posting_versions`, `observations`, and `snapshots`.
  Missing records become possibly closed/closed only after qualifying complete inventories. Its
  `load_postings()` calls `connect()`, which can migrate the database. A V2 adapter must avoid accidental
  evidence mutation; prefer a read-only compatible reader or a private copied database for migrations.
* `scripts/check_publication.py` checks embedded V1 row-field names, row lengths, snapshot fields and
  tracked private paths. It does not yet validate V2 manifests, nested contracts, worker assets,
  all arbitrary top-level fields, or final build output. Those are new WP02/WP03 responsibilities.
* `scripts/export_csv.py` writes V1 presentation CSVs with formatted pay and `Yes`/`No` equivalence.
  These lose distinctions needed by V2 and should not be the preferred local evidence input.
* `tests/test_pipeline.py` already covers incomplete/failed runs, history versions, dates, pay flags,
  and collection completeness. `tests/test_publication.py` checks the V1 publication boundary.
  `.github/workflows/checks.yml` runs Python unittest discovery and the publication checker.
* `.github/workflows/pages.yml` publishes `web/` on matching main-branch changes. V2 data work must
  avoid unintentionally regenerating or changing those files. Vercel is the proposed V2 destination,
  not a currently configured deployment verified by this inspection.
* No `frontend/`, `scripts/import_upstream.py`, or `scripts/export_v2.py` currently exists.

`data/quality-report.json` reports 92 local postings, seven employers, four complete and three partial
latest inventories, and one collection date (2026-10-16). The upstream audit records 86,144 rows,
310 employers, 46 exact local-ID overlaps, and a candidate union of 86,190 IDs. Those upstream numbers
are expectations for the pinned audited files, not a merged V2 release or guaranteed accepted count.

## Ordered execution plan

1. Freeze intake inputs at audited commit `7e415fe62d0597e9c6c806bf813b30f8e8c88c98`.
   Implement explicit SHA intake and dry-run reports first; optional latest refresh resolves one SHA
   before fetching any file. Verify bytes/hashes against the audit before normalization. Establish an
   ignored intake location such as `.private/upstream/<sha>/` and reject reports outside public paths.
2. Validate CSV encoding, headers, typed values, IDs, and HTTP(S) URLs. Report raw/accepted/rejected
   counts with reasons and duplicate IDs. Preserve source files and import-version metadata privately.
   Never copy unfiltered source-company notes or source text into a public artifact.
3. Store upstream releases separately from local history. The optional same-commit embedded supplement
   must pass ID/count/shared-field checks; quarantine it on mismatch and continue with explicit unknowns.
4. Agree the contract below with the frontend owner before WP03 relies on it. Commit contract fixtures
   and implement validation in both languages against the same schema; reject unknown nested keys.
5. Adapt the local allowlisted projection and upstream records separately. Keep exact IDs as identity;
   retain source variants for overlaps, source-specific values, field-group provenance and conflicts.
   URL similarity produces review candidates; title matching never silently merges records.
6. Apply the versioned merge policy. Rank freshness by supported observation/release dates, use local
   evidence to break equal-quality ties, and preserve non-null conflicts. Never manufacture local
   first/last observations, closure events, or collection completeness from imported data.
7. Export small immutable public shards, source/company/taxonomy catalogs, summaries, and an activation
   manifest. Hash canonical sanitized content independent of build timestamp. Validate all files,
   links, counts, source modes and privacy before atomically activating a new manifest.
8. Hand the frontend owner a real imported release and sanitized adversarial fixtures with a report
   of actual accepts/rejects/overlaps, conflicts, source coverage, pay eligibility and unknown text.
   Run acceptance gates with WP03 rather than approving an importer in isolation.

## Proposed shared contract decisions

The V2 specification's TypeScript sketch is authoritative in intent but incomplete as an executable
schema. Resolve the following with the frontend owner and record a schema/method version before coding.

| Topic | Proposed agreement |
|---|---|
| Shared authority | JSON Schema files in `frontend/src/data/contracts/`, strict objects recursively; derive or verify TypeScript types against those files. Python validates against the same schema, not a separately evolving field list. |
| Identity | Stable `company ticker:source requisition ID`; source release IDs and canonical IDs are separate. Taxonomy IDs are stable strings, never local array offsets. |
| Source modes | `combined`, `upstream`, `local`; export source-specific public variants keyed by canonical ID, or a schema-approved separate variants shard. Source mode must change actual queried values/statuses, not only labels or membership filters. |
| Availability | Retain spec enums `local_observed`, `upstream_reported_open`, `possibly_closed`, `closed`, `unverified`; document `local_observed` as supported local open availability. A closed value also carries source/as-of basis; unknown dates never become build dates. |
| Field lineage | Explicit sanitized source/method references for status, date, location, pay, skills and qualifications, plus conflict groups. Place these in a strict posting field or keyed provenance shard after agreement; never publish raw lineage JSON. |
| Unknowns | `null` for unknown scalar values; `hasDescription: null` for unknown upstream coverage. Empty skill IDs are not proof that a description was analyzed. Equivalent-experience false means not detected, not rejected by an employer. |
| Pay/location | Retain original numeric units/currency and validation flags; annual values only when validated. Location precision and primary designation are explicit. Evidence snippets and raw location text are excluded unless separately approved as public structured fields. |
| Manifest | `schemaVersion`, content-derived `datasetVersion`, input release references, method versions, per-file hashes/counts, unique totals, import outcomes, overlaps, source-mode summaries and separate build timestamp. Exact key names freeze with schema. |
| Shards | At most 5,000 posting records each; deterministic canonical ordering. No full CSV transfer on initial page load. All variants/shards participate in hash and count validation. |
| Summary semantics | Counts use distinct canonical IDs in each source mode, identify eligible population and unknown buckets, and do not equate upstream reported status to local verification. |
| Frozen cohorts | A frozen cohort includes canonical IDs, dataset version and source mode. On release mismatch, retain the old immutable release or require an explicit, reported migration; never silently recompute membership against new values. Coordinate this storage/query behavior with the frontend owner. |

Release hashing must cover all analytically meaningful source variants and sanitized provenance. Define
which fields are excluded as operational timestamps, canonical serialization, shard ordering, and the
schema for manifest self-reference so a release is reproducible without circular hashes.
Per-file SHA-256 should verify the actual published UTF-8 bytes; dataset identity should use the
agreed canonical-content algorithm. The frontend must verify bytes before decoding rather than
hashing a newly serialized JavaScript object and assuming equivalence with Python serialization.

The source-variant representation, byte/canonical hashing rules, and frozen cross-version cohort
behavior are unresolved contract gates for coordinator approval. None is an existing implementation.

## Acceptance commands and tests

Existing baseline commands are available now; they should pass before and after implementation:

```sh
python3 -m unittest discover -s tests -v
python3 scripts/check_publication.py
```

Target commands from the V2 specification are planned and do not currently exist:
The examples use `python`; this workspace currently exposes `python3`, so use that executable or an
activated project virtual environment when these commands are implemented.

```sh
python scripts/import_upstream.py --commit 7e415fe62d0597e9c6c806bf813b30f8e8c88c98 --dry-run
python scripts/import_upstream.py --commit 7e415fe62d0597e9c6c806bf813b30f8e8c88c98
python scripts/export_v2.py --source-mode combined --output frontend/public/data
```

Agree fixture and local-input CLI options before implementation so CI can test an offline sanitized
fixture and the absent-private-database case without reading or moving a user's actual evidence DB.
The frontend owner will implement `npm run check`, `npm run test:e2e`, and `npm run build`; data contract
fixtures, source-mode reconciliation and sentinel checks must be included in those gates.

Meaningful tests to add, mapped to the existing acceptance scenarios:

* **AT01:** valid pinned files reproduce the audited hash/row inventory; changed hash, invalid header,
  invalid ID/type and unsafe URL fail or quarantine as specified. Refresh never mixes commits.
* **AT02:** an exact overlap counts once in combined mode while each source mode preserves its values;
  local-only/upstream-only IDs remain; title collisions and shared location URLs do not collapse IDs.
  Newer-source status conflicts retain source/as-of/provenance without creating local observations.
* **AT03:** a genuinely absent local database yields the upstream-only release and an explicit local
  evidence warning. A missing database is distinguished from an unreadable or corrupt database.
* **AT08:** unknown dates, clamped upstream dates, unknown currency, inferred periods and suspicious
  salary maxima remain flagged/ineligible as required. Unknown description coverage stays unknown.
* **AT13:** private sentinel strings and forbidden keys injected at each nesting level, source notes,
  manifests and intermediate inputs cannot enter public data, worker assets, CSV exports or built
  output. Unexpected nested fields and secret/SQLite/raw archive paths fail validation.
* **Release integrity:** repeated equivalent exports have identical dataset versions; changed values
  change versions; missing/corrupt shards, mismatched record counts, broken references and duplicate
  IDs fail activation. Source-mode summaries equal distinct-ID queries over their corresponding variants.

## Risks and definition of done

Biggest integration risks are treating 86,190 as a promised import count, using a merged row to fake all
three source views, publishing raw notes through provenance, dropping false/unknown distinctions, and
using posting date as evidence freshness. A single source snapshot remains a cross-section; collection
history, hiring growth, labor-market representativeness and employee supply cannot be inferred from it.

WP01/WP02 are done when the pinned import is reproducible; rejects and actual union counts are reported;
source-specific records and merge decisions are traceable; private local history is unchanged; absence
of private data is supported; strict schemas and immutable release integrity pass in Python and the
frontend; the complete public output passes sentinel checks; and frontend WP03 can query real upstream
scale using the agreed contract. No public release is implied by completing those packages: preview,
usability, browser and final release gates still belong to later backlog packages.
