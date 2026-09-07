import { type APIRequestContext, type Page, expect } from "@playwright/test";

export type TestUser = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  upiId: string;
  userId: string;
};

let counter = 0;

function uniqueSuffix(): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now().toString(36)}${counter}${rand}`;
}

/** Create a user directly via the API so UI tests can focus on one flow. */
export async function createUser(
  request: APIRequestContext,
  overrides: Partial<Pick<TestUser, "firstName" | "password">> = {},
): Promise<TestUser> {
  const password = overrides.password ?? "password123";

  // The backend derives the UPI ID from first_name + a random 3-digit number
  // (only 900 values), so parallel workers can collide on the upi_id unique
  // constraint — which the API reports as a 400. Retry a few times with a
  // fresh suffix.
  let body: { id: string; upi_id: string } | null = null;
  let firstName = "";
  let lastAttempt = "";
  for (let attempt = 0; attempt < 4 && !body; attempt++) {
    const suffix = uniqueSuffix();
    firstName = overrides.firstName
      ? `${overrides.firstName}${suffix.slice(-4)}`
      : `User${suffix.slice(-5)}`;
    const email = `e2e_${suffix}@example.com`;
    const res = await request.post("/api/users/", {
      data: { first_name: firstName, last_name: "User", email, password },
    });
    if (res.ok()) {
      body = await res.json();
      return {
        firstName,
        lastName: "User",
        email,
        password,
        upiId: body!.upi_id,
        userId: body!.id,
      };
    }
    lastAttempt = `${res.status()} ${await res.text()}`;
  }
  throw new Error(`register failed after retries: ${lastAttempt}`);
}

export async function token(
  request: APIRequestContext,
  user: TestUser,
): Promise<string> {
  const res = await request.post("/api/auth/login", {
    form: { username: user.email, password: user.password },
  });
  expect(res.ok()).toBe(true);
  return (await res.json()).access_token;
}

export async function addFunds(
  request: APIRequestContext,
  user: TestUser,
  amount: number,
): Promise<void> {
  const jwt = await token(request, user);
  const walletRes = await request.get(`/api/wallets/user/${user.userId}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  expect(walletRes.ok()).toBe(true);
  const walletId = (await walletRes.json()).id;

  const res = await request.post(`/api/transactions/add_funds/${walletId}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    data: { amount },
  });
  expect(res.ok(), `add_funds failed: ${await res.text()}`).toBe(true);
}

/** Rapidly create `count` CREDIT transactions for a user (one login, reused). */
export async function seedTransactions(
  request: APIRequestContext,
  user: TestUser,
  count: number,
  amount = 10,
): Promise<void> {
  const jwt = await token(request, user);
  const walletRes = await request.get(`/api/wallets/user/${user.userId}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const walletId = (await walletRes.json()).id;
  for (let i = 0; i < count; i++) {
    const res = await request.post(
      `/api/transactions/add_funds/${walletId}`,
      { headers: { Authorization: `Bearer ${jwt}` }, data: { amount } },
    );
    expect(res.ok(), `seed add_funds failed: ${await res.text()}`).toBe(true);
  }
}

/** Log in through the UI and wait for the dashboard. */
export async function loginViaUi(page: Page, user: TestUser): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
