"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken } from "@/services/api/auth";
import { likeSong, reportSong, unlikeSong } from "@/services/api/social";
import { type SongProps } from "@/types/songs";

const FALLBACK_COVER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" rx="36" fill="#0f172a"/><circle cx="200" cy="152" r="64" fill="rgba(255,255,255,0.08)"/><rect x="100" y="250" width="200" height="18" rx="9" fill="#e2e8f0" fill-opacity="0.9"/><rect x="128" y="282" width="144" height="12" rx="6" fill="#e2e8f0" fill-opacity="0.55"/></svg>`,
)} `;



export default function Song({ id, title, artistName, genre, audioUrl, coverUrl, viewCount = 0, likeCount = 0 }: SongProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const displayedLikeCount = likeCount + (isLiked ? 1 : 0);

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

  async function onReportSong() {
    const token = getAccessToken();
    if (!token || reporting || reported) {
      return;
    }

    setReporting(true);
    try {
      await reportSong(token, id, "Inappropriate or harmful song content");
      setReported(true);
    } catch {
      // Keep UI simple for now; moderation handling relies on backend reports.
    } finally {
      setReporting(false);
    }
  }

  async function onToggleLike() {
    const token = getAccessToken();
    if (!token || liking) {
      const redirectPath = pathname || "/";
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLiking(true);

    try {
      if (nextLiked) {
        await likeSong(token, id);
      } else {
        await unlikeSong(token, id);
      }
    } catch {
      setIsLiked(!nextLiked);
    } finally {
      setLiking(false);
    }
  }

  return (
    <article className="group flex w-48 shrink-0 snap-start flex-col gap-3 transition-transform hover:-translate-y-1">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl shadow-md transition-shadow group-hover:shadow-xl group-hover:shadow-indigo-500/20">
        <img
          src={coverUrl || FALLBACK_COVER}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src = FALLBACK_COVER;
          }}
        />
        <div className={`absolute inset-0 bg-black/40 ${isPlaying ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[2px]`}>
          <button 
           onClick={onTogglePlay}
           disabled={!audioUrl}
           className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/40 hover:scale-105 transition-transform disabled:opacity-50 cursor-pointer">
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                 <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 ml-1">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div>
        <h3 className="truncate font-semibold text-slate-900 dark:text-white text-base">{title}</h3>
        <div className="flex justify-between items-center mt-0.5">
           <p className="truncate text-sm text-slate-500 dark:text-slate-400">{artistName}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onReportSong}
              disabled={reporting || reported}
              className="rounded-md border border-amber-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/40 dark:text-amber-300"
            >
              {reported ? "Reported" : reporting ? "Reporting" : "Report"}
            </button>
            <button
              onClick={onToggleLike}
              disabled={liking}
              className={`transition-colors ${isLiked ? "text-rose-500 drop-shadow-md cursor-pointer" : "text-slate-400 hover:text-slate-300 dark:text-slate-500 dark:hover:text-slate-400 cursor-pointer"} disabled:cursor-not-allowed disabled:opacity-60`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                </svg>
            </button>
          </div>
        </div>
      </div>

      {audioUrl ? (
        <audio ref={audioRef} src={audioUrl} preload="none" className="hidden" aria-label={`song-${id}`} />
      ) : null}
    </article>
  );
}
