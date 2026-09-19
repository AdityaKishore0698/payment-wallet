"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { href: "/add-funds", label: "Add funds", icon: "M12 5v14M5 12h14" },
  {
    href: "/transfer",
    label: "Transfer",
    icon: "M4 12h16M14 6l6 6-6 6",
  },
  {
    href: "/history",
    label: "History",
    icon: "M12 8v4l3 2M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "M10.3 3.2a1 1 0 0 1 3.4 0l.2.9a7 7 0 0 1 2 1.1l.9-.3a1 1 0 0 1 1.2 1.7l-.6.7a7 7 0 0 1 0 2.3l.6.7a1 1 0 0 1-1.2 1.7l-.9-.3a7 7 0 0 1-2 1.1l-.2.9a1 1 0 0 1-3.4 0l-.2-.9a7 7 0 0 1-2-1.1l-.9.3A1 1 0 0 1 4.5 15l.6-.7a7 7 0 0 1 0-2.3L4.5 9a1 1 0 0 1 1.2-1.7l.9.3a7 7 0 0 1 2-1.1l.2-.9Z",
  },
];

const SIDEBAR_KEY = "wallet_sidebar_collapsed";

const LogoMark = () => (
  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 15.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M16 12h2M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  </span>
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, wallet, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Read the saved preference after mount only, so server-rendered markup
  // (always "expanded") matches the client's first render and React doesn't
  // complain about a hydration mismatch.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      // localStorage unavailable (private browsing, etc.) — default is fine.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  function buildNav(isCollapsed: boolean, onNavigate?: () => void) {
    return (
      <nav className="space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isCollapsed && "justify-center px-2",
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
              )}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={item.icon} />
              </svg>
              {!isCollapsed && item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  function buildSidebar(
    isCollapsed: boolean,
    opts: { onNavigate?: () => void; showCollapseToggle?: boolean; hideHeader?: boolean } = {},
  ) {
    return (
      <div className={cn("flex h-full flex-col gap-6", isCollapsed ? "p-3" : "p-5")}>
        <div className={cn("flex items-center", isCollapsed ? "flex-col gap-3" : "justify-between gap-2", opts.hideHeader && "hidden")}>
          {isCollapsed ? <LogoMark /> : <Logo />}
          <div className={cn("flex items-center gap-1", isCollapsed && "flex-col")}>
            <ThemeToggle />
            {opts.showCollapseToggle && (
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {isCollapsed ? (
          <div
            title={wallet ? `Available balance: ${formatCurrency(wallet.balance, wallet.currency)}` : undefined}
            className="flex justify-center rounded-2xl bg-brand-600 p-3 text-white dark:bg-brand-700"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h12A1.5 1.5 0 0 1 18 6.5v3h1.5A1.5 1.5 0 0 1 21 11v7a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6.5Z" />
              <path d="M16 14.5h.01" />
            </svg>
          </div>
        ) : (
          <div className="rounded-2xl bg-brand-600 p-4 text-white dark:bg-brand-700">
            <p className="text-xs font-medium text-brand-100">Available balance</p>
            <p className="mt-1 text-2xl font-semibold">
              {wallet ? formatCurrency(wallet.balance, wallet.currency) : "—"}
            </p>
            {user && (
              <p className="mt-2 truncate font-mono text-xs text-brand-100">{user.upi_id}</p>
            )}
          </div>
        )}

        {buildNav(isCollapsed, opts.onNavigate)}

        <div className="mt-auto space-y-3">
          {!isCollapsed && user && (
            <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-800/60">
              <p className="font-medium text-slate-800 dark:text-slate-100">
                {user.first_name} {user.last_name ?? ""}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Log out" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
              isCollapsed && "justify-center px-2",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {!isCollapsed && "Log out"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen lg:grid transition-[grid-template-columns] duration-200",
        collapsed ? "lg:grid-cols-[84px_1fr]" : "lg:grid-cols-[280px_1fr]",
      )}
    >
      {/* Desktop sidebar — collapsible via the hamburger toggle at its top */}
      <aside className="hidden border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:block lg:h-screen lg:self-start lg:overflow-y-auto dark:border-slate-800 dark:bg-slate-900">
        {buildSidebar(collapsed, { showCollapseToggle: true })}
      </aside>

      {/* Mobile header — fixed 64px (h-16) so the drawer below can start at top-16 and leave the toggle visible */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden dark:border-slate-800 dark:bg-slate-900">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
          >
            <span className="relative block h-6 w-6" aria-hidden="true">
              <span
                className={cn(
                  "absolute left-0.5 right-0.5 h-0.5 rounded-full bg-current transition-all duration-300 motion-reduce:transition-none",
                  mobileOpen ? "top-[11px] rotate-45" : "top-[5px]",
                )}
              />
              <span
                className={cn(
                  "absolute left-0.5 right-0.5 top-[11px] h-0.5 rounded-full bg-current transition-opacity duration-200 motion-reduce:transition-none",
                  mobileOpen ? "opacity-0" : "opacity-100",
                )}
              />
              <span
                className={cn(
                  "absolute left-0.5 right-0.5 h-0.5 rounded-full bg-current transition-all duration-300 motion-reduce:transition-none",
                  mobileOpen ? "top-[11px] -rotate-45" : "top-[17px]",
                )}
              />
            </span>
          </button>
        </div>
      </header>

      {/* Mobile drawer — always mounted so it can slide out as well as in; `invisible` (delayed by the transition) keeps it out of the tab order when closed */}
      <div
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-x-0 bottom-0 top-16 z-20 transition-[visibility] duration-300 lg:hidden",
          mobileOpen ? "visible" : "invisible",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-slate-900/40 transition-opacity duration-300 motion-reduce:transition-none",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white shadow-xl transition-transform duration-300 ease-out motion-reduce:transition-none dark:bg-slate-900",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {buildSidebar(false, { onNavigate: () => setMobileOpen(false), hideHeader: true })}
        </div>
      </div>

      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
