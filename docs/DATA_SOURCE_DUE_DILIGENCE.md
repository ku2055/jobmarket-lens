# JobMarket Lens — data-source research register

Research date: **2026-10-16 UTC**. Status: documentation review and provisional recommendations.

This document evaluates the 18 supplied links for later analysis and source selection. It supplements
[V3 design](V3_DESIGN_AND_API_RESEARCH.md); it does not expand [V2 scope](V2_DESIGN_SPEC.md).
No accounts, subscriptions, credit-consuming API requests, profile collection, vendor outreach or
implementation were performed. The published site and its data are unchanged.

## How to use this research

A page being reachable verifies the documentation observed, not API availability, record accuracy,
coverage or permission to republish. Pricing is an observation rather than an account-specific quote.
All figures below are advertised USD amounts before any taxes, extras or negotiated terms.

Evidence labels:

- **Primary:** provider documentation, pricing, policies or repository; product claims remain untested.
- **Secondary:** community articles or commercial comparisons; useful for discovery, not proof of another provider's capabilities or rights.
- **Unavailable:** the supplied resource could not be retrieved; no findings inferred from its title.

[The JSON register](DATA_SOURCE_REGISTER.json) preserves each supplied URL, evidence status, billing
unit, intended role and open questions. No vendor currently has approved public-profile display rights
recorded for this project. Recommendations below express fit for evaluation, not measured rankings.

## Recommended direction

Keep three evidence populations separate: job postings describe advertised demand; professional
profiles describe an observed workforce; explicit, recent opt-in signals describe available talent.
An employed person is not automatically seeking work. Neither a posting nor a profile necessarily
represents one vacancy or one available worker.

For a future demand expansion, compare a targeted employer/ATS panel with TheirStack and Adzuna.
Use free specialist feeds only where their geography, occupation mix and reuse terms fit. For V3,
compare Coresignal and EnrichLayer with the PDL/Revelio/Lightcast options already in the V3 design.
Evaluate NinjaPear separately as a new product. Keep TikHub exploratory until endpoint coverage,
provenance and allowed downstream use are resolved. Apollo is more attractive if an existing plan
already provides the necessary research entitlement.

Purchase nothing now. Later evaluate one paid profile source at a time against a fixed cohort;
prefer a limited trial or PAYG evaluation when the intended use is permitted. Use voluntary profiles
for initial public individual cards. A paid API response alone does not establish display rights.

## 1. TheirStack — demand and employer context

**Primary.** [Supplied API pricing](https://theirstack.com/en/pricing?tab=api).

API pricing lists $49/month for 1,500 credits and $100 for 5,000. A returned job costs one credit;
a returned company costs three. The site documents job/company search and job lifecycle webhooks.
Its separate app/company-credit offers use different units and must not be substituted in API budgets.

**Fit:** demand-side coverage expansion and employer context, not employee-profile supply.
**Resolve:** required countries and occupations, collection timestamps versus employer publication dates,
closed-job semantics, historical depth, deduplication, description rights and permitted public output.
Confirm webhook billing and refresh costs. No coverage or delivery benchmark has been run.

## 2. Proxycurl — exclude from a new integration

**Primary.** [Supplied service page](https://nubela.co/proxycurl/).

The page states the service is no longer operating and points visitors toward NinjaPear. Legacy API
links remaining on the page do not establish a working service. Do not design a new connector or
purchase decision around Proxycurl. This review does not establish an exact shutdown date or cause.

**Fit:** migration/history reference only. Treat any proposed successor as a separate API, contract,
coverage and data-provenance evaluation.

## 3. NinjaPear — separate workforce/company candidate

**Primary.** [Supplied homepage](https://nubela.co/), [pricing](https://nubela.co/pricing).

The current product advertises employee and company APIs. Pricing lists a three-day, ten-credit trial;
a person profile costs three credits, employee search two per call plus one per returned employee.
A $10 PAYG starter pack expires after 30 days; larger PAYG packs after 90 days. The reviewed text did
not establish the starter pack's credit quantity. Subscription credits expire each billing cycle.
The FAQ states monthly and annual plans require a 12-month commitment, with remaining unpaid months
charged on cancellation. Recheck this before any subscription decision.

**Fit:** exploratory V3 candidate, not an assumed drop-in Proxycurl replacement.
**Resolve:** pack quantities, employment-history fields, source-level provenance, freshness, coverage,
search-to-profile cost, and permitted aggregation/redisplay. The existence of an employee endpoint does
not establish a representative workforce sample.

## 4. TikHub LinkedIn API — third-party endpoint access

**Primary vendor claims.** [Supplied API page](https://tikhub.io/linkedin-api).

The landing page advertises profile, company, employee and job endpoints, with requests starting at
$0.001. This is a headline starting price, not a confirmed cost for every LinkedIn operation. It is
TikHub's third-party service; the product name does not establish official LinkedIn partnership.

**Fit:** exploratory technical comparison rather than a default research source.
**Resolve:** endpoint-specific charges, page sizes, pagination, retries/misses, country coverage,
provenance, retention, deletion and permission for downstream analytics and public output. Multiple
calls may be needed for one complete profile. No accuracy or freshness claims were tested.

## 5. TikHub Python SDK — integration evidence, not another dataset

**Primary repository.** [Supplied SDK](https://github.com/TikHub/TikHub-API-Python-SDK).

The repository provides a TikHub client. Its README lists eight LinkedIn `linkedin_web_v2` endpoints,
while the API landing page advertises more than 80 across two families. That difference needs a
pinned OpenAPI/client comparison before estimating integration coverage. SDK code licensing does not
license returned personal data.

Read-only GitHub metadata observed default-branch commit
`1ede56bcc53f8c037744cbe2b70c93541b5cf840`, committed 2026-10-03. The repository was not archived.
These observations do not prove endpoint health. The SDK was not installed or executed.

**Resolve:** which endpoints are generated, which require direct HTTP, error/retry billing and version compatibility.

## 6. EnrichLayer — bounded PAYG profile evaluation candidate

**Primary.** [Supplied People API](https://enrichlayer.com/people-api),
[credit documentation](https://enrichlayer.com/docs/knowledge-base/billing/understanding-credits).

PAYG examples show $10/100 credits, $50/834 and $100/3,788; the expiry footnote specifies 18 months
of inactivity. Billing documentation lists one credit for a person profile and three per person-search
result. Optional enrichment, endpoint versions and cache behavior require confirmation; do not assume
one HTTP request always costs one credit. Annual subscription prices must not be reported as monthly charges.

**Fit:** small V3 profile/history evaluation with a clear spending ceiling, conditional on allowed use.
**Resolve:** search completeness, history and skills fields, refresh timestamps, source provenance,
deletion handling, cache conditions and licensed aggregates/public display. Validate actual charged
credits against the chosen endpoint and parameters before projecting a recurring cohort cost.

## 7. Coresignal — structured employee-data candidate

**Primary.** [Supplied employee API](https://coresignal.com/solutions/employee-data-api/)
(normalized from HTTP), [pricing](https://coresignal.com/pricing/).

The pricing page lists Mini at $49/month for 2,500 credits. A full employee record is 20 credits;
core data is ten, with field bundles adding charges. Thus 2,500 credits are not 2,500 full employee
profiles. Search and other actions may add costs. The page contains inconsistent rendered plan-summary
and comparison-table limits; confirm exact entitlements and rollover in a quote or account before selection.

**Fit:** strong candidate for structured workforce/history comparison, subject to measured cohort coverage.
**Resolve:** multi-source field lineage, historical completeness, timestamps, refresh costs, source-specific
coverage, aggregate-output rights and public named-card rights. Vendor freshness claims remain unmeasured.

## 8. Apollo — entitlement-dependent enrichment

**Primary.** [Supplied API pricing documentation](https://docs.apollo.io/docs/api-pricing).

API access and charges depend on plan and legacy/current billing. Documentation lists people
enrichment at one to nine credits depending on returned fields; phone-related data can dominate costs.
Organization job-posting retrieval is listed at one credit per page. Waterfall enrichment has separate
charging behavior. No account-specific USD API price was established.

**Fit:** conditional secondary source if existing entitlements support the research; sales-contact fields
are unnecessary for the proposed analysis.
**Resolve:** searchable population, experience/history coverage, pagination, plan access, permitted
research and public output. Do not treat a free or zero-credit endpoint as unlimited access or a redistribution license.

## 9–10. Official LinkedIn Profile API and Lite Profile

**Primary.** [Supplied Profile API](https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api),
[supplied Lite Profile](https://learn.microsoft.com/en-us/linkedin/shared/references/v2/profile/lite-profile).

Profile API access is restricted to approved developers and governed by applicable agreements. Its
member authorization/storage rules do not establish bulk access to unrelated employees. Lite Profile
covers basic identity fields such as name, identifier and picture, not an employment-history dataset.
The presence of a legacy permission reference does not mean a new application can obtain that permission.

**Fit:** approved integration or appropriate member-authorized identity flow; not the default workforce
research database. App-scoped person identifiers must not be assumed portable join keys.
**Resolve:** current program eligibility, granted scopes, allowed storage and exact intended use.
There is no verified self-service payment route here for an unrestricted employee corpus.

## 11–12. LinkedIn Jobs terms and job-feed guidelines

**Primary.** [Supplied Jobs terms](https://www.linkedin.com/legal/jobs-terms-conditions),
[supplied feed guidelines](https://learn.microsoft.com/en-us/linkedin/talent/job-postings/xml-feeds-job-posting-guidelines?view=li-lts-2025-04).

Jobs terms govern the relevant job services and incorporate additional agreements; they do not by
themselves grant an analytics extraction license. The feed guidelines concern submitting customers'
postings **into LinkedIn** under its feed arrangements. They are not a feed for pulling LinkedIn's
job inventory into JobMarket Lens.

**Fit:** policy and possible future publishing-integration references, not incoming data sources.
Keep job-submission permission separate from job-download, research and display permission.

## 13. JobSpy fork — collection software with operating costs

**Primary repository.** [Supplied fork](https://github.com/kev744/jobspy).

The fork documents collection from multiple job boards. Read-only GitHub metadata observed commit
`27c645faea25d472334035bf7717b168ac62624e`, committed 2026-09-24; it was not archived.
Recent commits do not establish successful collection or ongoing maintenance quality.

**Fit:** optional later collection experiment where source access and reuse are permitted; not a hosted
API with a verified service guarantee. Costs include execution, monitoring, breakage and deduplication.
Verify package origin: installing the README's PyPI package must not be assumed to install this fork.
Pin and inspect the selected source before a later experiment. No scraper was run.
**Resolve:** board-specific access, license, rate limits, field completeness and failure behavior;
software availability does not establish data rights.

## 14. Free-jobs overview — discovery list, cross-checked selectively

**Secondary.** [Supplied DEV article](https://dev.to/mrvlyouknowwho/stop-refreshing-job-boards-free-apis-for-remote-job-alerts-remotive-remoteok-arbeitnow-2lag).

Use this as a discovery list, not proof of unlimited or representative data. Primary checks:

- [Remotive API](https://remotive.com/remote-jobs/api): public jobs are delayed 24 hours; attribution/link-back and reuse restrictions apply, including restrictions on reposting to third-party job boards. A separate private API requires discussion. Confirm whether our exact analytics display is permitted.
- [Arbeitnow API article](https://www.arbeitnow.com/blog/job-board-api): advertises a free, no-key API for European jobs, largely sourced through ATS integrations, plus a paid custom API. Verify current limits and downstream terms before use.
- [Remote OK FAQ](https://remoteok.com/faq): identifies a JSON API. API-specific reuse obligations, limits and suitability for this product remain unresolved; a public route alone is insufficient.

**Fit:** narrow supplemental demand panels. Remote-only and regional selection can distort comparisons
with broader professional-profile populations. Keep each source visible in coverage filters.

## 15. JobsPipe's Adzuna comparison — commercial comparison

**Secondary for Adzuna; first-party marketing for JobsPipe.**
[Supplied comparison](https://jobspipe.dev/alternatives/adzuna).

Retrieved through an HTTP fallback after the research browser failed. It is a competitor-authored
comparison, not independent benchmarking. Its Adzuna quotas, pricing and quality claims are not adopted
as verified findings. JobsPipe can be retained as another demand-provider lead, with its own claims untested.

[Adzuna's own overview](https://developer.adzuna.com/overview) documents job search and salary/vacancy
statistics using application credentials. Exact current commercial allowances, historical access and
public redistribution terms require primary confirmation.

**Fit:** Adzuna merits evaluation for demand and aggregate context; JobsPipe merits a separate evaluation
if source lineage and lifecycle fields fit the study. Do not use an undocumented score such as a vendor's
“ghost” indicator as evidence that a vacancy is fake.

## 16. Cavuno market roundup — additional leads

**Secondary commercial roundup.** [Supplied article](https://cavuno.com/blog/job-scraping).

Useful for discovering collection approaches and competing products. Vendor comparisons and
market-wide coverage claims require checks against each provider's own documentation and a shared
sample. Do not copy its price comparisons into procurement decisions without rechecking.

**Fit:** research bibliography, not a data source or measured vendor ranking.

## 17. Scraping case-law notes — unavailable

**Unavailable.** [Supplied GitHub document](https://github.com/tbrown034/open-cabinet/blob/HEAD/research/02-case-law-and-legal-precedent.md).

Both the supplied GitHub route and its corresponding raw-file route returned 404 during review.
No case-law conclusions were verified. If the material becomes accessible, follow citations to the
actual decisions and assess jurisdiction, date, procedural posture and the specific conduct at issue.
Do not infer a general collection or publication permission from an article title or an isolated ruling.

## 18. Taplio account-restriction article — operational commentary

**Secondary commercial guidance.** [Supplied article](https://taplio.com/blog/linkedin-account-restricted).

The research browser failed, but an HTTP fallback retrieved the article. Treat its restriction/recovery
advice as commentary, not official limits or a guarantee that activity below a stated threshold is allowed.

The [official LinkedIn User Agreement](https://www.linkedin.com/legal/user-agreement), section 8.2,
restricts scraping, unauthorized automation, circumvention and specified copying/distribution, subject
to separate written permissions. That contractual policy is distinct from an analysis of statutory law
or a specific case. This research does not establish that a provider's collection or our reuse is permitted.

**Fit:** operational-risk reference only. Do not design collection around account-limit evasion.

## Payment comparison for a later decision

This table records observed billing models, not purchase recommendations or equal-quality comparisons.

| Candidate | Observed entry point | Unit to budget | Decision still needed |
|---|---|---|---|
| TheirStack | $49/month; 1,500 API credits | Jobs returned, company results, updates | Demand coverage and output rights |
| NinjaPear | Three-day/10-credit trial; $10 starter PAYG pack | Search calls plus employees; profiles separately | Pack quantity and 12-month subscription obligation |
| EnrichLayer | $10/100 PAYG credits | Search results plus chosen enrichment | Endpoint parameters, usable history and output rights |
| Coresignal | $49/month; 2,500 credits | Full/core employee plus search and bundles | Exact entitlement and cohort cost |
| TikHub | Headline from $0.001/request | Endpoint calls, pages, retries and detail requests | Actual LinkedIn endpoint tariff and allowed use |
| Apollo | Plan-dependent; USD API quote not verified | Returned enrichment and page operations | Existing subscription/API access and field charges |
| Official LinkedIn | Approval/program-dependent | Granted scopes and contract | Eligibility; payment alone is not access |
| Specialist free feeds | Public routes; restrictions apply | Polling, attribution, operating effort | Product compatibility and exact terms |
| JobSpy | Software rather than purchased data service | Maintenance, execution, collection rights | Source-by-source feasibility |
| Proxycurl | Discontinued | Not applicable | Exclude |

Use this budget equation after endpoint costs are confirmed:

`total credits = search/page charges + returned-record charges + detail/enrichment charges + refresh/retry charges`

`cost per usable record = total evaluation spend / unique, in-scope records meeting required field quality`

Count misses, duplicates, stale histories, unusable fields and licensing exclusions in the evaluation.
For illustration, 100 full Coresignal employee records consume 2,000 credits at the advertised record
rate before other actions. A 100-profile EnrichLayer enrichment would use 100 credits at the documented
base rate before search/options; a 100-profile NinjaPear lookup would use 300 credits before discovery.
These are arithmetic examples, not comparable cohort quotes or observed bills.

## Proposed next research protocol — execute only when requested

1. **Fix the question and cohort.** Choose employers, occupations, geography and observation window.
   Start with employers represented in the posting panel. Record that convenience sampling limits inference.
2. **Resolve product use.** Record whether each provider permits private analysis, persistent storage,
   derived aggregates, chart exports, named cards, attribution and deletion propagation. Distinguish API
   access, dataset license and individual display permission. Request written clarification later where necessary.
3. **Define required evidence.** Job: source ID/URL, employer, title, location, dates/status and description
   entitlement. Person: provider ID, employer/role intervals, geography, observed skills, field timestamps
   and provenance. Do not collect contact details for this analysis.
4. **Design a reproducible sample.** Use the same cohort and queries across candidates; disclose result
   caps and query changes. Record unsuccessful searches as well as successful responses. Do not score quality
   from marketing corpus size. No provider should be declared best until measurements exist.
5. **Measure quality and cost.** Report field completeness, duplicate rate, age of source observations,
   employer/role verification on permitted evidence, history-date consistency, query truncation and actual
   credits. Separate provider refresh dates from dates of underlying employment evidence.
6. **Compare compatible aggregates.** Map occupation, skills, employer and geography with match confidence;
   keep ambiguous matches out of firm-level comparisons. Compare skill prevalence with explicit denominators.
   Postings and profiles are different populations; their ratio is not a validated labor-shortage score.
7. **Choose one justified pilot.** Retain the smallest useful dataset, store raw permitted records privately,
   version transformations and publish only allowed outputs. Record rejection reasons for alternatives.

Do not infer hiring, resignation, retention or employee availability from a profile disappearing or a job
closing. Time-series and transition views require repeated comparable observations and known source changes.
Public cards should begin with opt-in people or records with separately established display rights;
otherwise show appropriately grouped aggregates and suppress sparse cohorts under the V3 design.

## Planned V3 analytical views informed by this research

| View | Evidence required | Honest interpretation |
|---|---|---|
| Demand/workforce comparison | Comparable occupation, location and time cohorts | Differences in observed composition; disclose both denominators |
| Skill alignment matrix | Versioned skill mapping; separate posting/profile prevalence | Advertised requirements versus documented experience |
| Employer context | Posting panel plus qualified workforce sample | Observed hiring signals and workforce mix, with coverage labels |
| Career transitions | Dated employment intervals and adequate follow-up | Observed transitions; missing histories remain unknown |
| Available-talent panel | Explicit current availability and permission | Only the opted-in/qualified population |
| Source-quality explorer | Provenance, completeness, timestamps, sampling/caps | How much confidence the evidence supports |

## Revalidation and handoff

Recheck pricing, commitments, endpoint schemas, policies and availability before any trial or purchase.
Update the register with the check date, exact plan/version, permitted-use evidence and measured results.
Keep documentation-only status separate from runtime-tested status. Preserve unavailable links for audit
rather than silently treating them as verified. V2 continues independently; implementing any of these
sources or V3 views requires a later task.
