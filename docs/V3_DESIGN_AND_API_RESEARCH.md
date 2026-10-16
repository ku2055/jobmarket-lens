# JobMarket Lens V3 — two-sided labor-market intelligence

Status: **design and public-documentation research only**, 2026-10-16.
No vendor account creation, API calls using credits, profile collection, purchases, implementation,
deployment or vendor outreach is authorized by this document. User-supplied candidate sources are evaluated
separately in the [data-source due-diligence document](DATA_SOURCE_DUE_DILIGENCE.md) and
[machine-readable register](DATA_SOURCE_REGISTER.json).
This is a separate release from the [V2 redesign](V2_DESIGN_SPEC.md).

## 1. Product decision

V3 adds a second evidence domain to job-posting demand: **observed workforce and professional career
histories**. Combine those domains through comparable occupation, skills, geography, employer and time
cohorts, while preserving their different coverage and meaning.

Three populations must remain distinct:

1. **Demand:** postings from employers, not necessarily vacancy headcount.
2. **Observed workforce:** people represented in permitted professional-profile datasets, many currently
   employed. These are not automatically available candidates or a representative employee census.
3. **Available talent:** people who explicitly provide a current job-seeking/availability signal or a
   source with a validated, permitted definition of availability. A public profile alone does not qualify.

The desired leap is to understand alignment and differences between what employers advertise and what
professional histories show—not to create a directory of scraped LinkedIn profiles or a hidden ranking
of individuals.

## 2. Decisions reserved for V3

V2 remains the interactive posting explorer, with upstream/local provenance and Vercel deployment design.
Do not add people APIs, person records, individual matching, profile cards, employee retention models or
supply-demand scores to V2. Shared occupation/skill IDs are a useful reusable interface, not an employee
feature to implement early.

V3 work may begin with synthetic records and public aggregate references only after implementation is
separately requested. Actual API evaluation, even on a free tier, is a later explicitly scoped step.
The present work consists only of this design, vendor-documentation research and payment comparison.

## 3. Initial vendor research and payment position

Prices are public-page observations as of this research date, not verified account-specific quotes.
No subscription has been selected. Public-display rights, geography, endpoints and field coverage must
be confirmed for the intended product before selecting a provider.

| Source | What it could contribute | Public commercial position | Recommended role |
|---|---|---|---|
| [People Data Labs Person APIs](https://www.peopledatalabs.com/pricing/person) | Search/enrichment of structured professional person records; evaluate roles, experience, skills and employer links | Free testing advertises up to 100 credits/month; Pro starts at $98/month for 350 credits; enterprise/bulk is custom | Candidate for a small developer-focused profile-data evaluation |
| [Coresignal Employee API](https://coresignal.com/solutions/employee-data-api/) and [pricing](https://coresignal.com/pricing/) | Structured employee records and multi-source professional history; evaluate field-level freshness | Pricing page shows a Mini example at $49/month with 2,500 credits; a full employee record is listed at 20 credits, core at 10; dataset contracts are custom | Alternative small API evaluation, subject to endpoint/field entitlement |
| [Revelio Labs](https://www.reveliolabs.com/pricing) | Workforce composition, career transitions and related analytical datasets | Terminal starts at $1,250/month; API, data delivery and project pulls are separately quoted. The Terminal price is not an API price | Strong conceptual fit for aggregate workforce and transition analysis; request a narrowly scoped quote later |
| [Lightcast Profiles](https://docs.lightcast.io/lightcast-api/reference/post_search-1) and [pricing](https://lightcast.io/solutions/pricing) | Professional-profile analysis with occupation/skill dimensions | Scoped commercial pricing; no verified self-service profile API amount in reviewed material | Evaluate if integrated taxonomies and aggregate analytics justify the quote |
| [LinkedIn official Profile API](https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api) | Approved integrations subject to LinkedIn access agreements | Restricted access; there is no verified self-service payment route in these docs for an unrestricted employee census | Treat as a possible approved partnership, not the default bulk-data source |
| [BLS OEWS](https://www.bls.gov/oes/tables.htm), [Census LODES](https://lehd.ces.census.gov/data/lodes/LODES8/), [Census J2J](https://ledextract.ces.census.gov/j2j/flow) | Public aggregate employment/wage, workplace and job-to-job context at supported granularities | Public data access without a commercial profile subscription | Baseline cross-checks; they do not provide named professional profiles or applicant availability |
| Voluntary first-party profiles | User-submitted work history/skills plus explicit display and availability choices | No third-party profile-data purchase; application operations still have costs | Preferred initial path for publicly displayed real profile cards |

PDL [credit documentation](https://support.peopledatalabs.com/hc/en-us/articles/25794271805211-Pricing-credits)
charges search by successful profiles returned, so a paginated request can consume many credits. Coresignal
also has action/field-dependent credit consumption. Entry plan prices therefore do not establish the cost
of a research cohort, refreshed history or public distribution rights.

Revelio's public material describes scoped API allowances and contract terms; do not interpret broad
marketing language about access as unlimited API capacity. A one-time project pull may be a better way
to test a small employer panel than an annual full-platform commitment, but requires a quote.

**Payment recommendation:** purchase nothing now. Later compare one small PDL or Coresignal pilot against
a tightly scoped Revelio/Lightcast sample or quote. Buy at most one profile provider for the first
approved evaluation. Choose by usable evidence and allowed product use, not advertised record count.
Do not purchase LinkedIn Premium/Recruiter expecting it to grant unrestricted developer profile access.

Illustrative future pilot budget: propose a capped $100–$250 evaluation envelope after endpoint and
rights review; this is an internal planning cap, not an approved spend or vendor quotation. Aggregate
vendor contracts and hosting costs must be quoted separately if chosen. Free quotas do not justify
running calls before evaluation is authorized.

## 4. LinkedIn access boundary

LinkedIn's [Profile API documentation](https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api)
restricts use to approved developers and applicable agreements. [OpenID Connect sign-in](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
provides authenticated-member identity claims, not a general search of employees or a complete work-history
feed. Public LinkedIn visibility is not an API entitlement or proof of permission to republish content.

Do not plan to bypass login restrictions, borrow session cookies, or use browser automation as a bulk
employee-data pipeline. Third-party vendors describing public-source data are independent providers;
their offering should not be labeled an official LinkedIn API. Verify source lineage, recency and the
rights in the provider's actual agreement.

## 5. Product workspaces

| Workspace | New V3 question | Presentation |
|---|---|---|
| Demand and workforce | How do advertised roles compare with the observed workforce in a comparable cohort? | Linked side-by-side role/skill distributions, coverage and time basis |
| Skills alignment | Which skill mentions differ between postings and professional histories? | Mirrored matrix or paired dot plots with separate denominators |
| Workforce geography | Where do observed professionals and relevant postings appear? | Aligned maps at supported common geographic precision |
| Career mobility | Which role/employer transitions are observed in longitudinal history? | Supported flow graph plus time/cohort controls and record-count provenance |
| Employer context | How do job advertising and workforce composition evolve together? | Separate but aligned stock/flow series, with update lags visible |
| Profile examples | What does a consenting or appropriately licensed professional profile look like? | Limited profile cards, separate from aggregate research results |
| Evidence laboratory | Do two sources support the same pattern, and where do they disagree? | Provider coverage, overlap, missingness, revisions and sensitivity comparisons |

Each workspace inherits V2's shared cohort definitions and evidence drawer. Demand and workforce panels
keep their source-specific filters, windows, populations and unknown states visible. A shared query is
not permission to compare incompatible denominators.

## 6. Meaningful cross-checks and prohibited shortcuts

**Skills:** define `demandShare(s)` over eligible posting records and `workforceShare(s)` over eligible
profile records. Their percentage-point difference is a recorded-mention contrast, not a measured skill
shortage or proof people lack a skill. Profiles and advertisements have different incentives, text
lengths, taxonomy coverage and update rates. Show these differences and sensitivity to source choice.

**Roles:** align occupation taxonomy version, geographic precision and reference window. Keep employed
people, vacancies and postings as separate units. An employer's posting count divided by all national
workers is not a candidate competition ratio.

**Pressure indicators:** only propose a postings-to-workforce index when geography, occupation, employer
universe, observation window, deduplication, weighting and coverage make the ratio defensible. Name it
an observed-data index and display units. If those conditions fail, show adjacent descriptive panels
instead of manufacturing a supply-demand score. Actual job-seeker supply requires availability evidence.

**Transitions:** use source-reported dated experience sequences or a licensed transition dataset, with
explicit current/past episode logic, overlapping jobs, unknown end dates, inferred-event labels and update
lag. A vendor newly discovering a profile does not imply the person just changed jobs. Do not infer
an employer's hire from a removed posting or assign a particular person to that posting.

**Pay:** keep posted offers, observed reported compensation, vendor-estimated compensation and official
wage statistics separate. Never present modeled salary as verified individual earnings.

**Cross-source validation:** agreement between two vendors can reflect a common underlying source.
Record source dependence and use official aggregates or a permissioned reference set as a separate check.
Deduplicate people where reliable identifiers permit it; do not simply add providers' counts. Report
uncertain entity matches instead of silently linking people by name.

**Representativeness:** online profiles underrepresent some occupations, regions and employers. Evaluate
missingness and observed coverage by cohort. Do not reweight into a national estimate without a defensible
method and benchmark. Provider-weighted estimates remain different from directly observed counts.

## 7. Data contracts and source governance

Use provider adapters behind a common analytical schema, retaining original semantics and provenance.
Minimum research record: opaque person key, provider/source record key, employer entity IDs and work
episodes, normalized role/skill IDs, geographic granularity, episode dates and date precision, source
observed/updated timestamps, reported-versus-inferred flags, matching confidence basis and allowed-use
metadata. Education is optional and only used where relevant; a school is not a proxy for individual merit.

Separate stores:

```text
restricted source responses -> normalized restricted person/episode records
                           -> employer/role/geography/time cohort aggregates
                           -> publication review -> public aggregate artifacts
voluntary display profiles -> separate consent-aware public profile projection
```

Contract/rights metadata must distinguish internal research, retention, cached storage, aggregate
publication, public individual-card display, redistribution and onward machine-readable export. Track
field-level lineage and any deletion/refresh obligations. A product/API subscription does not by itself
establish all of these permissions. Some agreements may permit display within a customer product; verify
the actual order form and intended audience rather than assuming blanket permission or blanket prohibition.

PDL publishes a [services agreement](https://privacy.peopledatalabs.com/policies?name=services-subscription-agreement)
covering permitted uses; Coresignal's [website terms](https://coresignal.com/terms-and-conditions/) distinguish
purchased-data agreements. Public-profile display entitlement is **unresolved for this project** until
the selected provider's actual contract and intended use are checked. This is a product research
requirement, not a conclusion that vendor data can never be displayed.

Do not request or retain personal emails, phone numbers, home addresses, date of birth or sensitive
attributes for these workspaces. Do not infer sensitive characteristics. Public aggregate output should
apply a proposed minimum cell size of 10 with protection against reconstruction from adjacent totals;
this is a starting release rule, not a formal anonymity guarantee. Resolve appropriate thresholds and
any broader publication obligations before a real release.

## 8. Profile-card display design

Separate aggregate research from publishing identifiable people. Default V3 previews use clearly labeled
synthetic examples or volunteered professional profiles with explicit display choices. Vendor-derived
named cards remain unavailable until display rights and field scope are established.

A permitted card can show display name or chosen pseudonym, professional headline, role family, coarse
location, voluntarily published skill list, relevant work-history summary and an approved source link.
Show as-of/source labels. Provide correction/removal controls and a way to withdraw voluntary display.
Do not expose direct contact details, private source IDs, inferred availability, estimated individual
salary or an employability score.

Pseudonymizing a name does not automatically make a distinctive career history anonymous. Public
examples need their own publication projection and review; a generic person-data table must never be
shipped to the browser and filtered there.

## 9. Architecture and deployment implications

Keep the V2 public application on the planned Vercel host. V3 can add public, versioned aggregate datasets
and only the explicitly permitted profile-card projection. Do not add vendor credentials or raw people
records to Vercel static assets, `VITE_*` variables, public GitHub releases or client-side databases.

Restricted provider calls run in a separate authenticated ingestion service/job, with bounded pagination,
credit budgets, cancellation, audit records and a private store. Use provider caching/retention rules.
The user-supplied API adapter must support field selection, call-cost estimation, response validation,
source timestamps and rights metadata before a real evaluation run is enabled.

If owner-only research tools are added later, use server-side authentication and authorization with
restricted responses and retention-aware caches. A private GitHub repo or a hidden frontend route is
not a complete person-data access architecture. Select actual backend/storage products only after
provider constraints and expected volume are known; no infrastructure is provisioned by this design.

## 10. Separate API evaluation plan, after APIs are supplied

First perform documentation-only review. Record provider name, documentation URL, endpoint family,
intended dataset/regions, sample response with real personal fields redacted, authentication method,
credit/rate limits, update cadence, retention and publication terms. Keys must be supplied through a
secret mechanism, not pasted into a public document or client code.

When separately authorized, evaluate a deliberately bounded cohort across employers, occupations and
regions, rather than only highly visible technology workers. Use 100–300 permitted records per candidate
as a schema/quality test if budget/quotas allow; it is not a population sample. Prepare a permissioned
reference set and freeze evaluation questions before calling vendors.

Compare:

- Employer/role matching precision, taxonomy alignment and uncertain-identity rate.
- Completeness and consistency of current/past work episodes, skills, locations and timestamps.
- Observed recency, historical depth, update lag and source lineage.
- Cross-provider overlap, correlated sourcing and errors; coverage stratification.
- Incremental value beyond current postings and public aggregate references.
- Rights for internal analysis, aggregate publication and identifiable-card display independently.
- Actual successful/failed/retried call costs, pagination and refresh costs.

Score eligible vendors on quality (35%), cohort coverage (20%), freshness/history (15%), integration
reliability (10%) and cost per usable record (20%). Required use rights are a pass/fail gate, not a
weighted tradeoff. These weights are proposed and adjustable to the supplied APIs.

`Cost per usable record = total evaluation cost / distinct records passing the agreed quality/use criteria`.
Also calculate cost per refreshed employer/role/geography cohort. A cheap record with stale employment
or unusable display terms may provide little value. Include repeat refresh, duplicate retrieval and
incomplete pages in the estimate. Stop before the approved cap; automatic paid overage must be disabled
or bounded where supported. No evaluation is run now.

## 11. V3 delivery gates

1. **Research gate:** user supplies candidate APIs; complete the endpoint/rights/pricing matrix without
   calls, and select questions and geography. Open items remain explicit.
2. **Evaluation gate:** separately approved budget, sources, call counts and field scope; assess a bounded
   sample and produce a cost/quality report. No public release of vendor profiles during evaluation.
3. **Design gate:** use synthetic or permitted examples to test two-sided cohorts, labels, source
   disagreement, missingness and public-card controls.
4. **Implementation gate:** build adapter boundaries, restricted storage, aggregate compiler and shared
   taxonomy contracts as a separate V3 branch. Keep V2 behavior and data boundaries intact.
5. **Release gate:** validate cohort comparability, publication rights, quality, deletions/withdrawals,
   aggregate disclosure controls, credentials, cost limits, live payloads and rollback before deploying.

Initial success means users can distinguish advertised demand, observed workforce and actual available
talent; explain a supported cross-source difference; and identify when the evidence is insufficient.
It does not mean that the site can list the largest number of identifiable profiles.

## 12. Pending user input for a later research phase

Candidate provider names/documentation; target geography and employer/occupation scope; whether the
priority is aggregate workforce research, voluntary job-seeker profiles or identifiable examples;
acceptable future evaluation budget; existing subscription entitlements; and intended public-display
fields. None of these are required to implement anything now, because this phase is design-only.
