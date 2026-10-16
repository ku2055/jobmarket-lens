import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { parse } from "csv-parse/sync";
import handler from "../server/handler.mjs";
const input = {
  protocolVersion: "2.5",
  requestId: "http-test",
  sourceMode: "local",
  view: "records",
  filter: { availability: "all" },
};
test("HTTP boundary protects admin, rejects malformed API and exports exact92 with matching hash", async () => {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    const admin = await fetch(base + "/api/admin");
    assert.equal(admin.status, 401);
    assert.equal(admin.headers.get("cache-control"), "no-store");
    assert.equal(
      (await fetch(base + "/api/query", { method: "POST", body: "{oops" }))
        .status,
      400,
    );
    assert.equal((await fetch(base + "/api/unknown")).status, 404);
    const r = await fetch(base + "/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
      data = await r.json();
    assert.equal(r.status, 200);
    assert.equal(data.matchedCount, 92);
    const csv = await fetch(base + "/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    assert.equal(csv.status, 200);
    assert.equal(csv.headers.get("x-contributor-hash"), data.contributorHash);
    const records = parse(await csv.text(), { columns: true, bom: true });
    assert.equal(records.length, 92);
    assert.equal(Object.keys(records[0]).length, 37);
    assert.equal(records[0].skill_ids, data.data.rows[0].skillIds.join("; "));
    assert.deepEqual(JSON.parse(records[0].field_provenance), {
      groups: data.data.rows[0].provenance,
      fields: data.data.rows[0].fieldProvenance,
    });
    assert.deepEqual(
      new Set(records.map((v) => v.id)),
      new Set(data.data.rows.map((v) => v.id)),
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
