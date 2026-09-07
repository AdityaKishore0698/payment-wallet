"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && token) router.replace("/dashboard");
  }, [token, loading, router]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-600 p-12 text-white lg:flex dark:bg-brand-700">
        <Logo className="text-white [&_span:last-child]:text-white" />
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold leading-tight">
            Payments that move as fast as you do.
          </h1>
          <p className="max-w-md text-brand-100">
            Send and receive money instantly with UPI-style IDs, track every
            transaction in real time, and keep your balance secure with
            bank-grade safeguards.
          </p>
          <ul className="space-y-2 text-sm text-brand-100">
            <li>• Instant peer-to-peer transfers</li>
            <li>• Deadlock-free, ACID-compliant ledger</li>
            <li>• Cursor-paginated transaction history</li>
          </ul>
        </div>
        <p className="text-xs text-brand-200">
          &copy; {new Date().getFullYear()} Digital Wallet. Demo application.
        </p>
      </div>

      <div className="relative flex items-center justify-center p-6 sm:p-12">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
