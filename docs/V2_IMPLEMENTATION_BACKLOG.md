# V2 implementation backlog

Implementation work breakdown. Execute against [V2 specification](V2_DESIGN_SPEC.md).
Employee/profile API integration and two-sided workforce analysis belong to [V3](V3_DESIGN_AND_API_RESEARCH.md).
Current evidence is in the [V2 build report](V2_BUILD_REPORT.md): WP01–WP08 are implemented; WP09
automated checks pass, with human usability sessions outstanding; WP10 is configured
locally but requires actual Vercel account/project access and host verification before release.

| Package | Dependencies | Deliverable | Acceptance scenarios |
|---|---|---|---|
| WP01 Data intake | None | Pinned upstream importer, checksum/schema validation, rejects and source audit | AT01 |
| WP02 Data contract and merge | WP01 | Strict public schemas, source-specific stores, canonical identity, field provenance, sanitized versioned shards | AT02, AT03, AT08, AT13 |
| WP03 App and query foundation | WP02 | React/TS/Vite shell, worker engine benchmark at real upstream scale, selection store, versioned loading | AT04, AT05 |
| WP04 Explore | WP03 | Categorical overview, aggregate counts, deterministic drill-down, unknown lanes, accessible record tray | AT04, AT05, AT12 |
| WP05 Compare and metric registry | WP03 | Frozen A/B cohorts, overlap, aligned comparisons, pay gates and contributor queries | AT05–AT08 |
| WP06 Skills | WP03, WP05 | Matrix, supported focused graph, source-aware denominators; optional evaluated projection | AT09 |
| WP07 Evidence and readiness | WP04–WP06 | Public explanation drawer, history/geographic readiness, source and quality distinctions | AT08, AT10, AT13 |
| WP08 Sharing and export | WP03–WP07 | URL serialization/back-forward, oversized state export, safe consistent CSV | AT05, AT11 |
| WP09 Browser and usability gates | WP04–WP08 | Real-data and synthetic scale tests, mobile/keyboard/reduced-motion checks, task study | AT04–AT13 |
| WP10 Vercel preview and release | WP09 | Self-contained frontend build, protected previews where configured, deep links, live checks, rollback record | AT14, AT15 |

Start with WP01–WP03. Do not collect employee profiles, buy API subscriptions, or modify the live V1 site
as part of executing this backlog. Keep each work package reviewable with its test evidence. Release the
complete V2 experience after the required gates pass, rather than shipping isolated cosmetic changes.
