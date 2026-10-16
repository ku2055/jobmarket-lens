import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { parse } from "csv-parse/sync";
import handler from "../server/handler.mjs";

test("spatial HTTP scenes, exact selection, CSV and tamper rejection agree", async () => {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const post = (path, body) =>
    fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    const catalog = await (await fetch(base + "/api/catalog")).json();
    const request = {
      protocolVersion: "2.5.1",
      datasetVersion: catalog.datasetVersion,
      requestId: "http-spatial",
      sourceMode: "local",
      filter: { availability: "all" },
      lens: "demand_shelves",
      basis: "posting_inventory",
    };
    const sceneResponse = await post("/api/spatial", request);
    assert.equal(sceneResponse.status, 200);
    assert.equal(sceneResponse.headers.get("cache-control"), "no-store");
    const scene = await sceneResponse.json();
    assert.equal(scene.matchedCount, 92);
    const cells = scene.data.cells.filter((c) => c.count > 0).slice(0, 3);
    const envelope = {
      sceneRequest: scene.sceneRequest,
      sceneQueryHash: scene.queryHash,
      selection: {
        kind: "cell_union",
        cellIds: [...cells.map((c) => c.id), cells[0].id],
      },
    };
    const selectionResponse = await post("/api/spatial/selection", envelope);
    assert.equal(selectionResponse.status, 200);
    const selected = await selectionResponse.json();
    assert.equal(
      selected.matchedCount,
      cells.reduce((n, c) => n + c.count, 0),
    );
    const csvResponse = await post("/api/spatial/export", envelope);
    assert.equal(csvResponse.status, 200);
    assert.equal(
      csvResponse.headers.get("x-contributor-hash"),
      selected.contributorHash,
    );
    assert.equal(
      csvResponse.headers.get("x-dataset-version"),
      catalog.datasetVersion,
    );
    const records = parse(await csvResponse.text(), {
      columns: true,
      bom: true,
    });
    assert.equal(records.length, selected.matchedCount);
    assert.equal(Object.keys(records[0]).length, 37);
    assert.equal(new Set(records.map((r) => r.id)).size, selected.matchedCount);
    assert.equal(
      (
        await post("/api/spatial/selection", {
          ...envelope,
          sceneQueryHash: "0".repeat(64),
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await post("/api/spatial/selection", {
          ...envelope,
          selection: { kind: "cell_union", cellIds: ["unregistered-cell"] },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await post("/api/spatial", {
          ...request,
          sql: "SELECT * FROM postings",
        })
      ).status,
      400,
    );
    assert.equal((await fetch(base + "/api/spatial")).status, 404);
    for (const path of [
      "/api/query",
      "/api/spatial",
      "/api/spatial/selection",
      "/api/spatial/export",
    ]) {
      const oversize = await fetch(base + path, {
        method: "POST",
        body: " ".repeat(131073),
      });
      assert.equal(oversize.status, 413, path);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
