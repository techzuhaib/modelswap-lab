import { test, expect } from "@playwright/test";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lV8AAAAASUVORK5CYII=",
  "base64",
);
test("register, benchmark, import, rate, and export", async ({ page }) => {
  await page.goto("/");
  const model = page.locator("#models form").first();
  await model.locator("[name=name]").fill("Baseline E2E");
  await model.locator("[name=version]").fill("v1");
  await model.locator("[name=provider]").fill("Manual A");
  await model.getByRole("button", { name: "Register model" }).click();
  await expect(page.getByText("Baseline E2E").first()).toBeVisible();
  await model.locator("[name=name]").fill("Challenger E2E");
  await model.locator("[name=version]").fill("v2");
  await model.locator("[name=provider]").fill("Manual B");
  await model.getByRole("button", { name: "Register model" }).click();
  await expect(page.getByText("Challenger E2E").first()).toBeVisible();
  const suite = page.locator("#suites form").first();
  await suite.locator("[name=name]").fill("E2E suite");
  await suite.getByRole("button", { name: "Create suite" }).click();
  const testCase = page.locator("#suites form").nth(1);
  await testCase.locator("[name=suiteId]").selectOption({ label: "E2E suite" });
  await testCase
    .locator("[name=prompt]")
    .fill("A clear portrait of an adult in daylight");
  await testCase.getByRole("button", { name: "Add case" }).click();
  const comparison = page.locator("#comparisons form");
  await comparison.locator("[name=name]").fill("E2E comparison");
  await comparison
    .locator("[name=suiteId]")
    .selectOption({ label: "E2E suite" });
  await comparison
    .locator("[name=baselineId]")
    .selectOption({ label: "Baseline E2E v1" });
  await comparison
    .locator("[name=challengerId]")
    .selectOption({ label: "Challenger E2E v2" });
  await comparison.locator("[name=minPairs]").fill("1");
  await comparison.getByRole("button", { name: "Create comparison" }).click();
  const importer = page.locator("#imports form");
  for (const [name, provider] of [
    ["Baseline E2E v1", "Baseline E2E · Manual A"],
    ["Challenger E2E v2", "Challenger E2E · Manual B"],
  ]) {
    await importer.locator("[name=modelId]").selectOption({ label: name });
    await importer
      .locator("[name=providerId]")
      .selectOption({ label: provider });
    await importer
      .locator("[name=image]")
      .setInputFiles({
        name: "sample.png",
        mimeType: "image/png",
        buffer: png,
      });
    await importer.locator("[name=durationMs]").fill("1000");
    await importer.locator("[name=cost]").fill("0.1");
    await importer.getByRole("button", { name: "Import image" }).click();
    await expect(page.locator("#imports img")).toHaveCount(
      name.startsWith("Baseline") ? 1 : 2,
    );
  }
  await expect(
    page.getByRole("button", { name: "Submit blind rating" }),
  ).toBeVisible();
  await page.locator("#evaluation [name=leftQuality]").selectOption("4");
  await page.locator("#evaluation [name=rightQuality]").selectOption("3");
  await page.getByRole("button", { name: "Submit blind rating" }).click();
  await expect(page.getByText("1 blind ratings")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export Markdown" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("modelswap-report.md");
});
