"use client";

import { useEffect, useState } from "react";
import { getAccessToken, me, type UserPublic } from "@/services/api/auth";
import { getArtistAnalytics, listMySongs, type ArtistAnalytics } from "@/services/api/music";

function compactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(value);
}

export default function AnalyticsPage() {
  const [profile, setProfile] = useState<UserPublic | null>(null);
  const [analytics, setAnalytics] = useState<ArtistAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      if (!token) {
        setError("Please login as an artist to view analytics.");
        setLoading(false);
        return;
      }

      try {
        const user = await me(token);
        if (user.role !== "artist") {
          setError("Artist access required.");
          setLoading(false);
          return;
        }

        setProfile(user);

        try {
          const artistAnalytics = await getArtistAnalytics(token);
          setAnalytics(artistAnalytics);
        } catch {
          // Fallback mode: support older backend instances that don't expose analytics endpoint yet.
          const songs = await listMySongs(token);
          const fallbackAnalytics: ArtistAnalytics = {
            artist_id: user.id,
            artist_name: user.display_name,
            follower_count: user.follower_count ?? 0,
            total_songs: songs.length,
            total_plays: 0,
            top_songs: [...songs]
              .sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))
              .slice(0, 10)
              .map((song) => ({
                id: song.id,
                title: song.title,
                genre: song.genre,
                play_count: 0,
                like_count: song.like_count ?? 0,
              })),
          };
          setAnalytics(fallbackAnalytics);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const totalSongs = analytics?.total_songs ?? 0;
  const totalFollowers = analytics?.follower_count ?? profile?.follower_count ?? 0;
  const totalPlays = analytics?.total_plays ?? 0;
  const topSongs = analytics?.top_songs ?? [];

  if (loading) {
    return <main className="mx-auto max-w-6xl p-8 text-sm text-slate-500">Loading analytics...</main>;
  }

  if (error) {
    return <main className="mx-auto max-w-6xl p-8 text-sm text-rose-500">{error}</main>;
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Artist Analytics</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          {profile?.display_name ? `Welcome back, ${profile.display_name}.` : "Your performance overview."}
        </p>
      </header>

      <section className="grid gap-4 grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-slate-500">Total Songs</p>
          <p className="mt-2 text-3xl font-bold">{compactNumber(totalSongs)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-slate-500">Total Followers</p>
          <p className="mt-2 text-3xl font-bold">{compactNumber(totalFollowers)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-slate-500">Total Plays</p>
          <p className="mt-2 text-3xl font-bold">{compactNumber(totalPlays)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-slate-500">Avg Plays / Song</p>
          <p className="mt-2 text-3xl font-bold">{totalSongs > 0 ? (totalPlays / totalSongs).toFixed(1) : "0.0"}</p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/40">
          <h2 className="text-lg font-semibold">Top Songs by Plays</h2>
          {topSongs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No songs uploaded yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topSongs.map((song) => (
                <li key={song.id} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{song.title}</p>
                    <p className="text-xs text-slate-500">{song.genre || "Unknown genre"}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {song.play_count} plays
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/40">
          <h2 className="text-lg font-semibold">Engagement Summary</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>Artist: <span className="font-medium text-slate-900 dark:text-white">{analytics?.artist_name || profile?.display_name || "-"}</span></p>
            <p>Followers: <span className="font-medium text-slate-900 dark:text-white">{compactNumber(totalFollowers)}</span></p>
            <p>Total songs: <span className="font-medium text-slate-900 dark:text-white">{compactNumber(totalSongs)}</span></p>
            <p>Total plays: <span className="font-medium text-slate-900 dark:text-white">{compactNumber(totalPlays)}</span></p>
          </div>
        </article>
      </section>
    </main>
  );
}
