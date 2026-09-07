"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError, type Transaction } from "@/lib/api";
import { Alert, Badge, Button, Card, CardBody, Spinner } from "@/components/ui";
import { counterpartyLabel, formatCurrency, formatDateTime } from "@/lib/format";

const PAGE_SIZE = 15;

export default function HistoryPage() {
  const { token, wallet } = useAuth();
  const [rows, setRows] = useState<Transaction[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against the IntersectionObserver firing multiple loads at once.
  const fetchingRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (nextCursor: string | null) => {
      if (!token || !wallet || fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const res = await api.history(token, wallet.id, nextCursor, PAGE_SIZE);
        setRows((prev) => (nextCursor ? [...prev, ...res.data] : res.data));
        setCursor(res.next_cursor);
        cursorRef.current = res.next_cursor;
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load history.",
        );
      } finally {
        fetchingRef.current = false;
      }
    },
    [token, wallet],
  );

  useEffect(() => {
    if (!token || !wallet) return;
    setInitialLoading(true);
    load(null).finally(() => setInitialLoading(false));
  }, [token, wallet, load]);

  const loadMore = useCallback(async () => {
    if (!cursorRef.current || fetchingRef.current) return;
    setLoadingMore(true);
    await load(cursorRef.current);
    setLoadingMore(false);
  }, [load]);

  // Infinite scroll: fetch the next page when the sentinel scrolls into view.
  // Re-runs when `cursor` changes so the observer re-attaches after the
  // sentinel (which only renders while there's a next page) mounts.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, cursor]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Transaction history
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cursor-paginated ledger, newest first.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardBody className="p-0 sm:p-0">
          {initialLoading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-7 w-7 text-brand-600 dark:text-brand-400" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              No transactions found.
            </p>
          ) : (
            <>
              <div className="hidden grid-cols-[1fr_auto_auto] gap-4 border-b border-slate-100 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid dark:border-slate-800 dark:text-slate-500">
                <span>Counterparty</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Status</span>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((tx) => {
                  const label = counterpartyLabel(tx.counterparty_name);
                  const muted = label === "Deleted User" || label === "System";
                  return (
                    <li
                      key={tx.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-6 py-4 sm:grid-cols-[1fr_auto_auto]"
                    >
                      <div className="min-w-0">
                        <p
                          className={
                            "truncate text-sm font-medium " +
                            (muted
                              ? "italic text-slate-400 dark:text-slate-500"
                              : "text-slate-800 dark:text-slate-200")
                          }
                        >
                          {label}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          <span
                            className={
                              "font-semibold " +
                              (tx.type === "CREDIT"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-600 dark:text-slate-300")
                            }
                          >
                            {tx.type}
                          </span>
                          {" · "}
                          {formatDateTime(tx.created_at)}
                        </p>
                      </div>
                      <p
                        className={
                          "text-right text-sm font-semibold " +
                          (tx.type === "CREDIT"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-800 dark:text-slate-200")
                        }
                      >
                        {tx.type === "CREDIT" ? "+" : "−"}
                        {formatCurrency(tx.amount, wallet?.currency)}
                      </p>
                      <div className="col-start-2 row-start-2 flex justify-end sm:col-start-3 sm:row-start-1">
                        <Badge
                          tone={
                            tx.status === "SUCCESS"
                              ? "green"
                              : tx.status === "FAILED"
                                ? "red"
                                : "slate"
                          }
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Infinite-scroll sentinel + manual fallback */}
              {cursor && (
                <div
                  ref={sentinelRef}
                  className="flex items-center justify-center border-t border-slate-100 p-4 dark:border-slate-800"
                >
                  {loadingMore ? (
                    <Spinner className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={loadMore}
                      className="w-full"
                    >
                      Load more
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
