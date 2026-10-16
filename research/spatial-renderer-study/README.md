# Bounded renderer experiment

Isolated comparison used for the V2.5.1 renderer decision; not deployed application code. Run `npm install --ignore-scripts`, `npm run build`, then `npm run dev` from this directory. Visit `/three.html` and `/deck.html`. The application does not depend on deck.gl.

`cells.json` contains only public-field aggregate counts from the verified sanitized posting store: 462 occupied occupation/level/arrangement cells totaling 82,851 default-open postings. The dataset hash is included. Both scenes use the same cells, identical `radius = 1 + sqrt(count)/3` technical-prototype mapping (not an exact-area analytical scale) and 1000×700 viewport. Orientation/camera implementations differ, so this is a bounded engineering comparison, not a controlled usability study.

The root report `docs/V2_5_1_RENDERER_STUDY.json` labels the single-run software-WebGL limits. Production gzip sizes are build outputs, not browser transfer sizes. CPU render-submit times do not establish GPU fps. R3F and the application shell are absent from these core-renderer prototypes; measure the actual application separately.

Browser hooks: `window.ready`, `window.input`, async `window.renderStep(i)`, `window.pick()`, `window.frames`, `window.dispose()`. No analytics, private fields, API requests or collection.
