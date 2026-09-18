import { test, expect } from "@playwright/test";
import { addFunds, createUser, loginViaUi } from "./helpers";

test.describe("collapsible sidebar", () => {
  test("collapses via the hamburger toggle and the preference persists across reload", async ({
    page,
    request,
  }) => {
    const user = await createUser(request);
    await loginViaUi(page, user);

    const sidebar = page.locator("aside");
    await expect(sidebar.getByText("Available balance")).toBeVisible();
    await expect(page.getByRole("button", { name: "Collapse sidebar" })).toBeVisible();

    await page.getByRole("button", { name: "Collapse sidebar" }).click();

    // Collapsed: the detailed balance card and nav labels are gone, but the
    // nav links and logout are still reachable (icon-only, named via title).
    await expect(sidebar.getByText("Available balance")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Transfer" })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Log out" })).toBeVisible();

    // Persists across a full reload.
    await page.reload();
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    await expect(sidebar.getByText("Available balance")).toHaveCount(0);

    // Expand again.
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await expect(sidebar.getByText("Available balance")).toBeVisible();
  });
});

test.describe("dashboard analytics", () => {
  test("shows a balance area chart and a grouped spending bar chart", async ({
    page,
    request,
  }) => {
    const user = await createUser(request);
    await addFunds(request, user, 500);
    await loginViaUi(page, user);

    await expect(page.getByRole("heading", { name: "Balance over time" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Spending history" })).toBeVisible();

    // The area chart actually drew a filled area (balance line), and the bar
    // chart actually drew bars — not just empty chart frames.
    await expect(page.locator("path.recharts-area-area")).toHaveCount(1);
    await expect(page.locator(".recharts-bar-rectangle").first()).toBeVisible();
    // The bar chart's legend confirms it's the grouped in/out chart, not a
    // second copy of the line chart.
    await expect(page.getByText("Money in", { exact: true })).toBeVisible();
    await expect(page.getByText("Money out", { exact: true })).toBeVisible();
  });
});

test.describe("Google sign-in (not configured in this environment)", () => {
  test("the login and register pages don't show a broken Google button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Continue with Google")).toHaveCount(0);
    // No dangling "or" divider floating above the form with nothing above it.
    await expect(page.getByText("or", { exact: true })).toHaveCount(0);

    await page.goto("/register");
    await expect(page.getByText("Continue with Google")).toHaveCount(0);
    await expect(page.getByText("or", { exact: true })).toHaveCount(0);
  });
});
