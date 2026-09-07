import { test, expect } from "@playwright/test";
import { createUser, loginViaUi } from "./helpers";

test.describe("authentication", () => {
  test("unauthenticated users are redirected to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
  });

  test("a visitor can register and receives a UPI ID", async ({ page }) => {
    const email = `e2e_reg_${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByLabel("First name").fill("Ada");
    await page.getByLabel("Last name").fill("Lovelace");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText(/Your UPI ID is/)).toBeVisible();
    await expect(page.getByText(/@wallet/)).toBeVisible();
  });

  test("a registered user can log in and see their balance", async ({
    page,
    request,
  }) => {
    const user = await createUser(request, { firstName: "Grace" });

    await loginViaUi(page, user);

    await expect(
      page.getByRole("heading", { name: /Welcome back, Grace/ }),
    ).toBeVisible();
    // New wallets are provisioned with a demo balance of 10,000.
    await expect(page.getByText(/10,000/).first()).toBeVisible();
    await expect(page.getByText(user.upiId).first()).toBeVisible();
  });

  test("bad credentials show an error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/incorrect email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a user can log out", async ({ page, request }) => {
    const user = await createUser(request);
    await loginViaUi(page, user);

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Session is gone: dashboard bounces back to login.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });
});
