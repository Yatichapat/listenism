"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken } from "@/services/api/auth";
import { followArtist, reportUser, unfollowArtist } from "@/services/api/social";
import { Artist } from "@/types/artist";

interface ArtistCardProps {
  artist: Artist;
  subtitleLabel?: string;
}

export default function ArtistCard({ artist, subtitleLabel }: ArtistCardProps) {
  const avatarUrl = artist.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${artist.name}&backgroundColor=6366f1`;
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(artist.followers_count ?? 0);
  const router = useRouter();
  const pathname = usePathname();
  
  // Format followers if we want to display it
  const displayFollowers = followersCount > 0 ? `${followersCount} Followers` : "New Artist";

  async function onReportArtist() {
    const token = getAccessToken();
    if (!token) {
      const redirectPath = pathname || "/";
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    if (reporting || reported) {
      return;
    }

    setReporting(true);
    setReportError(null);
    try {
      await reportUser(token, artist.id, "Suspicious or inappropriate artist behavior");
      setReported(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to report user";
      setReportError(message);
    } finally {
      setReporting(false);
    }
  }

  async function onToggleFollow() {
    const token = getAccessToken();
    if (!token || following) {
      const redirectPath = pathname || "/";
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    const nextFollowed = !isFollowed;
    setIsFollowed(nextFollowed);
    setFollowersCount((count) => Math.max(0, count + (nextFollowed ? 1 : -1)));
    setFollowing(true);

    try {
      if (nextFollowed) {
        await followArtist(token, artist.id);
      } else {
        await unfollowArtist(token, artist.id);
      }
    } catch {
      setIsFollowed(!nextFollowed);
      setFollowersCount((count) => Math.max(0, count + (nextFollowed ? -1 : 1)));
    } finally {
      setFollowing(false);
    }
  }
  
  return (
    <article className="group flex w-40 shrink-0 snap-start flex-col items-center gap-4 transition-transform hover:-translate-y-1">
      <div className="relative aspect-square w-full overflow-hidden rounded-full shadow-md transition-all group-hover:shadow-xl group-hover:shadow-indigo-500/20 ring-4 ring-transparent group-hover:ring-indigo-500/30">
        <img
          src={avatarUrl}
          alt={artist.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="text-center w-full">
        <h3 className="truncate font-semibold text-slate-900 dark:text-white text-base">{artist.name}</h3>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
          {subtitleLabel || displayFollowers}
        </p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onToggleFollow}
            disabled={following}
            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition ${
              isFollowed
                ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
                : "border-slate-300/70 text-slate-700 hover:bg-slate-100 dark:border-slate-600/70 dark:text-slate-200 dark:hover:bg-slate-700/40"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isFollowed ? "Following" : "Follow"}
          </button>
          <button
            type="button"
            onClick={onReportArtist}
            disabled={reporting || reported}
            className="rounded-md border border-amber-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/40 dark:text-amber-300"
          >
            {reported ? "Reported" : reporting ? "Reporting" : "Report"}
          </button>
        </div>
        {reportError && (
          <p className="mt-2 text-[10px] font-medium text-rose-500">{reportError}</p>
        )}
      </div>
    </article>
  );
}
