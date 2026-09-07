"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Alert, Button, Card, CardBody, Field, Input } from "@/components/ui";

export default function SettingsPage() {
  const { token, user, logout } = useAuth();
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const [confirmEmail, setConfirmEmail] = useState("");
  const [delError, setDelError] = useState<string | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);
    if (!token) return;
    setPwLoading(true);
    try {
      await api.changePassword(token, oldPassword, newPassword);
      setPwSuccess("Password updated.");
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      setPwError(
        err instanceof ApiError ? err.message : "Could not update password.",
      );
    } finally {
      setPwLoading(false);
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDelError(null);
    if (!token || !user) return;
    if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      setDelError("The email you typed doesn't match your account.");
      return;
    }
    setDelLoading(true);
    try {
      await api.deleteAccount(token);
      logout();
      router.replace("/login");
    } catch (err) {
      setDelError(
        err instanceof ApiError ? err.message : "Could not delete account.",
      );
      setDelLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your account security.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Change password
          </h2>
          {pwError && <Alert variant="error">{pwError}</Alert>}
          {pwSuccess && <Alert variant="success">{pwSuccess}</Alert>}
          <form onSubmit={changePassword} className="space-y-4">
            <Field label="Current password" htmlFor="old_password">
              <Input
                id="old_password"
                type="password"
                autoComplete="current-password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </Field>
            <Field label="New password" htmlFor="new_password">
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>
            <Button type="submit" loading={pwLoading}>
              Update password
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card className="border-rose-200 dark:border-rose-900">
        <CardBody className="space-y-4">
          <h2 className="text-lg font-semibold text-rose-700 dark:text-rose-400">
            Danger zone
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Deleting your account is permanent. Your wallet and all transaction
            records will be removed.
          </p>
          {delError && <Alert variant="error">{delError}</Alert>}
          <form onSubmit={deleteAccount} className="space-y-4">
            <Field
              label="Type your email to confirm"
              htmlFor="confirm_email"
              hint={user ? user.email : undefined}
            >
              <Input
                id="confirm_email"
                type="email"
                autoComplete="off"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
              />
            </Field>
            <Button type="submit" variant="danger" loading={delLoading}>
              Permanently delete my account
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
