# Open-source visitor analytics: Umami

The user explicitly selected open-source analytics instead of Vercel Analytics. Umami is MIT licensed;
we integrate its public tracker and server reporting API, without copying its source into this app.
This package prepares self-hosted Umami 3.4.0 and PostgreSQL. It has not been started in this workspace:
Docker and a persistent public analytics host/database are unavailable. No paid service was provisioned.
The V2.5 owner console shows this honestly as unconfigured until connected.

## Self-host on an existing persistent server

From this directory on a host with Docker Compose:

```sh
node init-config.mjs
docker compose -f compose.yml config --quiet
docker compose -f compose.yml up -d
```

The generated `.env` is private and ignored. Umami binds only to `127.0.0.1:3006`; PostgreSQL has no
host port. Use SSH forwarding for initial setup. Change Umami's documented initial `admin` / `umami`
password immediately, then create a website for `lens.feedos.si` and a restricted reporting identity/API
token with access only to that website. Do not expose the default account publicly. Put an HTTPS reverse
proxy in front after setup. A possible separate address is `analytics.feedos.si`; no DNS record for it
has been created. Do not expose PostgreSQL. Retain the named volume across restarts.

The Umami image is version-pinned; the PostgreSQL major tag follows patch updates. Review image
security/compatibility and optionally pin tested digests before a real deployment. The compose file
follows the official app/database layout, but Docker execution and restore remain unverified here.

## Connect V2.5

Set these **server-only** environment variables on the separate V2.5 project:

```text
UMAMI_URL=https://your-analytics-host.example
UMAMI_WEBSITE_ID=<website UUID>
UMAMI_API_TOKEN=<restricted reporting bearer token>
```

`UMAMI_URL` must be an HTTPS origin, without credentials, query, fragment or extra path. The catalog
exposes only the public script URL and website ID. It never returns the reporting token. The manual
tracker sends only allowlisted public page paths and fixed page titles; no query strings, URL fragments,
search terms, pins, identities, session replay or admin routes. The server API reads seven-day stats
and path/country aggregates. Counts are estimates of visits/sessions, not identified people.

Backend endpoints used: `GET /api/websites/{id}/stats` and `GET /api/websites/{id}/metrics`, with
`startAt`/`endAt` milliseconds and `type=path` or `country`. The adapter authenticates server-side with
`Authorization: Bearer`. Unavailable/configuration errors remain unavailable rather than displayed as
zero traffic. API compatibility is tested with documented-shape fixtures; live Umami integration remains
pending a host. Do not send the token in chat or a `VITE_*` variable.

## Retention, backup and verification

Choose a retention period before public collection; initial recommendation is 90 days, subject to owner
review. No scheduled purge is claimed here. Back up PostgreSQL to private storage, for example using
`pg_dump` inside the database container, and test restoration into a separate temporary database before
relying on that backup. Keep all dumps and generated secrets outside Git/public builds.

Verify after connection: the first public page generates one sanitized event; navigation generates one
per route change; filtering and `/admin` generate none. Check HTTPS, token permissions, totals, selected
date range, unavailable behavior and a database restart preserving counts. Consent/notice decisions
must reflect the actual hosting location and configuration; cookieless tracking alone is not a blanket
legal conclusion.

References: [Umami repository/license](https://github.com/umami-software/umami),
[installation](https://docs.umami.is/docs/install),
[tracker functions](https://docs.umami.is/docs/tracker-functions),
[tracker configuration](https://docs.umami.is/docs/tracker-configuration),
[reporting API](https://docs.umami.is/docs/guides/automate-reporting-with-api).
