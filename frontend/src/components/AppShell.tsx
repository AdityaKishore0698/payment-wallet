"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, wallet, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const nav = (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <div className="flex h-full flex-col gap-6 p-5">
      <div className="flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </div>
      <div className="rounded-2xl bg-brand-600 p-4 text-white dark:bg-brand-700">
        <p className="text-xs font-medium text-brand-100">Available balance</p>
        <p className="mt-1 text-2xl font-semibold">
          {wallet ? formatCurrency(wallet.balance, wallet.currency) : "—"}
        </p>
        {user && (
          <p className="mt-2 truncate font-mono text-xs text-brand-100">
            {user.upi_id}
          </p>
        )}
      </div>
      {nav}
      <div className="mt-auto space-y-3">
        {user && (
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-800/60">
            <p className="font-medium text-slate-800 dark:text-slate-100">
              {user.first_name} {user.last_name ?? ""}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {user.email}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">
        {sidebarInner}
      </aside>

      {/* Mobile header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden dark:border-slate-800 dark:bg-slate-900">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle navigation"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl dark:bg-slate-900">
            {sidebarInner}
          </div>
        </div>
      )}

      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
