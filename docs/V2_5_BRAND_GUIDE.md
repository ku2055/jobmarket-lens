# JobMarket Lens V2.5 brand guide

This guide records the V2.5 identity in `node25/`, separate from the existing V2 experience. The brand is for a research canvas that helps people inspect job-posting demand signals and their evidence. It must not imply complete market coverage, verified hiring, or available talent.

## Brand assets

- [Lens mark SVG](../node25/public/brand/mark.svg) — compact brand mark on an ink tile.
- [Wordmark SVG](../node25/public/brand/wordmark.svg) — mark, JobMarket Lens name, and “RESEARCH CANVAS / 2.5” descriptor.
- [Favicon SVG](../node25/public/favicon.svg) — compact mark for browser tabs.
- [Social sharing PNG](../node25/public/brand/social.png) — raster preview for social platforms.
- [Social sharing SVG](../node25/public/brand/social.svg) — 1200 × 630 preview graphic with the product message and an illustrative interface.
- [DM Sans Latin font](../node25/public/brand/dm-sans-latin.woff2) and [OFL license](../node25/public/brand/dm-sans-OFL.txt).
- [Manrope Latin font](../node25/public/brand/manrope-latin.woff2) and [OFL license](../node25/public/brand/manrope-OFL.txt).

The bundled font files carry SIL Open Font License notices. Preserve each license with its font when redistributing the assets. The SVG wordmark and social artwork currently render their text with Arial fallbacks; they are artwork assets and do not demonstrate which web font the application loaded.

## Identity and design tokens

The message is **“See the demand. Check the evidence.”** Supporting copy: **“Explore postings. Compare perspectives. Keep the source in sight.”** Use the name **JobMarket Lens** and identify this application as **Research Canvas / 2.5** where version context is needed.

| Token | Value | Intended use |
|---|---|---|
| Ink | `#173E43` | Main headings, navigation, strong text, and primary surfaces |
| Teal | `#28776D` | Primary actions and analytical marks |
| Mint | `#77C5B7` | Supporting marks and fills |
| Amber | `#E4B45F` | Comparison, attention, or secondary-series accents |
| Canvas | `#F4F6F3` | Main page background |
| Border | `#DCE5DF` | Dividers, panel edges, and quiet boundaries |
| Secondary text | `#567176` | Supporting labels and explanatory text |
| Typography | Manrope headings; DM Sans body | Use the bundled Latin WOFF2 files and retain the supplied OFL notices |
| Spacing | 4 px base | Build spacing from 4 px increments |
| Corner radii | 8, 12, and 18 px | Use for controls, cards, and larger panels respectively |

These values are implemented in the [application stylesheet](../node25/src/style.css) and recorded in [the execution and admin notes](V2_5_EXECUTION_AND_ADMIN.md). Automated and visual checks cover specific views and sizes; they do not establish comprehensive accessibility conformance.

## Logo handling

Use the SVG assets at their natural aspect ratio. Keep a clear-space margin around the mark at least the width of the lens stroke (about 2 px in the 40 × 40 viewBox); for the wordmark, preserve at least 8 SVG units around the full artwork. These are practical minimum recommendations, not measured existing layout rules. Do not redraw, recolor, stretch, crop, add effects to, or place the ink-backed mark on a background where its silhouette disappears.

For raster exports, use the favicon/mark at 32 px square or larger and the complete wordmark at 196 px wide or larger. These are suggested lower bounds for legibility, not validated rendering thresholds. Prefer the wordmark when the product name must be read; use the mark alone only when the surrounding context already names JobMarket Lens.

## Charts and accessible use

Use ink and teal for primary series, mint for supporting context, and amber for comparison or attention. Pair every colored series and matrix value with a visible text label, count, legend, or table cell. Do not communicate source mode, status, selected cohort, missingness, or a threshold using color alone. Include units, population/denominator, and a concise explanation of what each measure represents. Use visible keyboard focus and retain a readable table or equivalent text alternative for charts and matrices.

These are usage requirements, not a claim that every chart has passed contrast or assistive-technology testing. Check contrast for the actual foreground/background pair and ensure labels remain understandable in monochrome before release.

## Social sharing

The existing [social preview SVG](../node25/public/brand/social.svg) uses this message:

> See the demand. Check the evidence.

Its supporting line is “Explore postings. Compare perspectives. Keep the source in sight.” It labels the chart-like panel as illustrative and states that posting counts do not establish hires or available talent. Preserve that distinction in future social copy. Keep the preview at 1200 × 630 proportions and ensure replacement artwork has an accurate public URL and descriptive alternative text where rendered in-page.

## Future video contribution boundary

No video player, placeholder, video asset, automatic embed, or video-specific tracking is part of the current V2.5 brand package. A future video-team PR should isolate its module and assets; follow the palette and typography above; provide captions and a transcript, a keyboard-accessible play control, and a clear poster/alternative description; and document bandwidth and privacy behavior. Review that work as a separate contribution before integration. These are handoff guidelines from the execution notes, not evidence that any video behavior exists or has been tested.
