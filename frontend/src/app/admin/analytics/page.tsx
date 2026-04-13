"use client";

import { useEffect, useState } from "react";
import { getAccessToken, me } from "@/services/api/auth";
import { getSystemHealth, listAllUsers, listReportedSongs, listReportedUsers } from "@/services/api/admin";

type AnalyticsSnapshot = {
  totalUsers: number;
  totalAdmins: number;
  totalArtists: number;
  totalListeners: number;
  reportedSongs: number;
  reportedUsers: number;
  systemStatus: string;
  environment: string;
};

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);

  useEffect(() => {
    async function loadData() {
      const token = getAccessToken();
      if (!token) {
        setError("Please login as admin.");
        setLoading(false);
        return;
      }

      try {
        const profile = await me(token);
        if (profile.role !== "admin") {
          setError("Admin access required.");
          setLoading(false);
          return;
        }

        const [users, songReports, userReports, health] = await Promise.all([
          listAllUsers(token),
          listReportedSongs(token),
          listReportedUsers(token),
          getSystemHealth(token),
        ]);

        const admins = users.filter((user) => user.role === "admin").length;
        const artists = users.filter((user) => user.role === "artist").length;
        const listeners = users.filter((user) => user.role === "listener").length;

        setSnapshot({
          totalUsers: users.length,
          totalAdmins: admins,
          totalArtists: artists,
          totalListeners: listeners,
          reportedSongs: songReports.length,
          reportedUsers: userReports.length,
          systemStatus: health.status,
          environment: health.env,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  if (loading) {
    return <main className="mx-auto max-w-6xl p-8 text-sm text-slate-500">Loading platform analytics...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">Platform Analytics</h1>
      <p className="mt-2 text-sm text-slate-500">Overview metrics and system health for administrators.</p>
      {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}

      {snapshot && (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Users</p>
            <p className="mt-2 text-2xl font-bold">{snapshot.totalUsers}</p>
          </article>
          <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Artists</p>
            <p className="mt-2 text-2xl font-bold">{snapshot.totalArtists}</p>
          </article>
          <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Listeners</p>
            <p className="mt-2 text-2xl font-bold">{snapshot.totalListeners}</p>
          </article>
          <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admins</p>
            <p className="mt-2 text-2xl font-bold">{snapshot.totalAdmins}</p>
          </article>
          <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reported Songs</p>
            <p className="mt-2 text-2xl font-bold">{snapshot.reportedSongs}</p>
          </article>
          <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reported Users</p>
            <p className="mt-2 text-2xl font-bold">{snapshot.reportedUsers}</p>
          </article>
          <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">System Status</p>
            <p className="mt-2 text-2xl font-bold uppercase">{snapshot.systemStatus}</p>
          </article>
          <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Environment</p>
            <p className="mt-2 text-2xl font-bold">{snapshot.environment}</p>
          </article>
        </section>
      )}
    </main>
  );
}