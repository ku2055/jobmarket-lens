# V2 frontend and release handoff

Prepared 2026-10-16. Status: execution readiness; no V2 application work has started in this handoff.
Scope: WP03–WP10 in the [implementation backlog](../V2_IMPLEMENTATION_BACKLOG.md), governed by the
[V2 specification](../V2_DESIGN_SPEC.md). V3 employee/profile integrations remain outside V2.

## Current integration points

The current application is a standalone V1 page. `web/template.html` is its editable source and
`scripts/build_dataset.py` produces `web/index.html` with a compressed embedded dataset. The template
also contains a `data.json` loading fallback. Do not reuse that fallback as the V2 publication contract:
the current publication check rejects tracked `web/data.json` and checks the embedded payload.

`scripts/public_data.py` defines the permitted local posting and snapshot projection.
`scripts/check_publication.py` checks embedded field names, row lengths and tracked private paths.
`tests/test_publication.py` covers forbidden posting fields, private snapshot details and rejection of
an embedded private field. These checks protect V1; they do not yet validate V2 manifests, workers,
chunks, browser storage or compiled bundles.

`.github/workflows/checks.yml` currently installs Python requirements, runs
`python -m unittest discover -s tests -v` and `python scripts/check_publication.py`.
`.github/workflows/pages.yml` publishes `web/` on its configured path changes or manual dispatch.
There is no `frontend/`, Node package manifest/lockfile, JS test suite, browser test harness, query
worker or Vercel configuration in the reviewed baseline. Commands proposed in the specification are
deliverables to create, not commands that already work.

Keep V1's generated page, template and Pages workflow outside the frontend execution owner's edits.
Shared publication-code changes require data-owner review because the Pages workflow watches them.
Do not run a local V1 rebuild merely to develop V2.

## Ownership and dependency contract

These are execution responsibilities, not a requirement to run all roles concurrently. Use at most the
available agent capacity; reserve the coordinator for integration and resolving shared-file changes.

| Role | Primary ownership | Explicit handoff |
|---|---|---|
| Data owner, WP01–WP02 | Import/merge/export Python, strict publication schemas, release artifacts and audit | Reviewed contracts and a validated real release before frontend integration |
| Frontend foundation owner, WP03/WP08 | `frontend/src/app/`, query engine/worker, loading, shared state, URL/state import/export | Stable typed interfaces and small fixtures before workspace development |
| Workspace owner, WP04–WP07 | `frontend/src/features/`, shared visual controls and record/evidence views | Uses the shared query API; adds no independent filtering or metric formulas |
| Quality/release owner, WP09–WP10 | Browser acceptance suite, measurements, frontend CI integration and Vercel release record | Verifies compiled artifacts and preview; coordinator approves promotion gates |

The foundation owner initially owns `frontend/package.json`, lockfile, build configuration and shared
test setup. Other owners request dependency/script changes through that owner. Schema changes go
through the data owner. Chart/table components request data through engine APIs rather than importing
raw shards or reaching into worker indexes.

### WP02 must settle these points before WP03 is integrated

The data lane proposes JSON Schema as the shared contract authority. This is not frozen yet: the
coordinator must approve that choice, its Python/TypeScript validation approach and the decisions
below before consumers implement them. Prefer one authoritative schema with generated/validated
consumer types over two independently maintained definitions.

1. **Source-specific values.** The proposed `PublicPosting` contains one resolved value per field.
   Define how `upstream` and `local` modes obtain their own values for overlapping IDs: source-specific
   stores, a documented adapter or another strict published representation. Source membership alone
   cannot reconstruct pay, status or skill differences. Provide a conflict fixture demonstrating all
   three modes. Never send private lineage to the browser to solve this problem.
2. **Manifest activation and integrity.** Specify supported schema versions, hashing bytes and
   canonicalization, dataset-version computation, shard ordering/counts, taxonomy references, and
   error behavior. Validate the complete release before exposing full-population results. Define
   whether summary counts are usable while detailed shards are still loading and label that state.
3. **Metric/query payloads.** Finalize strict filter enums/null semantics, availability scope,
   facet-count rules, paged record order, metric denominators, missing/excluded counts and contributor
   retrieval. Choose stable ordering with an ID tie-breaker for repeatable pages and exports.
4. **Version retention.** A pinned cohort references its dataset version, source mode and predicate
   or IDs. Define handling when that version is unavailable or A/B use different versions. Block or
   explicitly explain unsupported combinations; never evaluate an old cohort against the new release
   silently. URL/state import must validate version and IDs before application.
5. **Description/text eligibility.** Supply a public, validated basis for local analyzed-text metrics
   without shipping descriptions or evidence snippets. Unknown upstream description coverage cannot
   enter the local analyzed-text denominator.
6. **Pay and provenance.** Complete `PublicPay`, `PublicLocation`, method-version and source metadata
   schemas. Include validated pay rejection flags and meaningful as-of dates. Specify which public
   source/method details the evidence drawer can show.

Use small synthetic fixtures while contracts are being agreed, clearly labeled as fixtures. Do not
present a fixture-backed screen as a completed real-data upgrade.

## Execution sequence

| Step | Deliverable | Exit evidence |
|---|---|---|
| 1 — WP03 foundation | Self-contained React/TS/Vite root, typed reducer, worker protocol, release loader, engine benchmark | Same queries over a small oracle fixture and the real imported release; recorded engine decision |
| 2 — WP04 Explore | Scope bar, shared filters/search, aggregate occupation/level overview, deterministic drill-down, accessible record tray | AT04/AT05/AT12; full selected population accounted for |
| 3 — WP05 Compare | Frozen A/B cohorts, metric registry, aligned scales, overlap and pay readiness | AT06–AT08 against hand-computable fixtures and real data |
| 4 — WP06 Skills | Matrix first, focused support-gated graph, contributor inspection | AT09; denominator and support visible; useful empty states |
| 5 — WP07 Evidence | Public source/method drawer, conflict/missingness explanations, time/geography readiness | AT08/AT10/AT13; no unsupported inference |
| 6 — WP08 sharing/export | Validated versioned URLs, Back/Forward, state-file overflow fallback, safe CSV | AT05/AT11; round-trip and ID-set equality |
| 7 — WP09 quality | Compiled-app browser suite, payload inspection, performance and formative usability evidence | Mandatory AT04–AT13 pass at real scale and local-only fixture |
| 8 — WP10 release | Vercel preview, environment-specific checks, release/rollback record | AT14/AT15 plus accepted complete V2 preview |

Steps 2–5 may overlap only after the shared state, metric, worker and evidence contracts are stable.
Optional projection/geography/trend views are gated additions with tested fallbacks, not reasons to
delay the complete core application or to relax mandatory gates.

## Acceptance checks that matter

These are checks to implement, not claims of existing coverage or passing results. Prefer a small
deterministic oracle fixture with deliberately conflicting source values, overlapping A/B IDs, empty
skills, unknown fields, invalid pay and missing history. The oracle's expected sets and denominators
must be calculated independently from the engine implementation.

### Shared query and worker

- Apply OR within a categorical field and AND across fields, then change the unknown-value toggle.
  Verify the exact result IDs and facet counts with each facet's own constraint excluded.
- Compare engine counts, contributors, paginated table IDs and exported IDs for the same committed
  state. Aggregated chart marks may represent multiple records, but their totals cover that full set.
- Delay response A, issue newer request B, then deliver A. The UI keeps B's state/result; cancellation
  or stale-response rejection does not erase the newer loading/error state.
- Fail one shard or hash and attempt a comparison. No partial denominator is shown as complete; the
  last complete release remains intact. Test retries and switching releases without mixed versions.
- Navigate repeatedly and dispose/recreate the worker. Requests finish or cancel predictably; charts
  do not retain obsolete subscriptions or duplicate the complete dataset on the main thread.
- Benchmark the in-memory worker against the evaluated alternative with identical queries and data.
  Record compressed transfer, parsing/index time, response p95, long tasks and memory on named devices.
  Use the actual imported release plus a labeled 100k synthetic fixture. Targets are ≤2.5 s to useful
  summary and ≤300 ms p95 committed filtering after load; neither is an existing measurement.

### Cohorts, metrics and evidence

- Pin A, change filters/source mode, pin B and reload a saved state. A retains its original definition
  and version; `|A ∩ B|`, denominators and contributor records match the oracle.
- Exercise empty cohorts, known versus unknown arrangement, local versus upstream skill coverage and
  equivalent-experience “not detected.” Unknown remains distinct from false or zero.
- Test pay eligibility and the 9/10/29/30 eligible-record boundaries. Unsupported currency, invalid
  ranges and missing period remain excluded with reasons; the presentation does not imply earnings.
- Confirm a skill counts once per posting, graph support is at least 3, and no more than the specified
  five neighbors per selected skill and 30 edges are shown. The matrix remains available without a graph.
- Inspect an upstream-normalized date, a local observation and a source conflict. Each has its correct
  basis/as-of/source. Current insufficient history produces a concrete readiness explanation.

### Sharing, export and accessibility

- Serialize/reload each route and use Back/Forward. Only committed transitions enter history.
  Invalid enums, unknown schema versions, invalid record IDs and malformed state receive useful errors.
- Exceed either the 256-ID or 8 KiB URL budget. Offer validated state-file download/import without
  truncation. Reject unexpected fields and private material in imported state.
- Export quoted commas, quotes, newlines, Unicode and spreadsheet formula-like text safely. Re-import
  with an independent CSV parser to check field boundaries and ID-set equality. Explain any exported
  text escaping; a protected title must not become executable spreadsheet input.
- Complete find → inspect → pin A/B → compare → export with keyboard only. Focus is visible; overlays
  trap/restore focus appropriately; Escape closes dismissible panels; list/table alternatives expose
  canvas information and controls with useful labels and counts.
- Repeat core tasks at mobile widths without hover, brushing or drag-only controls. Filter and cohort
  sheets remain operable; the page does not overflow horizontally. Verify reduced-motion settings,
  meaningful non-color encodings, contrast and announcements of loading/error/result changes.
- Inspect actual `dist`, network responses, workers and browser caches for a private sentinel used in
  the export tests. Validate both source and compiled artifacts; a passing V1 check is insufficient.

## Vercel and release gates

Follow the [deployment section of the specification](../V2_DESIGN_SPEC.md#11-vercel-deployment-design).
The intended root is `frontend`, output `dist`, Vite base `/`. Exported public artifacts, validators,
contracts and build scripts must be self-contained there. A Vercel build must not read private SQLite,
invoke collection, download changing upstream inputs or require private-data credentials.

Do not connect a production deployment while only a shell or individual workspace is complete. Keep
the V2 work on its implementation branch and preserve the current V1 Pages baseline. Before later
promotion, confirm the actual account's project access, preview protection and plan limits; these are
not configured by this handoff.

Required evidence before promotion:

- All mandatory acceptance scenarios pass against the real imported release and local-only fixture;
  CI covers Python publication and frontend checks. The frontend build itself enforces type, unit and
  public-artifact gates so preview success cannot bypass those requirements.
- Actual preview checks cover `/`, all four deep-link reloads, query strings, trailing-slash handling,
  same-origin data fetches, JSON content types and genuine missing-shard/asset errors. Missing JSON
  must never receive `index.html` through an overbroad SPA rewrite.
- Mutable app/manifest caching and immutable versioned release caching are verified on the host.
  Changing releases cannot combine old application assumptions with incompatible data.
- Desktop/mobile review, payload inspection, performance measurements and the planned 5–8 formative
  sessions are recorded. Measure the specification's task-completion target rather than claiming
  success from screenshots or personal preference.
- Record commit, schema/dataset/method versions, preview/deployment ID, accepted import/reject/overlap
  totals, test evidence and known limitations. Identify the previous good app-plus-data deployment.
- After authorized promotion, verify the production alias, release identity, core journey, export,
  data boundary and V1 baseline. Demonstrate rollback restores the paired code and dataset.

## Immediate blockers and next assignment

WP03 integration is blocked on WP01/WP02 artifacts and the six contract decisions above; a foundation
owner may scaffold against explicit fixtures meanwhile. Vercel account/project configuration and
usability participants are later external dependencies, not reasons to stop data/foundation work.

The next concrete frontend assignment is **WP03 only**: establish the self-contained frontend toolchain,
agree the worker/state/manifest interfaces with the data owner, and benchmark the candidate engine on
the accepted real release. Subsequent workspace owners consume that handoff. No implementation,
dependency installation, deployment, purchase or profile collection was performed for this document.
