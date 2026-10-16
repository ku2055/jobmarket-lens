# V2.5 execution, administration and brand

The user authorized implementation and separate deployment after reviewing the original V2.5 proposal.
This addendum records the implementation choices. V2 stays at `jobmarket.feedos.si`; V2.5 has its own
`node25/` application, Vercel project `jobmarket-lens-node25`, and target `lens.feedos.si`.
V3 profile integrations, paid providers and the independent video team's work remain separate.

## Architecture decisions

The first deployment tests native Node/DuckDB inside a Vercel Node function, rather than purchasing
the long-lived host proposed in ADR-01. This is a deliberate prototype decision: the verified immutable
Parquet snapshot is approximately 15.8 MB and native dependencies must fit the platform bundle limit.
Keep V2 running as the static baseline. A future persistent host is an option if measured cold-start,
concurrency or operating limits justify it; it is not silently provisioned.

The function verifies store hashes, loads only sanitized Parquet into an in-memory analytical table,
then disables external file access and locks DuckDB configuration. No private SQLite, raw collection
directories or collection credentials are included in the query function. Its server-only Umami reporting
credential, if configured, is restricted to the V2.5 website and used only for fixed analytics
requests. The SQL compiler accepts enumerated filters, binds values and never accepts client SQL,
paths or arbitrary URLs. At most two analytical tasks run per instance, with a bounded queue/cache,
a five-second interactive interrupt and a 2 MB JSON result budget.

The first contract uses flat, bounded conjunctive filters, rather than the proposal's nested predicate
tree. Dimension lists are OR selections, different dimensions are AND, and selected skills require
all selected IDs. Country and skill membership use list predicates to avoid join multiplication.
Records are stable-ID pages of at most 100. CSV is a separate server stream with the same 37 public fields as V2, including qualification, skill,
pay and provenance metadata. The first client uses a
typed React request coordinator with abort/stale-response guards; Mosaic compatibility and an optional
Wasm/offline engine are not claimed or shipped. This keeps client queries within the named semantic
contract while the native-service experiment is measured. Contributor hashes include
the dataset, source mode, metric version and sorted distinct ID set. Frozen comparison filters are
pinned to the same immutable dataset and source mode; mode changes invalidate pins visibly.

For same-data parity, the initial wire amounts retain V2 finite numeric bounds and explicit currency/
period units. Arbitrary SQL DECIMAL/BigInt wire amounts and Arrow encoding are not implemented or
advertised as exact decimal interchange.

The Node pipeline owns original pinned CSV/typed-supplement intake, public normalization, exact merge
and Parquet publication. The sanitized local snapshot is a migration input. Read-only SQLite migration
is an isolated private command, not a function dependency. Publication and query builds need no Python.
Existing collection adapters are not automatically activated or advertised as migrated; the data
pipeline document records exact supported responsibilities and remaining work.

## Admin experience

`/admin` is an owner console, with no indexed public metrics or collection controls.

- **Access:** scrypt password verification; a signed, three-hour HttpOnly/SameSite=Strict session cookie,
  Secure in production. Password and signing material are server-only environment variables. Login
  and logout require a same-origin request. Password/signing-key rotation invalidates existing sessions.
- **Collection:** source-mode totals, source as-of dates, completeness, overlap/reject counts, latest
  snapshot and available run records. Scheduled polling is explicitly disabled. Imported snapshot
  dates are not displayed as successful live collection times; absent run metrics remain unavailable.
- **Traffic:** Self-hosted, MIT-licensed Umami aggregate visitors/page views, routes and countries over a stated
  reporting period, when a persistent host/database and restricted reporting token are available. No named identities,
  IP addresses, search strings, cohort contents or browser fingerprint records are collected by this app.
  Admin routes and URL query/fragment state are excluded from the analytics component.
- **Operations:** deployment/dataset/method versions and function-instance diagnostics. Runtime counters
  reset with cold starts and are labelled accordingly; they are not durable visitor totals.

Analytics uses the open-source Umami tracker and reporting API, replacing the earlier Vercel Analytics
proposal at the user's direction. The Vercel analytics dependency and implementation are removed.
A missing host/token or provider error shows unavailable. No process-local visitor count is presented
as durable history. A [self-hosting package](../node25/analytics/README.md) includes version-pinned Umami,
PostgreSQL with a persistent volume, and private configuration generation. This machine has no Docker
or provisioned persistent analytics database, so live collection remains pending that infrastructure.
The app deployment does not depend on it. No paid service or default hosted analytics is enabled.

Login throttling is best-effort per function instance, not a global distributed lockout. The initial
console has one owner role and read-only operations. Multi-user RBAC, persistent audit storage,
scheduled collection, retries and refresh approval are later work requiring concrete storage design.

## Visual identity

The native SVG logo combines a lens with data marks; the mark, wordmark, favicon and social artwork
live in `node25/public/brand/`. The message is **“See the demand. Check the evidence.”**
It describes the product task without claiming complete labor-market coverage.

| Token | Value / use |
|---|---|
| Ink | `#173E43`, primary headings and navigation |
| Teal | `#28776D`, actions and primary analytical marks |
| Mint | `#77C5B7`, supportive fills |
| Amber | `#E4B45F`, comparison and attention accents |
| Canvas / borders | `#F4F6F3` / `#DCE5DF` |
| Secondary text | `#567176` |
| Typography | Self-hosted Manrope headings, DM Sans body; bundled OFL licenses |
| Spacing / corners | 4 px base; 8, 12 and 18 px radii |

Use labels and counts alongside color, visible keyboard focus and accessible matrix/table alternatives.
Evidence, unknowns and denominators remain visible rather than hidden behind attractive graphics.
The same identity applies to the research canvas and admin view.

## Independent video PR boundary

The video team may submit a PR for V2.5 or V3. No video player, placeholder, assets, automatic embeds
or third-party video tracking are added in this release. A future PR should isolate its module/assets,
follow this brand, provide captions/transcript and an accessible play control, and document bandwidth
and privacy behavior. Review that PR independently; do not merge it automatically into V2 or V3.

## Primary references

[Vercel function limits](https://vercel.com/docs/functions/limitations),
[DuckDB Node Neo](https://duckdb.org/docs/current/clients/node_neo/overview),
[Umami installation](https://docs.umami.is/docs/install),
[Umami tracker](https://docs.umami.is/docs/tracker-functions),
[Umami reporting API](https://docs.umami.is/docs/guides/automate-reporting-with-api).
