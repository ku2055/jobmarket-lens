# JobMarket Lens V2: research and complete redesign plan

Status: design proposal, 2026-10-16. No live-site change accompanies this document.

Implementation decisions are superseded by [V2 execution specification](V2_DESIGN_SPEC.md): Vercel is the preferred V2 host, and the audited public upstream inventory expands the 92-record local baseline. Employee/profile data remains a separate [V3 research design](V3_DESIGN_AND_API_RESEARCH.md).

Visual reference: [workspace concept](v2-workspace-concept.png), with [editable SVG](v2-workspace-concept.svg). The layout study uses real pilot records in categorical bands; proposed controls are illustrative, not an implemented application.

## Decision

Replace the long dashboard of separate charts with a visual exploration application. Working concept:
**JobMarket Atlas**, retaining JobMarket Lens as the product name. The experience is organized around
exploring roles, comparing groups, understanding skill relationships, and inspecting evidence.

The proposed default audience is people exploring jobs and skills, with an analyst workspace available
from the same application. This is an assumption pending audience feedback, not completed user research.

This is a complete frontend replacement delivered as one coherent V2 release. It retains useful
collection, normalization, history, and publication-boundary work from V1. A redesign does not require
rewriting reliable data code or discarding provenance.

The distinguishing feature should be a short path from a visual pattern to a reproducible explanation.
An impressive-looking graphic is useful only when users can identify what each mark means and why
records were included.

## Research scope and limitations

Reviewed primary product documentation for Indeed Hiring Lab, Lightcast, Revelio Labs and Nomic Atlas;
public Gapminder and Nomic pages; original 3D Gaussian Splatting research; and official visualization
library documentation. This is a desk-research comparison, not a hands-on audit of paid enterprise
products. Indeed's live portal blocked this research browser, so its comparison uses its public indexed
portal description. No paid products or data subscriptions were purchased.

Vendor scale/performance claims have not been independently benchmarked. Library choices below are
recommendations to validate in our workload, not promises about measured performance.

## Current baseline and constraints

The local quality report contains 92 postings from seven employers, four collections matching reported
totals and three partial samples, all observed on one date. Full descriptions exist privately for all
92. There are three usable USD pay records; 47 records lack a parsed country; 38 lack work arrangement;
29 lack a degree value; 34 lack a years-of-experience value. Six postings are unclassified by SOC rules.

This is sufficient to test navigation, selection, comparisons of observed records, quality explanations,
and visual design. It cannot establish broad hiring trends, market-wide role demand, salary premiums,
career transition probabilities, or representative employer rankings. Complete collection describes
an operational inventory check, not representative sampling or validated extraction.

## Industry and research comparison

| Reference | Documented or observed pattern | V2 application | Boundary |
|---|---|---|---|
| [Indeed Hiring Lab Data Portal](https://data.indeed.com/) | Separate measures for postings, wages, remote work, AI and pay transparency | Start with a question and a named metric; give each measure a definition and period | Their indexes and coverage are not interchangeable with our employer sample |
| [Lightcast skills methodology](https://kb.lightcast.io/en/articles/7216059-lightcast-skills-taxonomy) and [Career Pathways](https://lightcast.io/resources/blog/career-pathways-launch) | Normalized skills, context and aliases; role adjacency informed by multiple kinds of data | Build a versioned vocabulary; explain shared skills and differences | Job postings alone do not establish actual career moves; avoid adopting future-dated release claims from a changing documentation page |
| [Revelio job-posting data dictionary](https://www.data-dictionary.reveliolabs.com/data.html) | Posting-level and aggregate datasets; standardized role and employer dimensions | Consistent posting-to-cohort navigation and explicit metric grain | We do not have workforce profiles, hiring outcomes or their proprietary models |
| [Nomic Atlas vector-search guide](https://docs.nomic.ai/atlas/datasets/data-maps/guides/vector-search-over-your-data) | Semantic retrieval composed with visual selections | Search and selection over a role/skill landscape | Use the interaction idea; do not upload our private evidence to a hosted service by default |
| [Gapminder Tools](https://www.gapminder.org/tools/) and [trails](https://www.gapminder.org/news/new-indicator-to-make-it-possible-to-display-years-by-colors/) | A dominant chart with variable controls, selected entities and time navigation | One main canvas, persistent selections, meaningful temporal comparisons when history exists | Animation should be user-controlled; our first snapshot is not a time series |
| [Mosaic](https://idl.uw.edu/mosaic/) and [examples](https://idl.uw.edu/mosaic/examples/) | Coordinated selections and database-backed interactive views | All views respond to one query/selection contract | Large-data demonstrations do not remove mobile memory or network limits |

Research synthesis: established labor tools derive value from normalization, comparisons and definitions.
Atlas-style tools add exploration. V2 should combine those strengths, using a simpler default workflow
than an enterprise analytics terminal.

## 3DGS, 3D plots, and advanced alternatives

[3D Gaussian Splatting](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/) represents visual scenes
with Gaussians and renders novel views from calibrated imagery. Our records are structured postings,
text, skills and collection events. The method does not supply occupation classification, causal
analysis, meaningful skill distances, or interpretable statistical axes.

| Technique | Decision | Reason |
|---|---|---|
| 3D Gaussian Splatting | Exclude from the analytics design | Scene-reconstruction technology does not address the data task |
| Rotatable 3D scatter/graph | Optional research experiment, outside core V2 | Test only if a meaningful third variable helps users; compare task accuracy/time with 2D |
| 2D role landscape with coordinated views | Core | Visible records, clear selection, direct connection to comparisons |
| Skill matrix and focused relationship graph | Core | Matrix supports precise comparisons; graph supports local relationship discovery |
| Semantic projection, e.g. UMAP | Experimental lens within the new design | Can reveal similarities, but requires explanations, quality checks and stable layout |
| Geographic dot/aggregate map | Conditional lens | Only for records with geographic evidence and correctly labeled location granularity |
| Sankey/alluvial | Optional cohort composition view | Employer → role → skill membership is not employee movement or hiring flow |
| Timeline and selected-entity trails | Conditional lens | Requires comparable repeated collections; playback cannot manufacture history |

The [UMAP documentation](https://umap-learn.readthedocs.io/en/latest/clustering.html) warns that projection
can introduce artificial separations. Never compute analytic similarity, clusters or recommendations
from distance on the 2D screen. Derive relationships in the original feature space, and validate the
projection as a display. A cluster is not evidence of a distinct labor-market segment.

## Product structure

### Entry experience

Use a short introduction, the current observation scope, and three starting questions:

- Explore roles and their requirements.
- Compare two groups of postings.
- Understand which skills occur together.

A fourth entry opens the analyst workspace. Search is available throughout. Initial natural-language
search can be a deterministic vocabulary/alias parser that translates recognized phrases into visible
filters; unsupported constraints remain explicit. No public API keys or unrestricted LLM-generated
queries. A user can correct every interpreted filter before applying it.

### Main workspace

Desktop layout: a compact top navigation, context/selection bar, a 220–240 px context rail, a flexible
main visualization, and a 300–340 px explanation drawer. The canvas and drawer are the primary objects;
only two supporting views appear at a time. The posting table becomes an expandable record tray.

Navigation: **Explore / Compare / Skills / Evidence**. Geography and time are lenses within these
workspaces, not more top-level dashboards. Search, coverage, share, and export remain globally available.

A context bar always names the current dataset version, observation date, selected record count,
employer count, and incomplete coverage. It avoids presenting a yellow warning wall as the entire
product identity. Essential caveats remain attached to the relevant measure and never disappear in
an inaccessible tooltip.

### Explore: the role landscape

Default to an interpretable categorical layout: role families on one axis and career-level bands on
the other. Each dot is one posting, with deterministic displacement only to prevent overlap. Position
within a band has no numerical meaning. Unknown role/level values get explicit lanes. SOC major groups
are labeled as broad groups until finer classification is validated.

Offer a skill-similarity lens. For the first research prototype, use normalized, TF-IDF-weighted skill
mentions, cosine similarity and a precomputed 2D projection. Do not silently treat title/description
mentions as required skills. Generic skills can be downweighted; records with insufficient informative
features remain visible in an unplaced lane. Show shared features and differences in the drawer.

All coordinates are frozen for a dataset/model version. Filtering highlights/subsets records without
recomputing the layout, so users retain their mental map. Compare cohorts in the same coordinate system.
Measure neighbor preservation and expert-reviewed neighbor relevance; compare with the categorical
layout. Keep the categorical layout if the semantic lens does not improve tasks. A private text-embedding
experiment is a later option; raw descriptions and full vectors remain private, and any derived public
coordinates need publication review.

Interaction: hover gives a short record summary; click selects a record; multi-select or a brush builds
a cohort. A visible selection summary offers **Inspect / Compare / Clear**. Related skill and location
views highlight matching records. Important interaction has a keyboard and tap equivalent.

### Compare: two named cohorts

Pin selection as A, then build B. Example questions are illustrative, not findings: "entry vs senior",
"remote-mentioned vs hybrid-mentioned", "two employers within a role/location".

Show aligned dot/range plots, percentage-point differences in observed skill mentions, experience and
degree distributions, and coverage differences. Counts and denominators remain visible. Cohort overlap
is disclosed rather than silently assigning shared records to one side. Clicking a difference reveals
which records contribute to it. A filter-difference summary explains why A and B differ.

Employer comparisons use a complete-inventory mode for total counts. An all-observed mode remains
available for discovery and within-sample composition, with partial sampling visible. Complete samples
still cannot be generalized to all employers.

Salary is a separate comparison lens with matching role, location, currency and pay-period constraints.
Show individual posted intervals for tiny samples, not smoothed distributions. Missing or flagged pay
is shown separately. Report observed spread, not a population confidence interval. Describe association
rather than a causal skill premium. Current data should display the three usable USD ranges with their
sample basis and explain why broader comparisons are unavailable.

### Skills: matrix first, focused graph second

Start with an occupation × skill matrix whose cells show **k/n mentions**, and allow sorting by prevalence
or difference between cohorts. Required/preferred filters activate only after extraction is evaluated.
Unknown requirement context remains a distinct value.

A focused graph offers a second view: select a skill to see a limited neighborhood of related skills
and roles. Edges describe observed co-mentions or an explicitly chosen similarity measure. Require a
minimum co-mention support count before showing an edge; show both count and normalized association.
Avoid a default graph with every edge. Users can switch to the matrix for exact comparisons.

Call role suggestions **similar skill profiles**, not career transition predictions. If an optional
user-entered skill set is added, keep it local to the browser initially and display which recorded
requirements remain unknown. Do not produce an unvalidated employability or hiring-probability score.

### Evidence: explain every result

The drawer shows the selected cohort definition, numerator/denominator, missing fields, employers,
source dates, extraction method/version, and links to matching public posting metadata/source pages.
Provide the difference between "not mentioned", "not extracted", and "unknown source data" where the
pipeline can establish it. Explain why a record matched a search or map neighborhood.

Private descriptions and extraction snippets remain available through owner-only local tools or a
future authenticated backend. Hiding them in a public React component is not access control.

### Mobile and accessibility

On narrow screens use a single main visualization plus a bottom sheet for records/explanations. Filters
and A/B cohort editing are dedicated sheets; avoid squeezing the desktop rails onto a phone. Provide
an explicit selection mode so page scrolling does not accidentally brush points.

Every visual result has a text summary and table alternative, with visible focus, keyboard selection,
non-color cues, labeled controls and reduced-motion support. Follow [W3C guidance for complex visuals](https://www.w3.org/WAI/tutorials/images/complex/).

## Visual design direction

Use a light editorial visual system: warm neutral canvas, white surfaces, strong ink typography,
one primary indigo accent and a teal comparison accent. Reserve amber for incomplete/uncertain data.
Do not reuse cohort colors for quality states. Use readable proportional text and tabular numerals;
clear axis titles and units take priority over decorative labels.

Use restrained borders, fewer equal-weight cards, consistent spacing, a large visualization area, and
a compact scope banner. Color maps roles consistently across views. Short transitions preserve object
identity during selection; no automatic rotations, looping point clouds, or time playback. Provide a
measured dark theme only after the light design passes readability tests.

## Analysis contract and data work

1. Version job identities, observations, source content, normalized fields, taxonomy, and each public
   release. Preserve source and observation dates as separate concepts.
2. Validate a manually reviewed sample across roles, employers and platforms. With 92 records, auditing
   this pilot is feasible. Keep a separate holdout as coverage expands; report field-level precision,
   recall, missingness and error examples. Never invent calibrated probabilities from heuristic scores.
3. Adopt [O*NET](https://www.onetcenter.org/database.html) references for more specific role/skill mappings,
   with versioned IDs and an unknown state. Keep external occupational reference attributes separate
   from what a particular employer stated.
4. For skill prevalence, disclose the eligible denominator, including whether usable description text
   exists. Offer posting-weighted and employer-balanced descriptive summaries when useful. Equalizing
   employers is a sensitivity check, not a nationally representative weighting scheme.
5. Preserve every posting's location list. Use unique postings by default; explain whether an optional
   location count uses fractional attribution or posting-location pairs. A remote eligibility region
   is not an office location. Never geocode country-only or unknown data to a precise city point.
6. Add [BLS OEWS benchmarks](https://www.bls.gov/oes/tables.htm) using matching occupation/geography, release
   date, wage measure and units. Keep offered pay and earnings benchmarks separate; do not mix currencies
   or inflate missing values into an apparent salary advantage.
7. Future trends use a fixed eligible employer panel with complete comparable inventories. Separate
   active inventory, newly observed records, and confirmed removals. Exclude initial discovery from
   "new" counts and preserve the distinction from actual job creation, hiring and filled vacancies.
8. Findings use deterministic computed templates initially. Each finding carries a metric ID, exact
   cohort/filter definition, denominator, dataset version and record references. A later language layer
   may explain a computed result, not create missing evidence.

Proposed presentation rules, to test rather than treat as statistical laws: with fewer than ten salary
records show individual intervals and counts; with 10–29 also allow descriptive medians; with at least
30 allow empirical distribution summaries if the subgroup and disclosure coverage are defensible.
These thresholds do not establish representativeness or independence. Percentages may still be shown
as exact k/n with small-sample context.

Trend enablement proposal: at least four complete weekly observation windows for the same selected
employer panel, plus explicit checks for collection/methodology changes. Otherwise show the inventory
or observation timeline and a precise readiness explanation. The current one-date sample fails this
gate. More dates alone do not fix changes in panel composition.

## Technical architecture

Recommended product shell: **React + TypeScript + Vite**. Recommended initial chart engine:
**Apache ECharts**, using a shared application selection store. It supports [events and actions](https://echarts.apache.org/handbook/en/concepts/event/)
and [accessibility helpers](https://echarts.apache.org/handbook/en/best-practices/aria/), but those helpers
do not replace keyboard flows, text summaries and table equivalents.

| Tool | Role and decision |
|---|---|
| ECharts | Primary engine for the small-data atlas, matrix, intervals, lines and focused graph; validate custom interactions in one vertical slice |
| [Vega-Lite](https://vega.github.io/vega-lite/examples/interactive_layered_crossfilter.html) | Strong alternative for declarative coordinated statistical charts; benchmark if ECharts custom series become hard to maintain; avoid shipping two general chart engines |
| [Mosaic](https://idl.uw.edu/mosaic/) + [DuckDB-Wasm](https://github.com/duckdb/duckdb-wasm) | Evaluate for coordinated queries at larger data volumes; keep an engine interface so this does not require another UI rewrite |
| [Observable Framework](https://observablehq.github.io/framework/) | Good alternative for a report-first research publication; React is preferred for this product's persistent workspace and cohort editing |
| [deck.gl](https://deck.gl/docs/api-reference/layers/scatterplot-layer) | Optional lazy-loaded dense point/geographic renderer after workload measurements justify it |
| [Sigma.js](https://www.sigmajs.org/) | Optional focused graph renderer if graph complexity outgrows the primary engine |
| [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) | Optional geographic basemap; begin with simpler boundaries/points if sufficient and verify tile terms/attribution |

Start the current 92-row prototype with an in-memory query engine. Chart marks call a shared selection
API; selectors return metric results with provenance. Avoid a separate filtering implementation inside
each chart. The scale experiment compares this engine with Mosaic/DuckDB-Wasm on 10k and 100k public-field
fixtures; synthetic fixtures are labeled and never mixed into the real preview. Adopt the heavier
engine only when latency, memory and maintenance results justify it.

DuckDB-Wasm is not a privacy boundary: [its deployment documentation](https://duckdb.org/docs/stable/clients/wasm/deploying_duckdb_wasm)
explains that users can access the data reachable by the browser engine. Keep raw text, vectors,
API keys, private release assets and owner-only fields out of all public bundles, source maps,
Parquet files, caches and network responses. Use a compatible single-threaded WASM build/fallback
unless the actual hosting configuration supports required cross-origin isolation.

Retain Python for collection, normalization, quality validation and precomputed projection artifacts.
Publish a versioned manifest, a small summary and a sanitized posting dataset. JSON is adequate for the
pilot; evaluate partitioned Parquet/Arrow when it reduces measured transfer/query costs. Never make
browser filtering download the private SQLite database.

Deployment can remain on [GitHub Pages using Vite](https://vite.dev/guide/static-deploy.html). Set the
project base path to `/jobmarket-lens/`; use hash/query state or another Pages-compatible navigation
strategy so shared links reload correctly. API-backed private features, if added, need separate hosting
and server-side authentication.

Suggested module boundaries:

```text
frontend/src/
  app/              application shell, navigation and URL state
  features/explore/ role layout and selection
  features/compare/ cohort editor and aligned comparisons
  features/skills/  matrix and focused relationship view
  features/evidence/ public evidence drawer and record tray
  analysis/         metric registry, cohorts, query engine adapters
  data/             validated public schema and versioned loaders
  components/       accessible controls, tables, quality indicators
scripts/            private collection/build and public release checks
```

Selected state includes dataset version, workspace/lens, normalized filters, cohort predicates or
record IDs, pinned A/B definitions, selected record, color/axis choices and visible selection mode.
Sharing serializes this state without private evidence. Hover alone never changes the committed query.
A brush previews a cohort; applying it commits one undoable action. A loading/empty state must report
what is happening, and stale worker results must not overwrite newer selections.

## Delivery plan: a single replacement release

Implementation stages are internal work packages, not a sequence of minor V1 UI patches.

| Package | Deliverable | Acceptance gate | Indicative effort |
|---|---|---|---|
| 1. Define and test the interaction model | Three user tasks, metric dictionary, fidelity-specific screen designs, categorical vs semantic atlas spike | Users identify selected records and understand the axis meaning; library interaction spike works | 3–5 working days |
| 2. Build the new application foundation | React shell, tokens, versioned data loader, global selection state, public schema checks, mobile navigation | URL restores filters/selection; counts match reference queries; no private payload fields | 4–6 days |
| 3. Implement all core workspaces | Explore canvas, A/B comparisons, skill matrix/focused graph, explanation drawer and record tray | One end-to-end journey works with the real 92 rows; table, charts and CSV agree | 6–9 days |
| 4. Add evaluated analytical lenses | Manual extraction audit, occupation references, salary/geo readiness rules, semantic quality evaluation, trend eligibility | Unsupported findings stay unavailable; reviewed neighbor relevance and extraction results are documented | 4–7 days plus collection time |
| 5. Validate and release V2 | User tests, accessibility and performance checks, Pages staging, release manifest, rollback | Quality/privacy/behavior tests pass; tasks improve against V1; live verification succeeds | 3–5 days |

Planning estimate: **20–32 focused working days for one experienced developer**, with overlap possible.
This is not a measured delivery commitment. Historical analysis additionally depends on elapsed
collection time; parallel development cannot accelerate the arrival of future snapshots. Large-scale
WebGL rendering and authenticated private-data tools are separate conditional scope.

Build on a `v2-redesign` branch and stage under `/v2/`. Keep the current preview available as a baseline
while validating the complete design. Promote the finished application to the main URL in one release;
retain `/v1/` and a tagged release as a comparison and rollback reference. No staged result should
present simulated records as real observations.

## Evaluation and definition of done

Use 5–8 formative sessions with people from the chosen audience. These identify usability issues;
they do not establish population-level statistical improvement. Counterbalance V1/V2 task order where
possible. Record task success/time and the explanation participants give, not just visual preference.

Test tasks:

1. Find the observed junior technical postings for a location/work arrangement; explain included and
   unknown records, and open a relevant source posting.
2. Compare two cohorts' skill mentions and explain both denominators and one coverage limitation.
3. Decide whether the current pay and time data support a market claim. Correctly identifying
   insufficient evidence is success.

Proposed usability targets: at least 80% unaided completion for the core tasks in the pilot study;
a substantial improvement over V1's measured task time without worsening interpretation; zero critical
keyboard-navigation blockers. These are design targets, not current findings.

Proposed engineering targets: first useful preview within 2.5 seconds on a defined mid-range mobile
profile; p95 committed-filter response below 150 ms for 10k records and below 300 ms for a measured 100k
fixture. Define devices/network, report actual transfer/memory figures and revise architecture if the
target is missed. These are budgets for testing, not assumed library capabilities.

Required checks: metric reference tests; stable layout and neighbor explanations; cohort overlap and
unknown handling; all views/CSV agreeing on record sets; browser reload/share/back navigation; mobile
selection; reduced motion; no-data/sparse-data states; publication schema and private-path checks;
network/bundle inspection; dependency/license review; Pages asset routing; and rollback verification.

V2 is complete when its new interaction model works coherently, is understandable with today's limited
data, preserves privacy, and improves the measured exploration tasks. Rendering a more elaborate graph
without those outcomes does not satisfy this proposal.
