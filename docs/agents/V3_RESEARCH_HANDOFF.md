# V3 research agent handoff

Prepared: 2026-10-16. Current lane: **design and documentation research only**.

The user asked to set up agents for the upgrade. Their earlier restriction remains in force: V3 is a
separate design effort. Agent setup does not authorize API trials, vendor outreach, purchases, profile
collection, implementation or deployment. Advance this backlog through documentation and decision
records; leave execution gates closed until the user separately requests the corresponding work.

## Authority and ownership

Read these before taking a V3 task:

- [V3 design and API research](../V3_DESIGN_AND_API_RESEARCH.md).
- [Data-source due diligence](../DATA_SOURCE_DUE_DILIGENCE.md).
- [Source register](../DATA_SOURCE_REGISTER.json), including each candidate's evidence tier and open questions.
- [V2 specification](../V2_DESIGN_SPEC.md), especially publication contracts, cohort semantics and missingness.

The V3 research agent owns this handoff and future explicitly assigned V3 research documents. It may
propose changes to V2 contracts through the coordinating agent, but must not edit V2 code or expand its
scope. Keep each parallel assignment's file ownership explicit. The coordinator owns cross-lane
integration, approvals, commits, publication and release decisions. Do not infer authorization from a
different agent's activity or from a vendor offering a free quota.

## What is established and what remains open

| Established by existing documentation | Still unresolved |
|---|---|
| Demand, observed workforce and available talent are different populations | Initial geography, occupations, employers and time window |
| V2 excludes people APIs and person records | Which candidate actually covers those cohorts and required fields |
| All 18 supplied sources have a documentation-status register; no runtime tests were run | Endpoint reliability, data accuracy, history, update lag and usable-record cost |
| Proxycurl is excluded; official job feeds submit jobs into LinkedIn | Actual contracts, permitted storage and publication for a selected provider |
| Vendor profile display rights are not established for this project | Whether aggregate outputs, exports or identifiable cards are permitted |
| Public output defaults to aggregates; named examples need separate permission | Disclosure thresholds, differencing protection and correction/deletion operating process |
| No subscription selected and no spending approved | Exact quote, entitlements, commitment, cap and refresh budget |

Do not convert advertised corpus size into a coverage score. Pricing observations dated 2026-10-16 are
inputs for later revalidation, not live quotes. A documentation gap is an unknown, not a failed API test.

## Dependency agreement with the V2 lane

These are proposed interfaces to request from V2, not a claim that V2 has implemented them. The V3
design may proceed with placeholders while the coordinator resolves the actual contracts.

| Dependency | Required handoff | V3 design acceptance |
|---|---|---|
| Versioned taxonomy | Occupation/skill IDs, labels, version, mapping rules and unknown/unmapped state | Cross-domain mapping preserves original values and confidence; taxonomy upgrades are reproducible |
| Employer identity | Canonical employer IDs, source membership and ambiguous match policy | No person-employer join based only on a similar name; unmatched records remain explicit |
| Geography | Precision, normalized codes and remote/multi-location semantics | Use only supported common precision; remote posting is not worker residence |
| Cohort/query state | Predicate version, source mode, release IDs, time basis and saved-cohort semantics | Workforce and demand retain their own denominators, eligibility and observation windows |
| Provenance/coverage | Source IDs, release timestamps, source/observation date basis and completeness labels | Workforce panels add their own coverage rather than inherit posting completeness |
| Public publication boundary | Strict allowlist, schema/versioned manifests and validated public artifacts | No raw person data or credentials enter the V2 public schema; V3 projections require separate contracts |
| Evidence UI | Definitions, contributing units, method version and quality/unknown states | Every proposed comparison explains units and why an inference is or is not supported |

Escalate incompatible taxonomy/cohort changes to the coordinator before assigning implementation.
V3 must not block V2's posting-only release on a vendor decision.

## Documentation backlog

All deliverables below are proposed future documents, not files already created or assignments to run
paid evaluations. Complete design work first; record unresolved decisions with an owner and evidence.

| ID / order | Design-only deliverable | Completion evidence |
|---|---|---|
| V3-R01 / first | Cohort and question brief | One initial geography/occupation/employer panel and window; intended audience; populations and units; sampling limits; explicit non-goals |
| V3-R02 / after R01 | Endpoint and allowed-use matrix | Required fields mapped to documented endpoints; exact version/plan or unknown; separate internal use, retention, aggregates, exports and individual display decisions |
| V3-R03 / parallel with R02 | V2/V3 contract proposal | Resolve the dependency table above; document unknown values, confidence, source dates and migration/version behavior without changing V2 code |
| V3-R04 / after R02 | Evaluation protocol and cost worksheet | Fixed cohort queries, quality criteria, record/call caps, pagination/retry rules, proposed budget and stopping rules; no calls executed |
| V3-R05 / after R01 and R03 | Workspace interaction specification | Demand/workforce, skills, source-quality and optional transitions views; denominator labels, disagreement, unsupported and sparse states; keyboard/mobile behavior |
| V3-R06 / after R05 | Synthetic example scenario plan | Text-only scenario definitions below; no generated person records or running prototype at this stage |
| V3-R07 / after R02–R06 | Decision memo and gated delivery backlog | Compare eligible options, distinguish unknowns from measured results, document rejected options and user decisions required before later execution |

Each future research update should name its checked date, primary evidence, observed versus claimed
facts and remaining uncertainty. Update the existing register rather than inventing a competing source
inventory. Vendor communications require a separate user instruction to contact them.

## Candidate-to-decision map

Register IDs below refer to the existing machine-readable inventory. Endpoint families describe
questions for documentation review, not a promise that a plan grants access. Each candidate needs
source lineage, intended-cohort coverage, observation timestamps and output rights resolved before use.

| Candidate / register ID | Unresolved endpoint, coverage and cost decisions | Design disposition |
|---|---|---|
| TheirStack / `theirstack` | Search versus lifecycle webhook semantics; description/history entitlement; returned-job, company, refresh and webhook billing; permitted charts/exports | Future demand expansion only; compare with existing ATS panel, independently of workforce source selection |
| Proxycurl / `proxycurl` | No new connector decision; preserve discontinuation evidence and avoid assuming successor compatibility | Excluded from new backend; historical reference |
| NinjaPear / `ninjapear` | Employee search versus profile fields/history; pack quantity; search/detail chain; freshness; commitment and expiry; storage/output permission | Exploratory workforce/company candidate with its own agreement |
| TikHub API / `tikhub_api` | Actual employee/profile/job endpoint surface, complete-history call chain, pagination/retries/misses and tariffs; source provenance and downstream permission | Exploratory until those questions are settled; third-party service |
| TikHub SDK / `tikhub_sdk` | Compare pinned SDK/OpenAPI coverage with landing-page claims; missing methods and version/error behavior | Integration dependency review only; SDK license does not establish data rights |
| EnrichLayer / `enrichlayer` | Search completeness, selected profile options/version, skills/history/date fields, cache/refresh charges and retention/output rights | Candidate for later bounded PAYG evaluation |
| Coresignal / `coresignal` | Exact plan entitlement and rendered-limit discrepancy; core/full/bundle/search billing; field lineage, history and refresh cost; aggregate/card rights | Structured workforce candidate; credits are not equivalent to full records |
| Apollo / `apollo` | Existing-plan eligibility, search/enrichment/history fields, legacy/current charges and non-contact research use | Conditional candidate; do not buy contact data unnecessary to analysis |
| LinkedIn Profile / `linkedin_profile` | Approved program, granted scopes, storage and exact allowed member use | Approved-integration possibility; no assumed bulk workforce corpus |
| LinkedIn Lite / `linkedin_lite` | Current eligibility and identity-field scope; app-scoped IDs | Identity reference only, not employment history |
| LinkedIn Jobs terms / `linkedin_jobs_terms` | Which additional agreements apply to intended job collection and display | Policy input, not access or price evidence |
| LinkedIn feeds / `linkedin_job_feed` | Publishing arrangement only if a later product needs submission | Not an incoming inventory source |
| JobSpy / `jobspy` | Pin fork/package origin; permitted board-specific access/use; observed fields and failure behavior; maintenance costs | Optional later demand experiment; no scraper execution now |
| Free-feed overview / `free_jobs_overview` | Verify each primary provider's product-use rules, attribution, delay, caps and remote/regional bias | Discovery reference; Remotive/Arbeitnow/Remote OK require separate fit decisions |
| JobsPipe/Adzuna notes / `jobspipe_adzuna` | Confirm Adzuna's own entitlements and history/export terms; evaluate JobsPipe independently instead of adopting competitor claims | Future demand/context shortlist; no verified comparative ranking |
| Cavuno roundup / `cavuno_roundup` | Follow relevant leads to primary docs and shared-cohort evidence | Discovery only, not a selected dataset |
| Case-law notes / `case_law_notes` | Accessible source and actual judgments needed; existing review found 404 | Unverified reference; no legal conclusions or permission inferred |
| Taplio restrictions / `taplio_restrictions` | Separate commentary from official policy; no blog threshold constitutes a permitted collection limit | Operational reference only; no account-limit evasion plan |

The V3 design also contains candidates outside those 18 supplied links. Retain them in the same
comparison: PDL needs endpoint/credit, cohort, history and use-rights decisions; Revelio needs a scoped
API/project-pull quote and deliverable license; Lightcast needs profile endpoint/taxonomy entitlement,
coverage and quote. Public BLS/Census aggregate references need granularity, time-lag and compatibility
checks rather than a person-data subscription. Voluntary first-party profiles need consent, correction,
withdrawal and separately designed availability semantics. No candidate is selected by this handoff.

## Synthetic example planning

Plan the following states as written interaction stories. Do not create person records, profile cards,
fixtures, screenshots, code or mock APIs under the current setup task. Creating an illustrative
prototype is a later implementation request even if its data would be synthetic.

| Planned story | What the eventual design must demonstrate |
|---|---|
| Demand/workforce difference | Distinct units and denominators; a skill-mention contrast never becomes proof of shortage |
| Employed versus available | An observed professional has unknown availability unless a separate explicit current signal exists |
| Missing and stale evidence | Unknown employment end date, old observation and missing skill stay distinct from negative values |
| Incompatible cohorts | Geography or time mismatch disables a combined index and explains the reason |
| Source disagreement | Conflicting employer/role observations preserve lineage and uncertainty rather than silently choose a confident identity |
| Sparse/public output | Suppressed cells and adjacent totals cannot expose a tiny cohort; proposed threshold 10 is reviewed rather than treated as anonymity proof |
| Career movement | Source discovery date is distinct from employment event date; overlapping and undated episodes remain visible |
| Public profile example | Clearly labeled synthetic or separately permitted/opted-in projection; no inferred availability, contacts or individual ranking |
| Cost/coverage limits | Capped search, incomplete pages and quota exhaustion yield partial-evidence labels, not zero-workforce claims |

## Gates for future work

| Gate | Exit evidence | Authority / current status |
|---|---|---|
| D — Documentation readiness | R01–R07 complete enough to state questions, schemas, unknowns, rights requirements and bounded evaluation design | Current authorized lane; research can identify gaps without resolving them through API use |
| E — Vendor evaluation | User separately authorizes named source, fields, free/paid calls, counts, ceiling and private handling; exact endpoint entitlements and required evaluation-use rights confirmed | **Closed.** Free quota, a proposed $100–$250 envelope, or an API key does not grant authorization |
| Q — Evaluation decision | Later measured quality/coverage/freshness and cost-per-usable-record report, reproducible queries, rejected alternatives and source dependence; required rights pass before weighted scoring | **Not started.** No marketing-only quality score or purchase recommendation |
| I — V3 implementation | Explicit implementation request; accepted V2 interfaces, restricted-store/adapter/public-projection design, named ownership and acceptance checks | **Closed.** No profile tables, collectors, credentials or V3 frontend work in V2 |
| R — Release | Explicit release authority; permitted outputs, cohort validity, sparse-cell/differencing checks, withdrawal/deletion, authentication, credential/payload audit, cost controls and rollback validated | **Closed.** Documentation setup grants no deployment authority |

After evaluation is separately authorized, the existing design proposes a bounded 100–300 permitted
record schema/quality sample where quotas allow. That is an illustrative evaluation size, not a
representative population sample or approved retrieval count. Compare one paid profile provider at a
time unless a later scoped instruction changes that plan. Disable or cap paid overage where possible;
include search, detail, failed/retried calls, duplicates and refreshes in the proposed budget.

## Coordinator handoff checklist

- Confirm the next assigned deliverable and exact files before starting another parallel turn.
- Keep V3 research separate from the V2 implementation branch and public application artifacts.
- Report established decisions, unresolved questions and actual changes; do not report documentation as runtime verification.
- If a task crosses a closed gate, return the concrete design/protocol and identify the missing authorization; continue independent documentation work where useful.
- Commit, push, contact vendors and deploy only under coordinator ownership and the applicable user scope.

This setup changes documentation only. It does not start a standing background process or schedule
autonomous API evaluation after this agent turn ends.
