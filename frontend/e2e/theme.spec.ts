import { test, expect } from "@playwright/test";
import { createUser, loginViaUi } from "./helpers";

test.describe("dark mode", () => {
  test("toggles, persists across reloads, and applies before paint", async ({
    page,
    request,
  }) => {
    const user = await createUser(request);
    await loginViaUi(page, user);

    const html = page.locator("html");
    await expect(html).not.toHaveClass(/dark/);

    // Switch to dark.
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(html).toHaveClass(/dark/);
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      "rgb(2, 6, 23)", // slate-950
    );

    // Persists across a full reload (and the inline script applies it with no
    // flash — the class is present on the very first assertion after reload).
    await page.reload();
    await expect(html).toHaveClass(/dark/);

    // And back to light.
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(html).not.toHaveClass(/dark/);
    await page.reload();
    await expect(html).not.toHaveClass(/dark/);
  });

  test("respects a stored preference on the login page", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.goto("/register");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
