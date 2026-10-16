import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import Ajv from "ajv";
const root = resolve(process.argv[2] || "public"),
  data = join(root, "data");
const schema = JSON.parse(
  await readFile(
    new URL("../src/data/contracts/release.schema.json", import.meta.url),
    "utf8",
  ),
);
const ajv = new Ajv({ allErrors: true, strict: false }),
  validators = new Map();
function valid(kind, value) {
  let v = validators.get(kind);
  if (!v) {
    v = ajv.compile({ $ref: `#/$defs/${kind}`, $defs: schema.$defs });
    validators.set(kind, v);
  }
  if (!v(value))
    throw Error(`${kind}: ${ajv.errorsText(v.errors).slice(0, 400)}`);
}
const manifest = JSON.parse(
  await readFile(join(data, "manifest.json"), "utf8"),
);
valid("manifest", manifest);
const records = { combined: 0, upstream: 0, local: 0 },
  ids = { combined: new Set(), upstream: new Set(), local: new Set() },
  refs = [];
const companyIds = new Set(),
  skillIds = new Set(),
  occupationIds = new Set(),
  licenseIds = new Set(),
  sourceIds = new Set(),
  seenFiles = new Set(),
  catalogKinds = new Set();
let catalogSummary;
for (const f of manifest.files) {
  if (
    !new RegExp(
      `^releases/${manifest.datasetVersion}/[A-Za-z0-9._-]+\\.json$`,
    ).test(f.path) ||
    seenFiles.has(f.path)
  )
    throw Error("Invalid/duplicate release path");
  seenFiles.add(f.path);
  const bytes = await readFile(join(data, f.path));
  if (
    bytes.length !== f.bytes ||
    createHash("sha256").update(bytes).digest("hex") !== f.sha256
  )
    throw Error(`Integrity failure: ${f.path}`);
  if (f.kind !== "postings") {
    if (catalogKinds.has(f.kind)) throw Error("Duplicate catalog kind");
    catalogKinds.add(f.kind);
  }
  const obj = JSON.parse(bytes);
  valid(f.kind === "postings" ? "shard" : f.kind, obj);
  if (f.kind === "postings") {
    if (
      obj.sourceMode !== f.sourceMode ||
      obj.postings.length !== f.recordCount ||
      obj.postings.length > 5000
    )
      throw Error("Shard source/count mismatch");
    for (const r of obj.postings) {
      if (ids[f.sourceMode].has(r.id)) throw Error("Duplicate ID");
      ids[f.sourceMode].add(r.id);
      records[f.sourceMode]++;
      refs.push([
        r.companyId,
        r.occupationId,
        r.skillIds,
        r.licenseIds,
        r.sourceIds,
        Object.values(r.provenance),
        Object.values(r.fieldProvenance),
      ]);
      if (r.sourceUrl && !/^https?:\/\//.test(r.sourceUrl))
        throw Error("Unsafe source URL");
    }
  } else if (f.kind === "companies") {
    if (obj.length !== f.recordCount) throw Error("Company count mismatch");
    for (const r of obj) {
      if (companyIds.has(r.id)) throw Error("Duplicate company");
      companyIds.add(r.id);
    }
  } else if (f.kind === "taxonomy") {
    for (const r of obj.skills) skillIds.add(r.id);
    for (const r of obj.occupations) occupationIds.add(r.id);
    for (const r of obj.licenses) licenseIds.add(r.id);
  } else if (f.kind === "sources") for (const r of obj) sourceIds.add(r.id);
  else if (f.kind === "summary") catalogSummary = obj;
}
for (const mode of Object.keys(records)) {
  if (
    records[mode] !== manifest.counts[mode] ||
    records[mode] !== catalogSummary.sourceModes[mode].count
  )
    throw Error(`Incomplete ${mode} release`);
}
for (const [
  company,
  occupation,
  skills,
  licenses,
  sources,
  provenance,
  overrides,
] of refs) {
  if (
    !companyIds.has(company) ||
    (occupation && !occupationIds.has(occupation)) ||
    skills.some((s) => !skillIds.has(s)) ||
    licenses.some((s) => !licenseIds.has(s)) ||
    [...sources, ...provenance, ...overrides].some((s) => !sourceIds.has(s))
  )
    throw Error("Broken catalog reference");
}
if (
  ["companies", "taxonomy", "sources", "summary"].some(
    (k) => !catalogKinds.has(k),
  )
)
  throw Error("Missing required catalog");
const overlap = [...ids.local].filter((x) => ids.upstream.has(x)).length;
if (
  overlap !== manifest.counts.overlap ||
  new Set([...ids.local, ...ids.upstream]).size !== records.combined ||
  [...ids.local, ...ids.upstream].some((id) => !ids.combined.has(id))
)
  throw Error("Source-mode reconciliation failed");
const forbidden =
  /(?:PRIVATE_SENTINEL|PRIVATE_EVIDENCE_SENTINEL|BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY)/;
async function scan(dir) {
  for (const name of await readdir(dir)) {
    const p = join(dir, name),
      s = await stat(p);
    if (s.isDirectory()) {
      await scan(p);
      continue;
    }
    if (/(?:\.sqlite3?|\.db|\.env|\.tar\.gz)$/i.test(name))
      throw Error("Forbidden private build file");
    if (/\.(?:json|js|html|css|map|txt)$/.test(name)) {
      const text = await readFile(p, "utf8");
      if (forbidden.test(text))
        throw Error("Private sentinel in public output");
    }
  }
}
await scan(root);
console.log(
  `V2 public boundary passed: ${records.combined.toLocaleString()} combined IDs, ${manifest.files.length} integrity-checked files, strict schemas and catalog references.`,
);
