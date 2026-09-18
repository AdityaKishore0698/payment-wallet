"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Alert, Button, Card, CardBody, Field, Input, Spinner } from "@/components/ui";
import { GoogleSignInButton, GOOGLE_SIGN_IN_ENABLED } from "@/components/GoogleSignInButton";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setLoading(false);
    }
  }

  async function onGoogleCredential(idToken: string) {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle(idToken);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google sign-in failed.");
      setGoogleLoading(false);
    }
  }

  return (
    <Card>
      <CardBody className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Welcome back
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sign in to access your wallet.
          </p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {GOOGLE_SIGN_IN_ENABLED && (
          <>
            {googleLoading ? (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-500 dark:text-slate-400">
                <Spinner className="h-4 w-4" /> Signing in with Google…
              </div>
            ) : (
              <GoogleSignInButton onCredential={onGoogleCredential} />
            )}

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                or
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
          </>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Forgot password?
          </Link>
          <Link
            href="/register"
            className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Create an account
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
