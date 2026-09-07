"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Alert, Button, Card, CardBody, Field, Input } from "@/components/ui";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [demoToken, setDemoToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function sendToken(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSending(true);
    try {
      const res = await api.recover(email);
      setMessage(res.message);
      if (res.demo_token) {
        setDemoToken(res.demo_token);
        setToken(res.demo_token);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send token.");
    } finally {
      setSending(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResetting(true);
    try {
      await api.resetPassword(token, newPassword);
      router.replace("/login");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not reset password. The token may be invalid or expired.",
      );
      setResetting(false);
    }
  }

  return (
    <Card>
      <CardBody className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Reset your password
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            We&apos;ll send a recovery token to your email.
          </p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}
        {message && <Alert variant="info">{message}</Alert>}
        {demoToken && (
          <Alert variant="info">
            Demo mode &mdash; your recovery token is{" "}
            <span className="font-mono font-semibold break-all">{demoToken}</span>
          </Alert>
        )}

        <form onSubmit={sendToken} className="space-y-4">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button
            type="submit"
            variant="secondary"
            loading={sending}
            className="w-full"
          >
            Send recovery token
          </Button>
        </form>

        <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
          <form onSubmit={resetPassword} className="space-y-4">
            <Field label="Recovery token" htmlFor="token">
              <Input
                id="token"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste the token from your email"
              />
            </Field>
            <Field label="New password" htmlFor="new_password">
              <Input
                id="new_password"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>
            <Button type="submit" loading={resetting} className="w-full">
              Set new password
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          <Link
            href="/login"
            className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Back to sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
