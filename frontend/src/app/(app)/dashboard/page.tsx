"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type Transaction } from "@/lib/api";
import { Card, CardBody, Badge, Spinner } from "@/components/ui";
import { TransferModal } from "@/components/TransferModal";
import { counterpartyLabel, formatCurrency, formatDateTime } from "@/lib/format";

export default function DashboardPage() {
  const { user, wallet, token, refreshWallet } = useAuth();
  const [recent, setRecent] = useState<Transaction[] | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const loadRecent = useCallback(() => {
    if (!token || !wallet) return;
    api
      .history(token, wallet.id, null, 6)
      .then((res) => setRecent(res.data))
      .catch(() => setRecent([]));
  }, [token, wallet]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Welcome back{user ? `, ${user.first_name}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Here&apos;s a snapshot of your wallet.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-2 border-transparent bg-gradient-to-br from-brand-600 to-brand-500 text-white dark:border-transparent dark:from-brand-700 dark:to-brand-600">
          <CardBody>
            <p className="text-sm text-brand-100">Available balance</p>
            <p className="mt-2 text-4xl font-semibold">
              {wallet ? (
                formatCurrency(wallet.balance, wallet.currency)
              ) : (
                <Spinner className="h-7 w-7" />
              )}
            </p>
            {user && (
              <p className="mt-4 font-mono text-sm text-brand-100">
                {user.upi_id}
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex h-full flex-col justify-center gap-3">
            <Link
              href="/add-funds"
              className="rounded-xl bg-brand-50 px-4 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-950/60 dark:text-brand-300 dark:hover:bg-brand-950"
            >
              + Add funds
            </Link>
            <button
              onClick={() => setTransferOpen(true)}
              className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              → Send money
            </button>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Recent activity
            </h2>
            <Link
              href="/history"
              className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              View all
            </Link>
          </div>

          {recent === null ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            </div>
          ) : recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No transactions yet. Add funds to get started.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recent.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {counterpartyLabel(tx.counterparty_name)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDateTime(tx.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        tx.type === "CREDIT"
                          ? "text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                          : "text-sm font-semibold text-slate-800 dark:text-slate-200"
                      }
                    >
                      {tx.type === "CREDIT" ? "+" : "−"}
                      {formatCurrency(tx.amount, wallet?.currency)}
                    </p>
                    <Badge tone={tx.type === "CREDIT" ? "green" : "slate"}>
                      {tx.type}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onDone={() => {
          refreshWallet();
          loadRecent();
        }}
      />
    </div>
  );
}
