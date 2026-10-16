import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  login,
  logout,
  authenticated,
  traffic,
} from "../server/admin.mjs";
const env = {
  ADMIN_PASSWORD_HASH: hashPassword("test-admin-only-password-not-production"),
  ADMIN_SESSION_SECRET: "test-session-only-secret-not-production-123456",
};
const request = () => ({
  headers: {
    host: "localhost:4175",
    origin: "http://localhost:4175",
    "x-forwarded-for": "test-client",
  },
  socket: {},
});
function response() {
  return {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
  };
}
test("admin rejects missing config, wrong password and cross-origin login", () => {
  assert.equal(authenticated(request(), {}), false);
  assert.throws(
    () => login(request(), response(), { password: "wrong" }, env),
    (e) => e.status === 401,
  );
  const r = request();
  r.headers.origin = "https://attacker.example";
  assert.throws(
    () =>
      login(
        r,
        response(),
        { password: "test-admin-only-password-not-production" },
        env,
      ),
    (e) => e.status === 403,
  );
  assert.throws(
    () => login(request(), response(), {}, {}),
    (e) => e.status === 503,
  );
});
test("signed three-hour HttpOnly strict cookie validates; tampering and rotation fail", () => {
  const res = response(),
    result = login(
      request(),
      res,
      { password: "test-admin-only-password-not-production" },
      env,
    ),
    cookie = res.headers["Set-Cookie"];
  assert.equal(result.expiresInSeconds, 10800);
  assert.match(cookie, /HttpOnly; SameSite=Strict/);
  assert.match(cookie, /Path=\/api\/admin/);
  const r = request();
  r.headers.cookie = cookie.split(";")[0];
  assert.equal(authenticated(r, env), true);
  assert.equal(
    authenticated(r, {
      ...env,
      ADMIN_PASSWORD_HASH: hashPassword("rotated-password-value"),
    }),
    false,
  );
  r.headers.cookie += "X";
  assert.equal(authenticated(r, env), false);
});
test("secure production cookie and logout clear session", () => {
  const res = response();
  login(
    request(),
    res,
    { password: "test-admin-only-password-not-production" },
    { ...env, VERCEL: "1" },
  );
  assert.match(res.headers["Set-Cookie"], /; Secure/);
  logout(request(), res);
  assert.match(res.headers["Set-Cookie"], /Max-Age=0/);
});
test("unconfigured analytics are unavailable rather than invented zeros", async () => {
  const r = await traffic({});
  assert.equal(r.configured, false);
  assert.equal(r.visitors, null);
  assert.equal(r.pageViews, null);
  assert.equal(r.routes.length, 0);
});

test("Umami exposes only public tracker configuration and fixed aggregate reports", async () => {
  const { analyticsConfig } = await import("../server/admin.mjs");
  assert.equal(
    analyticsConfig({
      UMAMI_URL: "http://insecure.test",
      UMAMI_WEBSITE_ID: "00000000-0000-0000-0000-000000000001",
    }),
    null,
  );
  assert.equal(
    analyticsConfig({
      UMAMI_URL: "https://user:secret@example.test",
      UMAMI_WEBSITE_ID: "00000000-0000-0000-0000-000000000001",
    }),
    null,
  );
  const config = {
    UMAMI_URL: "https://analytics.example.test",
    UMAMI_WEBSITE_ID: "00000000-0000-0000-0000-000000000001",
    UMAMI_API_TOKEN: "server-only-fixture-token",
  };
  assert.deepEqual(analyticsConfig(config), {
    scriptUrl: "https://analytics.example.test/script.js",
    websiteId: config.UMAMI_WEBSITE_ID,
  });
  const original = globalThis.fetch,
    urls = [];
  globalThis.fetch = async (url, options) => {
    const u = new URL(url);
    urls.push(u);
    assert.equal(
      options.headers.Authorization,
      "Bearer server-only-fixture-token",
    );
    assert(
      u.pathname.startsWith("/api/websites/" + config.UMAMI_WEBSITE_ID + "/"),
    );
    assert.equal(u.searchParams.has("startAt"), true);
    assert.equal(u.searchParams.has("endAt"), true);
    const data = u.pathname.endsWith("/stats")
      ? { pageviews: 31, visitors: 12 }
      : u.searchParams.get("type") === "path"
        ? [{ x: "/canvas", y: 22 }]
        : [{ x: "US", y: 10 }];
    return { ok: true, json: async () => data };
  };
  try {
    const r = await traffic(config);
    assert.equal(r.source, "Umami (self-hosted, open source)");
    assert.equal(r.configured, true);
    assert.equal(r.pageViews, 31);
    assert.equal(r.visitors, 12);
    assert.equal(r.routes[0].path, "/canvas");
    assert.equal(r.countries[0].country, "US");
    assert.equal(JSON.stringify(r).includes(config.UMAMI_API_TOKEN), false);
    assert.equal(urls.length, 3);
  } finally {
    globalThis.fetch = original;
  }
});
