import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { parse } from "csv-parse/sync";
import AxeBuilder from "@axe-core/playwright";
const manifest = JSON.parse(
  fs.readFileSync(
    new URL("../../public/data/manifest.json", import.meta.url),
    "utf8",
  ),
);
const localState = {
  v: 2,
  datasetVersion: manifest.datasetVersion,
  sourceMode: "local",
  workspace: "explore",
  query: {
    search: "",
    filters: {
      companyId: [],
      occupationId: [],
      level: [],
      arrangement: [],
      country: [],
      skillIds: [],
      availability: ["local_observed", "upstream_reported_open"],
    },
    includeUnknown: true,
  },
  a: null,
  b: null,
  selected: null,
};
const localUrl =
  "/explore?state=" + encodeURIComponent(JSON.stringify(localState));
test("real full inventory, coordinated filters, frozen comparisons, safe export and history", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/explore");
  await expect(
    page.getByRole("button", { name: /Matching postings/ }),
  ).toBeVisible();
  const total = page.getByRole("button", { name: /Matching postings/ });
  await expect(total).toContainText("82,");
  await expect(page.getByRole("table").first()).toBeVisible();
  await page.getByLabel("Data source mode").selectOption("local");
  await expect(total).toContainText("92");
  await page.getByRole("button", { name: "Pin cohort" }).first().click();
  const search = page.getByLabel("Search title, employer or skill");
  await search.fill("engineer");
  await expect(total.locator("strong")).not.toHaveText("92");
  await page.getByRole("button", { name: "Pin cohort" }).nth(1).click();
  await page.getByRole("link", { name: "Compare", exact: true }).click();
  await expect(page.getByText(/shared posting IDs/)).toBeVisible();
  await expect(page.getByLabel("Cohort A name")).toHaveValue("Cohort A");
  await page
    .getByRole("button", { name: /contributors in cohort A/ })
    .first()
    .click();
  await expect(
    page.getByRole("region", { name: "Frozen cohort skill contributors" }),
  ).toBeVisible();

  await expect(
    page.getByText("Frozen membership", { exact: false }).first(),
  ).toBeVisible();
  const down = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  const file = await down;
  expect(file.suggestedFilename()).toMatch(/\.csv$/);
  const csv = parse(fs.readFileSync((await file.path())!, "utf8"), {
    columns: true,
    bom: true,
  });
  expect(csv.length).toBe(Number(await total.locator("strong").innerText()));
  expect(new Set(csv.map((r: any) => r.id)).size).toBe(csv.length);
  expect(
    csv.every(
      (r: any) =>
        r.source_mode === "local" &&
        r.dataset_version === manifest.datasetVersion,
    ),
  ).toBeTruthy();
  await page.getByRole("link", { name: "Skills", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Read the pattern, then the detail" }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Make the difference visible." }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("mobile keyboard record inspection, reduced motion and state restore", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(localUrl);
  await expect(
    page.getByRole("button", { name: /Matching postings/ }),
  ).toContainText("92");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Filter postings" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close filters" }).click();
  const inspect = page.getByRole("button", { name: /Inspect / }).first();
  await inspect.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close detail panel" }),
  ).toBeFocused();
  const drawerAudit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(drawerAudit.violations.map((v) => v.id)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(inspect).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("link", { name: "Evidence", exact: true }).click();
  await expect(
    page.getByText("Unavailable: comparable weekly observation history."),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/v2-mobile.png", fullPage: true });
});
test("release corruption fails closed and unsupported state is explained", async ({
  page,
}) => {
  await page.route("**/data/releases/**/postings-local-*.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"description":"PRIVATE_SENTINEL"}',
    }),
  );
  await page.goto(localUrl);
  await expect(page.getByRole("alert")).toContainText("integrity");
  await expect(
    page.getByRole("button", { name: /Matching postings/ }),
  ).toHaveCount(0);
});
test("deep links and invalid shared state show useful behavior", async ({
  page,
}) => {
  await page.goto(
    "/evidence?state=" +
      encodeURIComponent(
        JSON.stringify({ ...localState, workspace: "evidence" }),
      ),
  );
  await expect(
    page.getByRole("heading", { name: "Every result has a basis." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Every result has a basis." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/v2-evidence-desktop.png",
    fullPage: true,
  });
  await page.goto(
    "/explore?state=" +
      encodeURIComponent(
        JSON.stringify({
          ...localState,
          query: {
            ...localState.query,
            filters: { ...localState.query.filters, arrangement: ["Teleport"] },
          },
        }),
      ),
  );
  await expect(page.getByRole("alert")).toContainText("Invalid or unsupported");
});

test("WCAG checks across the four local workspaces", async ({ page }) => {
  await page.goto(localUrl);
  await expect(
    page.getByRole("button", { name: /Matching postings/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pin cohort" }).first().click();
  await page.getByRole("button", { name: "Pin cohort" }).nth(1).click();
  for (const name of ["Explore", "Compare", "Skills", "Evidence"]) {
    await page.getByRole("link", { name, exact: true }).click();
    if (name === "Compare")
      await expect(page.getByText(/shared posting IDs/)).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        workspace: name,
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});

test("explicit skill-cell drill-down matches its count and state restore is reproducible", async ({
  page,
}) => {
  await page.goto(localUrl);
  await expect(
    page.getByRole("button", { name: /Matching postings/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Skills", exact: true }).click();
  const cells = page.locator(".skill-matrix tbody td button");
  await cells.first().waitFor();
  let chosen = cells.first(),
    expected = 0;
  for (let i = 0; i < (await cells.count()); i++) {
    const c = cells.nth(i);
    const n = Number(
      (await c.getAttribute("aria-label"))?.match(/:\s*(\d+) of/)?.[1],
    );
    if (n > 0) {
      chosen = c;
      expected = n;
      break;
    }
  }
  await chosen.click();
  await expect(
    page.getByRole("button", { name: /Matching postings/ }).locator("strong"),
  ).toHaveText(String(expected));
  await expect(page.getByLabel("Include unknown values")).not.toBeChecked();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Matching postings/ }).locator("strong"),
  ).toHaveText(String(expected));
  await page.getByRole("link", { name: "Evidence", exact: true }).click();
  await page.getByLabel("Import analysis state").setInputFiles({
    name: "analysis.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ ...localState, workspace: "evidence" }),
    ),
  });
  await expect(
    page.getByRole("button", { name: /Matching postings/ }).locator("strong"),
  ).toHaveText("92");
});
