"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Alert, Button, Field, Input, Spinner } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; walletId: string; name: string }
  | { status: "error"; message: string };

export function TransferForm({
  onSuccess,
}: {
  /** Called after a successful transfer (e.g. to close a modal). */
  onSuccess?: (summary: string) => void;
}) {
  const { token, wallet, user, refreshWallet } = useAuth();
  const [contacts, setContacts] = useState<string[]>([]);
  const [upiId, setUpiId] = useState("");
  const [amount, setAmount] = useState("");
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!token || !wallet) return;
    api
      .contacts(token, wallet.id)
      .then(setContacts)
      .catch(() => setContacts([]));
  }, [token, wallet]);

  const runLookup = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!token || !trimmed) {
        setLookup({ status: "idle" });
        return;
      }
      if (user && trimmed === user.upi_id) {
        setLookup({
          status: "error",
          message: "You can't send money to yourself.",
        });
        return;
      }
      setLookup({ status: "loading" });
      api
        .lookupUpi(token, trimmed)
        .then((res) =>
          setLookup({
            status: "ok",
            walletId: res.wallet_id,
            name: res.masked_name,
          }),
        )
        .catch((err) =>
          setLookup({
            status: "error",
            message:
              err instanceof ApiError && err.status === 404
                ? "No account found for that UPI ID."
                : "Could not verify that UPI ID.",
          }),
        );
    },
    [token, user],
  );

  function onUpiChange(value: string) {
    setUpiId(value);
    setSuccess(null);
    setError(null);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => runLookup(value), 400);
  }

  function selectContact(c: string) {
    setUpiId(c);
    runLookup(c);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (lookup.status !== "ok") {
      setError("Enter a valid recipient UPI ID.");
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (wallet && value > Number(wallet.balance)) {
      setError("That's more than your available balance.");
      return;
    }
    if (!token || !wallet) return;

    setSubmitting(true);
    try {
      const txs = await api.transfer(token, {
        from_wallet_id: wallet.id,
        to_wallet_id: lookup.walletId,
        amount: value,
      });
      await refreshWallet();
      const ref = txs[0]?.reference_id ?? "";
      const summary =
        `Sent ${formatCurrency(value, wallet.currency)} to ${lookup.name}.` +
        (ref ? ` Ref: ${ref}` : "");
      setSuccess(summary);
      setAmount("");
      setUpiId("");
      setLookup({ status: "idle" });
      onSuccess?.(summary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Transfer failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {contacts.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Recent contacts
          </p>
          <div className="flex flex-wrap gap-2">
            {contacts.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => selectContact(c)}
                className="rounded-full border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-600 hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-brand-300"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <Field label="Recipient UPI ID" htmlFor="upi">
          <Input
            id="upi"
            value={upiId}
            onChange={(e) => onUpiChange(e.target.value)}
            placeholder="name123@wallet"
            className="font-mono"
            autoComplete="off"
          />
        </Field>

        {lookup.status === "loading" && (
          <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Spinner className="h-4 w-4" /> Verifying…
          </p>
        )}
        {lookup.status === "ok" && (
          <Alert variant="success">Verified: {lookup.name}</Alert>
        )}
        {lookup.status === "error" && (
          <Alert variant="error">{lookup.message}</Alert>
        )}

        <Field
          label="Amount"
          htmlFor="amount"
          hint={
            wallet
              ? `Available: ${formatCurrency(wallet.balance, wallet.currency)}`
              : undefined
          }
        >
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            min={1}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </Field>

        <Button
          type="submit"
          loading={submitting}
          disabled={lookup.status !== "ok"}
          className="w-full"
        >
          Send money
        </Button>
      </form>
    </div>
  );
}
