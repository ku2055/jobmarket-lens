# V2/V3 agent execution setup

Created 2026-10-16. Status: **V2 implementation built as a review candidate** on `feat/v2-workspace`.
V3 remains design/research only.

The user requested subagent setup for the upgrades. Three lead agents are assigned focused readiness work, with Luna available for bounded groundwork.
Their sessions can be resumed during this conversation; persistent instructions live in
[AGENTS.md](../AGENTS.md), so later sessions can recreate the same roles. Agent sessions are not a
background service and do not continue running after their assigned work finishes.

## Team and exclusive deliverables

| Lane | Session task | Owned readiness document | Later scope |
|---|---|---|---|
| Coordinator | `/root` | This plan and root instructions | Contract decisions, task dependencies, integration, release checks |
| V2 data | `/root/v2_data` | [Data handoff](agents/V2_DATA_HANDOFF.md) | WP01–WP02 import, merge, provenance and publication |
| V2 application | `/root/v2_frontend` | [Frontend handoff](agents/V2_FRONTEND_HANDOFF.md) | WP03–WP09 UI/analysis/testing, WP10 release preparation |
| V3 research | `/root/v3_readiness` | [V3 handoff](agents/V3_RESEARCH_HANDOFF.md) | Separate design/research backlog; no real profile ingestion |

Readiness agents may inspect existing code but write only their handoff files. They must distinguish
existing behavior from proposed commands and tests. No overlapping application changes are assigned.
The coordinator reviews the documents together before reporting setup complete.

## Luna as the groundwork worker

Routing: `gpt-6-luna`, medium reasoning, a fresh context (`fork_turns="none"`) containing only the task
and necessary instructions. The initial assignment is a read-only local link/JSON audit; it does not
edit another lane's documents. Luna's use here is a proposed workflow, not a measured quality or cost
comparison with the lead models.

| Package | Suitable Luna assignment | Lead retains |
|---|---|---|
| Setup/research | Inventory files; check local links, JSON and source-register consistency | Source credibility, licensing interpretation and recommendations |
| WP01–WP02 | Check documented header/count/hash expectations; implement a narrowly specified helper | Identity/merge policy, authoritative contracts and publication boundaries |
| WP03–WP08 | Apply approved labels/styles; isolated presentational components; mechanical type updates | State/worker architecture, formulas, denominators and interaction design |
| WP09–WP10 | Run assigned existing checks; summarize failures; assemble release evidence | Check adequacy, privacy review, production decisions and rollback verification |
| V3 design | Maintain decision inventories and format documented evidence | Sampling, comparability, rights, provider selection and future evaluation scope |

Initial Luna audit result (2026-10-16): all 14 relative file-link occurrences resolved, and the source
register parsed with 18 distinct supplied URLs. URLs and anchors were intentionally outside this check.
No files were edited by that audit. Local Python commands should use `python3`; `python` is unavailable
in the current environment.

A task brief must name exact inputs, owned paths, forbidden operations and objective acceptance checks.
Use a fresh read-only task for discovery; expand to edits only when the specification is sufficiently
clear. Require exact commands, observed outputs and unresolved issues. The coordinator reviews diffs
and evidence before integration. A failing check is reported accurately; Luna must not weaken tests
to make an assignment pass.

Concurrency limit: coordinator plus at most three active workers. During V2 execution a useful
allocation is coordinator + data lead + frontend lead + Luna. Schedule V3 research separately or swap
an idle lane. Agent sessions finish when their task finishes; Luna is not a continuous background job.

## Implementation dependency order

1. Data lane implements pinned intake/audit (WP01), then isolated source storage, identity/merge,
   versioned schema and public export (WP02). Coordinator reviews strict schema, source-mode semantics,
   dataset-version rules and privacy boundaries before frontend consumers rely on them.
2. Frontend lane can inspect/design shell and queries concurrently, but cannot finalize data-dependent
   behavior until the public contract is frozen. Build WP03 against contract fixtures and validate
   against the real full-scale release; do not substitute a 92-row demo for scale evidence.
3. Complete Explore, Compare, Skills, Evidence, sharing and export (WP04–WP08), preserving one selection
   model and matched contributor sets. Coordinate new metric definitions through the shared registry.
4. Run WP09 acceptance and accessibility/privacy checks. Document manual usability work honestly;
   automated browser checks do not substitute for the specified user sessions.
5. Prepare Vercel deployment (WP10), validate preview/deep links/public payloads, and record versioned
   app+data rollback before production release. Keep V1's Pages baseline intact.
6. V3 research proceeds independently. Real-data evaluation, implementation and release each retain
   their own gates. V2 implementation does not enable them automatically.

## Contract decisions to resolve before frontend implementation

The readiness review identified these integration gates:

- A single merged record cannot reproduce upstream-only and local-only values. Freeze a source-specific
  lookup/projection representation alongside combined resolution, including field-group provenance.
- Choose the shared schema authority and Python/TypeScript validation strategy; JSON Schema is a
  candidate, not an already adopted dependency.
- Specify exact bytes and canonicalization for dataset/file hashes so export and browser checks agree.
- Specify whether a frozen cohort can resolve only in its original dataset version and how an unavailable
  historical version behaves. Do not silently re-run it against current records.
- Include conflicts, unknowns, upstream-only operation and privacy sentinel cases in shared fixtures.

These are implementation design decisions, not completed functionality.

## Task brief required for every implementation assignment

Specify package IDs, base commit/branch, exact writable paths, frozen input contracts, expected outputs,
acceptance scenarios, commands to run and prohibited operations. Require a report containing changed
files, actual check results, remaining uncertainty and decisions needed. Stop dependent work on a
contract conflict; continue independent work. The coordinator resolves shared-file ownership.

Use worktrees/branches for future implementation lanes if edits overlap. Integrate dependency order,
review diffs for public-data leakage, and run only checks relevant to the integrated changes. Do not
claim a release complete based solely on a subagent report.

## Current boundaries and completion criteria

- Setup completion: three reviewed handoffs, persistent coordination rules and validated document links.
- V2 implementation completion: mandatory AT01–AT15 and release evidence from the [specification](V2_DESIGN_SPEC.md).
- V3 current completion: actionable research/design handoff with unresolved rights, coverage and cost
  explicitly recorded. No purchases, credited calls, employee collection or V3 code in this task.

The setup did not select a paid provider or provision Vercel. Current implementation evidence and
remaining release gates are recorded in the [V2 build report](V2_BUILD_REPORT.md).
V2.5 is a separate [Node/data-virtualization design](V2_5_NODE_DATA_VIRTUALIZATION_DESIGN.md) for review;
V3 remains design/research only.
