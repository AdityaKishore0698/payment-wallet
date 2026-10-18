import { test, expect, type APIRequestContext } from "@playwright/test";
import { createUser } from "./helpers";

// Mailpit catches outgoing mail in the Docker stack (see docker-compose.yml).
const MAILPIT_URL = process.env.MAILPIT_URL || "http://localhost:8025";

async function recoveryTokenFor(
  request: APIRequestContext,
  email: string,
): Promise<string> {
  let messageId: string | undefined;
  await expect
    .poll(
      async () => {
        const res = await request.get(`${MAILPIT_URL}/api/v1/search`, {
          params: { query: `to:"${email}"` },
        });
        const body = await res.json();
        messageId = body.messages?.[0]?.ID;
        return messageId;
      },
      { timeout: 20_000, message: `no recovery email reached Mailpit for ${email}` },
    )
    .toBeTruthy();

  const res = await request.get(`${MAILPIT_URL}/api/v1/message/${messageId}`);
  const text: string = (await res.json()).Text;
  const match = text.match(/recovery token is: ([0-9a-f-]{36})/i);
  expect(match, "recovery token not found in email body").not.toBeNull();
  return match![1];
}

test.describe("password reset by email", () => {
  test("the token arrives by email, not on screen, and resets the password", async ({
    page,
    request,
  }) => {
    const user = await createUser(request);

    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(user.email);
    await page.getByRole("button", { name: "Send recovery token" }).click();
    await expect(page.getByText(/If that email is registered/)).toBeVisible();

    const token = await recoveryTokenFor(request, user.email);
    // The token must only travel by email.
    await expect(page.getByText(token)).toHaveCount(0);

    await page.getByLabel("Recovery token").fill(token);
    await page.getByLabel("New password").fill("brand-new-pass-9");
    await page.getByRole("button", { name: "Set new password" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill("brand-new-pass-9");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("known and unknown emails get the same response", async ({ request }) => {
    const user = await createUser(request);
    const known = await request.post("/api/auth/recover", {
      data: { email: user.email },
    });
    const unknown = await request.post("/api/auth/recover", {
      data: { email: `nobody_${Date.now()}@example.com` },
    });
    expect(known.status()).toBe(200);
    expect(unknown.status()).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
  });
});
