import { test, expect, type APIRequestContext } from "@playwright/test";
import { createUser, token, type TestUser } from "./helpers";

async function walletOf(request: APIRequestContext, user: TestUser, jwt: string) {
  const res = await request.get(`/api/wallets/user/${user.userId}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  expect(res.ok()).toBe(true);
  return res.json() as Promise<{ id: string; balance: string }>;
}

test.describe("concurrent money movement", () => {
  test("simultaneous transfers never spend more than the balance", async ({ request }) => {
    const sender = await createUser(request, { firstName: "Racer" });
    const receiver = await createUser(request, { firstName: "Payee" });
    const senderJwt = await token(request, sender);
    const receiverJwt = await token(request, receiver);
    const from = await walletOf(request, sender, senderJwt);
    const to = await walletOf(request, receiver, receiverJwt);

    // 10,000 starting balance covers exactly one of these.
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request.post("/api/transactions/transfer", {
          headers: { Authorization: `Bearer ${senderJwt}` },
          data: { from_wallet_id: from.id, to_wallet_id: to.id, amount: 6000 },
        }),
      ),
    );
    const statuses = results.map((r) => r.status()).sort();
    expect(statuses).toEqual([200, 400, 400, 400, 400]);

    const fromAfter = Number((await walletOf(request, sender, senderJwt)).balance);
    const toAfter = Number((await walletOf(request, receiver, receiverJwt)).balance);
    expect(fromAfter).toBe(4000);
    expect(toAfter).toBe(16000);
  });

  test("simultaneous top-ups are all credited", async ({ request }) => {
    const user = await createUser(request);
    const jwt = await token(request, user);
    const wallet = await walletOf(request, user, jwt);

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        request.post(`/api/transactions/add_funds/${wallet.id}`, {
          headers: { Authorization: `Bearer ${jwt}` },
          data: { amount: 100 },
        }),
      ),
    );
    results.forEach((r) => expect(r.ok()).toBe(true));
    expect(Number((await walletOf(request, user, jwt)).balance)).toBe(11000);
  });
});
