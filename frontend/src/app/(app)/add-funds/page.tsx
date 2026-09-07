"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Alert, Button, Card, CardBody, Field, Input } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

const QUICK = [500, 1000, 2000, 5000];
const MAX = 50000;

export default function AddFundsPage() {
  const { wallet, refreshWallet } = useAuth();
  const { token } = useAuth();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (value > MAX) {
      setError(`You can add at most ${formatCurrency(MAX)} at a time.`);
      return;
    }
    if (!token || !wallet) return;

    setLoading(true);
    try {
      await api.addFunds(token, wallet.id, value);
      await refreshWallet();
      setSuccess(`Added ${formatCurrency(value, wallet.currency)} to your wallet.`);
      setAmount("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add funds.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Add funds
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Top up your wallet from your linked bank account.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-5">
          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <form onSubmit={onSubmit} className="space-y-5">
            <Field
              label="Amount"
              htmlFor="amount"
              hint={`Maximum ${formatCurrency(MAX)} per top-up.`}
            >
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </Field>

            <div className="flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-brand-300"
                >
                  {formatCurrency(q)}
                </button>
              ))}
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Add money
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
