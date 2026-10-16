# V2.6 — linked spatial investigations

Design for review, 2026-10-16. V2.5.1 implementation is in progress; this proposal builds on its
contracts and must be reconciled with its measured results before implementation. V2.6 is design
only. It does not authorize new data collection, subscriptions, employee profiles or production changes.

[Visual concept](v2-6-linked-investigations.svg) · [V2.5.1 design](V2_5_1_3D_ANALYSIS_DESIGN.md)

## Goal and release boundary

Turn the optional V2.5.1 Spatial Lab into a **linked investigation workspace**: compare two populations,
explain which dimensions account for their differences, and trace every selected region to evidence.
The advance is coordinated analytical interaction, rather than more marks or additional animation.

V2.5.1 establishes three bounded scenes: occupation × level × arrangement, employer coverage, and
focused skill co-mentions. V2.6 proposes synchronized A/B views, explicit intersection slices and a
source-basis investigation. Keep the same Node query authority, immutable release identity, public
field allowlist and exact contributor export. No new Python runtime. Keep the V2 and V2.5 baselines.

## Decisions informed by the current data

The [audited snapshot](V2_5_1_DATA_AUDIT.json) contains 86,190 combined postings from 311 employers,
but only 92 locally analyzed descriptions. Country is unknown for 23,711, arrangement for 46,916,
and level for 24,192. These are uneven source records, not a representative labor-market sample.

The 46 overlapping pairs have different raw availability enums but zero normalized availability
disagreements. A source-basis view must preserve this distinction. Seven recorded date-group and six
location-group differences need their own comparability rules; they are not automatically errors.

Current capability: categorical intersections, source variants, recorded-skill sensitivity, explicit
coverage counts. Missing capability: a real longitudinal release series, representative employee supply,
precise universal coordinates, or a justified latent skill-distance model. Do not fill those gaps with
synthetic movement, interpolated dates or inferred employee populations.

## Proposed workspace

The header fixes dataset/method versions and source mode. A question bar describes the active
comparison in plain language. Two equal-sized viewports show frozen cohort A and cohort B with shared
camera orientation and metric scales. An adjacent difference matrix provides the same values in 2D.
The lower evidence rail follows a selected cell, pair, coverage intersection or source comparison.

Start in 2D. An explicit 3D switch loads one renderer. Camera linking, cohort linking and metric-scale
linking are separate named controls; the first changes presentation, the other two change analysis.
No silent auto-rescale when switching cohorts. A keyboard-operable list remains available throughout.

| Investigation | 3D interaction | Exact 2D alternative | Data prerequisite |
|---|---|---|---|
| What differs between A and B? | Synchronized demand shelves, same category slots and count/share scales | Aligned matrices plus signed difference table | Current snapshot + exact A/B predicates |
| Which missing fields coincide? | Slice a bounded coverage-intersection cube; show included/excluded counts | Intersection matrix / UpSet-style table | Verified joint aggregates, not products of marginal percentages |
| Does skill basis change the result? | Side-by-side focused neighborhoods with common node identities and positions | Ranked pair matrix with support and basis denominators | Recorded mentions and analyzed-text eligibility; 92-record limit disclosed |
| Why do sources look different? | Two fixed source panels joined by selected canonical record links | Paired source-value table with comparison classification | Comparable paired variants and source/date basis |
| Is geographic coverage uneven? | Optional country coverage shelves, without invented city points | Country × occupation table | Explicit multi-location counting rule and precision |
| What changed over time? | Separate gated release comparison, discrete real observations | Release-by-release table with entry/exit coverage | Multiple genuine, immutable, comparable releases; unavailable today |

## A/B and difference semantics

Freeze each cohort as dataset version, source mode, normalized filter, analysis basis, selector and method
version. Comparison is initially within one release and one source mode. Cross-source views are explicit
source investigations, not ordinary A/B comparisons. Never intersect records from incompatible releases
using an unversioned ID assumption.

Return A count, B count, intersection, A-only, B-only and union with exact hashes. A selected group can
appear in both cohorts; the UI must not add A and B as if disjoint. Shared axes contain the union of
category identities, including Unknown and zero-valued groups. Absolute difference is count A minus
count B; share difference is A-share minus B-share in percentage points, with each denominator shown.
Report zero-denominator shares as unavailable. Differences are descriptive; no causal or significance
claim follows from this non-probability snapshot.

Common scene coordinates must be computed from category IDs or declared metric transforms. A skill
layout can use deterministic fixed anchor positions from the union of returned nodes; layout proximity
still carries no measured similarity. Recomputing force layouts independently would make apparent
movement meaningless and is excluded from the default comparison.

## Coverage intersections and issue classes

Initial intersection dimensions: known country, known arrangement, known level, eligible comparable
USD pay, and locally analyzed text. Five booleans produce at most 32 mutually exclusive posting groups.
Group labels state their predicates; the union must equal the matched population. Description basis
being unavailable is different from a known false eligibility flag, so the API also returns source-basis
availability and unknown counts rather than relabeling unknown text as verified absent.

The 3D cube displays three chosen dimensions with the remaining dimensions controlled by explicit
facets, never hidden coordinate channels. Give each axis a category title. Slice controls include/exclude
whole predicate groups; selected groups resolve as a distinct-ID union through the server. A full
intersection table exposes all 32 groups regardless of which plane is visible.

Keep separate diagnostic classes: unknown information; source-basis difference; comparable recorded-value
difference; and a named rule failure. Eligible USD pay is a comparability restriction, not a quality score.
Valid non-USD pay is not invalid. Any rule-failure rate uses all assessable records, including failed
records, and shows the not-assessable count. No combined employer trust score.

## Geography and time gates

Countries may be compared now after verifying the joint aggregates. One posting may list several
countries. Default display uses “postings mentioning country,” labels totals as non-additive, and resolves
selection unions to distinct IDs. Unknown location is an explicit group. A globe is unnecessary for
country categories and must not imply job counts at precise coordinates. Regional or city scenes require
source location precision and a documented geocoding/rights process before consideration.

Time remains a separate gated package: store immutable sanitized releases, source timestamps, observed
times, schema/method versions, stable identities and comparable source coverage. At least two authentic
releases permit a difference; a trend claim requires a suitable repeated observation window and coverage
assessment. Do not turn the seven historical collection summaries into a posting-level panel, infer
closure from missing upstream rows, or label posting entry/exit as hires, layoffs or job creation.
Time controls initially step between actual releases with no interpolation or moving particles.

## Node contracts and rendering

Build on the implemented V2.5.1 contract after it is reviewed. Proposed new operations: bounded
`comparison_scene`, `coverage_intersections` and `source_pair_evidence`. All accept strict semantic
requests, not SQL or browser file paths. Each carries release and method versions, canonical request
hashes, normalized selectors, group count/limit disclosure and exact contributor identities. Records
and CSV resolve the same selection envelope across serverless instances.

Keep initial bounds: 1,024 aggregate groups per scene, two viewports, 40 skill nodes and 120 edges per
neighborhood, 100-row evidence pages. Source-pair evidence is paged and public-field allowlisted.
Reject oversized combinations instead of silently sampling away contributors. Node performs grouped
aggregation and intersection/difference queries; browsers receive aggregate buffers and evidence pages.

Reuse the renderer selected by the V2.5.1 evaluation. Three/R3F on-demand rendering is the initial
candidate; no requirement to migrate to WebGPU. [R3F performance guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
supports on-demand frames. [deck.gl OrbitView](https://deck.gl/docs/api-reference/core/orbit-view)
remains a candidate for bounded non-geographic scenes. These capabilities are not evidence of our own
task benefit or device performance. Gaussian splatting and photorealistic reconstruction do not address
the structured comparison problem and are outside this release.

## Delivery and decision gates

1. Finish V2.5.1 and record actual interaction, selection correctness, bundle, accessibility and device
   evidence. Carry unresolved failures forward explicitly; do not call a design budget a measured result.
2. Prototype synchronized A/B shelves against aligned 2D matrices using identical server aggregates.
   Verify shared scales, deterministic positions and overlap reconciliation before evaluating appearance.
3. Implement coverage intersections and exact union selectors, with Unknown/source-basis and USD
   comparability regression cases. Validate all 32 groups partition the population.
4. Add source-pair evidence and skill-basis sensitivity only where denominators and paired inputs can
   be verified. Keep geography and genuine release history behind their separate prerequisites.
5. Run a counterbalanced task study with novice and experienced analysts. Measure interpretation errors,
   exact-evidence success, completion time and selection mistakes versus equal-data 2D. Small studies
   guide product decisions but do not establish population-wide statistical significance.

Provisional performance goals: no renderer download on ordinary routes; no continuous frames at idle;
30 fps during interaction on named devices; at most two mounted contexts; deterministic disposal on
route changes; bounded JSON; no task blocked by context loss. Reassess against V2.5.1 measurements before
freezing numeric bundle/memory budgets. If two synchronized scenes are costly, use one shared viewport
with A/B toggling plus the always-visible difference table.

Acceptance requires exact group/selection/export hashes, no hidden population omissions, keyboard/touch
task equivalence, working mobile 2D, recovery without lost pins, and no accuracy regression. Implement
only spatial interactions that improve a named task. Optional Umami may record the fixed public route
only, never cohort values, search, camera traces, employee information or admin activity. No paid data
provider, video integration or employee-profile collection belongs to this design.
