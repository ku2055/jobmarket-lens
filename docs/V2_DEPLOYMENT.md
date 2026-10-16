# V2 production deployment

Deployed for review on 2026-10-16: **https://jobmarket.feedos.si**.
V1 remains on [GitHub Pages](https://liyue2055.github.io/jobmarket-lens/).
V2.5 and V3 remain design-only.

## Release baseline

| Setting | Value |
|---|---|
| Vercel scope / project | `self-59d1` / `jobmarket-lens-v2` |
| Project ID | `prj_H0O47djKUczfGGueSe4PTAXiGyLw` |
| Deployment ID | `dpl_37dWaAV5rvYnNWu2SJKcsVYgqN6E` |
| Deployment URL | https://jobmarket-lens-v2-kimgokeg5-self-59d1.vercel.app |
| Source branch | `feat/v2-workspace` |
| Source commit | `1b0f7d28067c5030aed1a169ce937a7fbf8fa3d2` |
| Dataset | `9bd992ecffd1bb6fad5a0715ca8c38a75b1bb4416df342c49abbb02a38b8de28` |
| Framework / runtime | Vite / Node.js 22.x |
| Root / install / build / output | `frontend` / `npm ci` / `npm run build` / `dist` |
| Account plan | Existing Hobby plan; no paid upgrade or domain purchase |

The deployment was built from the committed GitHub source, without uploading local private files.
Only sanitized public artifacts are served. Combined inventory is 86,190 postings; the local source
mode exposes 92 sanitized records. Counts describe the pinned snapshot, not current vacancies.

## Domain and automation

`feedos.si` already uses Vercel DNS. Only the new `jobmarket.feedos.si` project domain was added;
Vercel provisioned its DNS routing and HTTPS certificate. Existing apex and other subdomain projects
were left unchanged. No new registrar account is needed.

The project is connected to `liyue2055/jobmarket-lens`, with `main` as its Git production branch.
The initial production release was explicitly requested from the tested feature commit. Subsequent
feature-branch pushes create previews; they do not automatically replace this production release.
Merge and production promotion are separate release actions.

For local CLI operations use the repository root and explicitly select the project, because its
configured root is already `frontend`. At the initial V2 launch, the root `.vercelignore` permitted only the frontend source;
the later V2.5 branch also permits its separate `node25/` application root.
Both application ignore files exclude dependencies, compiled output, browser reports and local environment files.
A CLI dry run found 81 source/public files (282,397,580 bytes), with private storage excluded.
Do not commit CLI-created `.vercel/` or `.env.local` files.

## Live verification

[Machine-readable evidence](V2_DEPLOYMENT_CHECKS.json) records the checks:

- Valid HTTPS, all four workspace routes and deep-link reloads; missing data/assets return genuine 404s.
- All 41 artifact hashes and byte lengths match the committed manifest; exact source union and overlap.
- Manifest revalidation and immutable versioned-data cache headers.
- All six existing Playwright scenarios passed against the live domain, including comparisons, export,
  mobile keyboard/focus, corrupted-data rejection, state restoration and automated accessibility checks.
- Independent CSV parse matches all 92 local contributor IDs; no browser errors or mobile horizontal overflow.

An unthrottled cloud Chromium observation showed summary content at 987 ms and completed loading at
7.4 seconds. It is not a physical mobile, network-throttled or whole-browser memory benchmark.
Human usability sessions and a demonstrated paired rollback remain outstanding acceptance work.

## Updating and recovering

Build and validate each app/data release together; keep the manifest and its referenced content-addressed
files in the same deployment. Review the feature preview before explicitly promoting a tested release
to production, or merge an approved change into the connected production branch.

If a later release regresses, use the project's Vercel deployment history to restore the recorded
known-good deployment above. Restore the entire deployment so application code, manifest and shards
move together; do not replace only the manifest. Verify the custom domain, dataset version, all hashes,
deep links and browser scenarios after recovery. Retain this baseline deployment in Vercel.
This recovery procedure is documented but has not been exercised; there was no prior V2 production
deployment to roll back to during this initial launch.
