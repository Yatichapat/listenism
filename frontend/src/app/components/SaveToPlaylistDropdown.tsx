"use client";

import { useState, useRef, useEffect } from "react";
import { getAccessToken } from "@/services/api/auth";
import { listPlaylists, addSongToPlaylist, type Playlist } from "@/services/api/music";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Check } from 'lucide-react'

interface SaveToPlaylistDropdownProps {
  songId: number;
}

export default function SaveToPlaylistDropdown({ songId }: SaveToPlaylistDropdownProps) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      const token = getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }
      setLoading(true);
      listPlaylists(token)
        .then((data) => setPlaylists(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, router]);

  async function handleAddToPlaylist(playlistId: number) {
    if (actionBusy) return;
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setActionBusy(true);
    try {
      await addSongToPlaylist(token, playlistId, songId);
      setOpen(false); // Close on success
    } catch (err) {
      console.error("Failed to add to playlist", err);
      alert("Failed to add song to this playlist.");
    } finally {
      setActionBusy(false);
    }
  }

  const isSavedToAnyPlaylist = playlists.some((pl) => pl.songs.some((s) => s.id === songId));

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(!open);
        }}
        title="Add to Playlist"
        className="flex items-center justify-center p-1.5 rounded-full text-slate-500 hover:text-emerald-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-white/10 transition-colors"
      >
        {isSavedToAnyPlaylist ? <BookmarkCheck className="text-emerald-500 dark:text-emerald-400" /> : <Bookmark />}
      </button>

      {open && (
        <div 
          className="absolute right-0 bottom-full mb-2 w-48 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 z-50 text-sm overflow-hidden"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
        >
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <span className="font-semibold text-slate-900 dark:text-white">Save to playlist</span>
          </div>
          
          <div className="max-h-48 overflow-y-auto w-full py-1">
            {loading ? (
              <div className="px-3 py-2 text-slate-500 dark:text-slate-400 text-center">Loading...</div>
            ) : playlists.length === 0 ? (
              <div className="px-3 py-2 text-slate-500 dark:text-slate-400 text-center">No playlists found</div>
            ) : (
              <ul className="flex flex-col w-full">
                {playlists.map((pl) => {
                  const alreadyAdded = pl.songs.some((s) => s.id === songId);
                  return (
                    <li key={pl.id} className="w-full">
                      <button
                        type="button"
                        disabled={actionBusy || alreadyAdded}
                        onClick={() => handleAddToPlaylist(pl.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                          alreadyAdded 
                            ? "opacity-50 cursor-not-allowed text-slate-500 dark:text-slate-400" 
                            : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        <span className="truncate">{pl.name}</span>
                        {alreadyAdded && (
                          <Check size={14} className="text-emerald-500 flex-shrink-0 ml-2" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
