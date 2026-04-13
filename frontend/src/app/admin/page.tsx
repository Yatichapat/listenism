"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccessToken, me } from "@/services/api/auth";

export default function AdminDashboardPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      const token = getAccessToken();
      if (!token) {
        setAllowed(false);
        return;
      }
      try {
        const profile = await me(token);
        setAllowed(profile.role === "admin");
      } catch {
        setAllowed(false);
      }
    }
    void check();
  }, []);

  if (allowed === null) {
    return <main className="mx-auto max-w-5xl p-8 text-sm text-slate-500">Checking admin permission...</main>;
  }

  if (!allowed) {
    return <main className="mx-auto max-w-5xl p-8 text-sm text-rose-500">Admin access required.</main>;
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">Moderation review tools, user management visibility, and platform insights.</p>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Link href="/admin/reports/songs" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900/50">
          <h2 className="font-semibold">Reported Songs</h2>
          <p className="mt-1 text-sm text-slate-500">Review flagged songs and monitor moderation reports.</p>
        </Link>
        <Link href="/admin/reports/users" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900/50">
          <h2 className="font-semibold">Reported Users</h2>
          <p className="mt-1 text-sm text-slate-500">Review user behavior reports.</p>
        </Link>
        <Link href="/admin/users" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900/50">
          <h2 className="font-semibold">All Users</h2>
          <p className="mt-1 text-sm text-slate-500">See all registered users and account roles.</p>
        </Link>
        <Link href="/admin/analytics" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900/50">
          <h2 className="font-semibold">Platform Analytics</h2>
          <p className="mt-1 text-sm text-slate-500">View platform metrics and monitor system health.</p>
        </Link>
      </section>
    </main>
  );
}
