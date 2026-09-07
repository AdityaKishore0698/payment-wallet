// Thin client for the FastAPI backend.
//
// `NEXT_PUBLIC_API_URL` selects the backend:
//   - unset (local): "/api" — Nginx routes it to the API container, and
//     next.config.mjs rewrites it during `npm run dev`.
//   - hosted (Vercel): the absolute Render URL with NO path, e.g.
//     "https://wallet-api.onrender.com" (FastAPI serves routes at the root:
//     /auth/login, /users/, ...). Must be set at build time and redeployed.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "/api";

// A relative API base only works when something (Nginx locally, the dev proxy)
// forwards /api to the backend. On a hosted frontend with no such proxy it
// means NEXT_PUBLIC_API_URL was never set — surface that early.
const MISCONFIGURED =
  API_BASE === "/api" &&
  typeof window !== "undefined" &&
  !["localhost", "127.0.0.1"].includes(window.location.hostname);

if (MISCONFIGURED) {
  console.warn(
    "[api] NEXT_PUBLIC_API_URL is not set — API calls resolve to this site's " +
      "/api path, which only works behind a proxy. For a Vercel deployment set " +
      "NEXT_PUBLIC_API_URL to the backend URL (e.g. https://wallet-api.onrender.com) " +
      "and redeploy.",
  );
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  json?: unknown;
  form?: Record<string, string>;
  token?: string | null;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", json, form, token } = opts;
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;

  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(form).toString();
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body });
  } catch {
    throw new ApiError(0, "Unable to reach the server. Please try again.");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();

  // An HTML body means the request never reached the API — it hit the frontend
  // origin (or a proxy error page) instead. Almost always a missing/wrong
  // NEXT_PUBLIC_API_URL on the deployed frontend.
  const looksLikeHtml =
    (res.headers.get("content-type") || "").includes("text/html") ||
    text.trimStart().startsWith("<");
  if (looksLikeHtml) {
    throw new ApiError(
      res.status,
      MISCONFIGURED
        ? "Can't reach the API: NEXT_PUBLIC_API_URL is not configured. Set it to the backend URL and redeploy."
        : "Can't reach the API (got an HTML response). Check that the backend is running and reachable.",
    );
  }

  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const detail =
      (payload && typeof payload === "object" && "detail" in payload
        ? (payload as { detail: unknown }).detail
        : payload) ?? res.statusText;
    const message = Array.isArray(detail)
      ? detail.map((d) => (d as { msg?: string }).msg ?? String(d)).join(", ")
      : String(detail);
    throw new ApiError(res.status, message || "Request failed");
  }

  return payload as T;
}

// ---- Types ------------------------------------------------------------------

export type TokenResponse = { access_token: string; token_type: string };

export type User = {
  id: string;
  email: string;
  upi_id: string;
  first_name: string;
  last_name: string | null;
  wallet_id: string | null;
  created_at: string;
};

export type Wallet = {
  id: string;
  name: string;
  user_id: string;
  balance: string | number;
  currency: string;
  created_at: string;
};

export type WalletLookup = { wallet_id: string; masked_name: string };

export type Transaction = {
  id: string;
  wallet_id: string;
  amount: string | number;
  type: "DEBIT" | "CREDIT";
  reference_id: string | null;
  counterparty_name: string | null;
  status: string;
  created_at: string;
};

export type PaginatedTransactions = {
  data: Transaction[];
  next_cursor: string | null;
};

// ---- Endpoints ------------------------------------------------------------------

export const api = {
  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      form: { username: email, password },
    }),

  register: (input: {
    first_name: string;
    last_name?: string;
    email: string;
    password: string;
  }) => request<User>("/users/", { method: "POST", json: input }),

  recover: (email: string) =>
    request<{ message: string; demo_token?: string }>("/auth/recover", {
      method: "POST",
      json: { email },
    }),

  resetPassword: (token: string, new_password: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      json: { token, new_password },
    }),

  changePassword: (token: string, old_password: string, new_password: string) =>
    request<{ message: string }>("/auth/change-password", {
      method: "POST",
      json: { old_password, new_password },
      token,
    }),

  getUser: (userId: string) => request<User>(`/users/${userId}`),

  deleteAccount: (token: string) =>
    request<{ message: string }>("/users/me", { method: "DELETE", token }),

  getWallet: (token: string, userId: string) =>
    request<Wallet>(`/wallets/user/${userId}`, { token }),

  lookupUpi: (token: string, upiId: string) =>
    request<WalletLookup>(`/wallets/lookup/${encodeURIComponent(upiId)}`, {
      token,
    }),

  addFunds: (token: string, walletId: string, amount: number) =>
    request<Transaction>(`/transactions/add_funds/${walletId}`, {
      method: "POST",
      json: { amount },
      token,
    }),

  transfer: (
    token: string,
    input: { from_wallet_id: string; to_wallet_id: string; amount: number },
  ) =>
    request<Transaction[]>("/transactions/transfer", {
      method: "POST",
      json: input,
      token,
    }),

  history: (token: string, walletId: string, cursor?: string | null, limit = 15) =>
    request<PaginatedTransactions>(
      `/transactions/${walletId}/history?limit=${limit}` +
        (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""),
      { token },
    ),

  contacts: (token: string, walletId: string) =>
    request<string[]>(`/transactions/${walletId}/contacts`, { token }),
};
