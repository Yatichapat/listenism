"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken } from "@/services/api/auth";
import { isSongLikedInStorage, likeSong, markSongAsLiked, unlikeSong } from "@/services/api/social";
import { type SongProps } from "@/types/songs";
import SaveToPlaylistDropdown from "@/app/components/SaveToPlaylistDropdown";

const LIKED_SONGS_CHANGED_EVENT = "listenism-liked-songs-changed";

type SongListRowProps = SongProps & {
  onUnliked?: (songId: number) => void;
};

function formatCompactCount(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(value);
}

export default function SongListRow({
  id,
  title,
  artistName,
  genre,
  audioUrl,
  viewCount = 0,
  likeCount = 0,
  isLiked: initialIsLiked,
  onUnliked,
}: SongListRowProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(() => Boolean(initialIsLiked) || isSongLikedInStorage(id));
  const [likeDelta, setLikeDelta] = useState(0);
  const [liking, setLiking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const displayedLikeCount = likeCount + likeDelta;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handleEnd = () => setIsPlaying(false);

    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("ended", handleEnd);

    return () => {
      audio.pause();
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("ended", handleEnd);
    };
  }, []);

  useEffect(() => {
    if (initialIsLiked) {
      markSongAsLiked(id);
    }
  }, [id, initialIsLiked]);

  useEffect(() => {
    function syncLikedState() {
      const nextLiked = isSongLikedInStorage(id);
      setIsLiked((currentLiked) => {
        if (currentLiked === nextLiked) {
          return currentLiked;
        }

        setLikeDelta((currentDelta) => currentDelta + (nextLiked ? 1 : -1));
        return nextLiked;
      });
    }

    syncLikedState();
    window.addEventListener(LIKED_SONGS_CHANGED_EVENT, syncLikedState);

    return () => {
      window.removeEventListener(LIKED_SONGS_CHANGED_EVENT, syncLikedState);
    };
  }, [id]);

  async function onTogglePlay() {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    audio.pause();
    setIsPlaying(false);
  }

  async function onToggleLike() {
    const token = getAccessToken();
    if (!token || liking) {
      const redirectPath = pathname || "/";
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    const nextLiked = !isLiked;
    const previousLiked = isLiked;
    const previousLikeDelta = likeDelta;
    setIsLiked(nextLiked);
    setLikeDelta((currentDelta) => currentDelta + (nextLiked ? 1 : -1));
    setLiking(true);

    try {
      if (nextLiked) {
        await likeSong(token, id);
      } else {
        await unlikeSong(token, id);
        onUnliked?.(id);
      }
    } catch {
      setIsLiked(previousLiked);
      setLikeDelta(previousLikeDelta);
    } finally {
      setLiking(false);
    }
  }

  return (
    <div className="group flex items-center justify-between w-full rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-all hover:bg-white/10 hover:shadow-lg hover:shadow-purple-500/10 dark:border-white/5 dark:bg-black/20 dark:hover:bg-white/5">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onTogglePlay}
          disabled={!audioUrl}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        
        <div className="flex flex-col min-w-0">
          <p className="truncate text-base font-semibold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
            {title}
          </p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
            {artistName}
          </p>
        </div>
      </div>

      <div className="hidden md:flex items-center w-1/4 px-4 text-sm text-slate-500 dark:text-slate-400">
        {genre && <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-xs font-medium">{genre}</span>}
      </div>

      <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
        <div className="hidden sm:flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
          <span>{formatCompactCount(viewCount)}</span>
        </div>
        
        <button
          type="button"
          onClick={onToggleLike}
          disabled={liking}
          className={`flex items-center gap-1 transition-colors ${
            isLiked ? "text-rose-500" : "hover:text-rose-500"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {isLiked ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          )}
          <span>{formatCompactCount(displayedLikeCount)}</span>
        </button>

        <SaveToPlaylistDropdown songId={id} />
      </div>

      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="none" className="hidden" aria-label={`song-${id}`} />
      )}
    </div>
  );
}
