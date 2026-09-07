"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Alert, Button, Card, CardBody, Field, Input } from "@/components/ui";

export default function RegisterPage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [upiId, setUpiId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await api.register({
        first_name: form.first_name,
        last_name: form.last_name || undefined,
        email: form.email,
        password: form.password,
      });
      setUpiId(user.upi_id);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Registration failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (upiId) {
    return (
      <Card>
        <CardBody className="space-y-5">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            You&apos;re all set 🎉
          </h2>
          <Alert variant="success">
            Account created. Your UPI ID is{" "}
            <span className="font-mono font-semibold">{upiId}</span>. Your wallet
            has been provisioned with a demo balance of ₹10,000.
          </Alert>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Continue to sign in
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Create your account
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            It takes less than a minute.
          </p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" htmlFor="first_name">
              <Input
                id="first_name"
                required
                value={form.first_name}
                onChange={update("first_name")}
              />
            </Field>
            <Field label="Last name" htmlFor="last_name">
              <Input
                id="last_name"
                value={form.last_name}
                onChange={update("last_name")}
              />
            </Field>
          </div>
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={update("email")}
            />
          </Field>
          <Field
            label="Password"
            htmlFor="password"
            hint="Use at least 8 characters."
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={update("password")}
            />
          </Field>
          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
