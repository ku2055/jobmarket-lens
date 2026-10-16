import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAppServer } from "../server/index.mjs";

test("Node production server streams versioned tour ranges and caption MIME; spatial route is bounded", async () => {
  const root = await mkdtemp(join(tmpdir(), "lens-static-"));
  await mkdir(join(root, "video"));
  await writeFile(join(root, "index.html"), "<main>App shell</main>");
  // Synthetic bytes test HTTP range behavior, not video decoding.
  await writeFile(join(root, "video/tour-v1-720.mp4"), "0123456789abcdef");
  await writeFile(join(root, "video/tour-v1.en.vtt"), "WEBVTT\n");
  const server = createAppServer(root);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    const response = await fetch(base + "/video/tour-v1-720.mp4", {
      headers: { Range: "bytes=2-5" },
    });
    assert.equal(response.status, 206);
    assert.equal(await response.text(), "2345");
    assert.equal(response.headers.get("content-type"), "video/mp4");
    assert.equal(response.headers.get("content-range"), "bytes 2-5/16");
    assert.equal(response.headers.get("content-length"), "4");
    assert.match(response.headers.get("cache-control"), /immutable/);
    const suffix = await fetch(base + "/video/tour-v1-720.mp4", {
      headers: { Range: "bytes=-3" },
    });
    assert.equal(suffix.status, 206);
    assert.equal(await suffix.text(), "def");
    for (const range of [
      "bytes=99-",
      "bytes=4-2",
      "bytes=-0",
      "bytes=1-2,4-5",
      "bad",
    ]) {
      const bad = await fetch(base + "/video/tour-v1-720.mp4", {
        headers: { Range: range },
      });
      assert.equal(bad.status, 416);
      assert.equal(bad.headers.get("content-range"), "bytes */16");
    }
    const head = await fetch(base + "/video/tour-v1-720.mp4", {
      method: "HEAD",
    });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("content-length"), "16");
    assert.equal(await head.text(), "");
    const captions = await fetch(base + "/video/tour-v1.en.vtt");
    assert.match(captions.headers.get("content-type"), /^text\/vtt/);
    assert.equal((await fetch(base + "/spatial/")).status, 200);
    assert.equal((await fetch(base + "/missing.mp4")).status, 404);
    assert.equal((await fetch(base + "/%E0%A4%A")).status, 400);
    assert.equal(
      (await fetch(base + "/video/tour-v1-720.mp4", { method: "POST" })).status,
      405,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
