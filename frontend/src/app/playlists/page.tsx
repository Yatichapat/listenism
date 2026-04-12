"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_CHANGED_EVENT, getAccessToken } from "@/services/api/auth";
import {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  listLikedSongs,
  listPlaylists,
  removeSongFromPlaylist,
  renamePlaylist,
  type Playlist,
} from "@/services/api/music";
import { type Song as SongItem } from "@/types/songs";
import SongListRow from "@/app/songs/SongListRow";
import PlaylistDrawer from "@/app/components/PlaylistDrawer";

const LIKED_SONGS_CHANGED_EVENT = "listenism-liked-songs-changed";
const LIKED_SONGS_PLAYLIST_ID = -1;

export default function PlaylistsPage() {
  const router = useRouter();
  const [likedSongs, setLikedSongs] = useState<SongItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [renameDraft, setRenameDraft] = useState("");
  const [manualSongIdDraft, setManualSongIdDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlaylist = useMemo(
    () => playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null,
    [playlists, selectedPlaylistId],
  );

  useEffect(() => {
    let mounted = true;

    async function loadLibrary() {
      const token = getAccessToken();
      if (!token) {
        router.push("/login?redirect=/playlists");
        return;
      }

      setError(null);
      try {
        const [liked, userPlaylists] = await Promise.all([
          listLikedSongs(token),
          listPlaylists(token),
        ]);
        if (!mounted) {
          return;
        }

        setLikedSongs(liked);
        setPlaylists(userPlaylists);
        setSelectedPlaylistId((currentSelected) => {
          if (currentSelected && userPlaylists.some((playlist) => playlist.id === currentSelected)) {
            return currentSelected;
          }
          return null;
        });
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load playlists.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadLibrary();

    function handleReload() {
      void loadLibrary();
    }

    window.addEventListener(LIKED_SONGS_CHANGED_EVENT, handleReload);
    window.addEventListener(AUTH_CHANGED_EVENT, handleReload);

    return () => {
      mounted = false;
      window.removeEventListener(LIKED_SONGS_CHANGED_EVENT, handleReload);
      window.removeEventListener(AUTH_CHANGED_EVENT, handleReload);
    };
  }, [router]);

  useEffect(() => {
    setRenameDraft(selectedPlaylist?.name ?? "");
  }, [selectedPlaylist]);

  function upsertPlaylist(updated: Playlist): void {
    setPlaylists((previous) => {
      const index = previous.findIndex((item) => item.id === updated.id);
      if (index === -1) {
        return [updated, ...previous];
      }

      const next = [...previous];
      next[index] = updated;
      return next;
    });
  }

  async function withToken<T>(callback: (token: string) => Promise<T>): Promise<T | null> {
    const token = getAccessToken();
    if (!token) {
      router.push("/login?redirect=/playlists");
      return null;
    }
    return callback(token);
  }

  async function onCreatePlaylist(): Promise<void> {
    const trimmed = newPlaylistName.trim();
    if (!trimmed || actionBusy) {
      return;
    }

    setActionBusy(true);
    setError(null);
    try {
      const created = await withToken((token) => createPlaylist(token, trimmed));
      if (!created) {
        return;
      }
      upsertPlaylist(created);
      setSelectedPlaylistId(created.id);
      setNewPlaylistName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create playlist.");
    } finally {
      setActionBusy(false);
    }
  }

  async function onRenamePlaylist(): Promise<void> {
    if (!selectedPlaylist || actionBusy) {
      return;
    }

    const trimmed = renameDraft.trim();
    if (!trimmed) {
      setError("Playlist name is required.");
      return;
    }

    setActionBusy(true);
    setError(null);
    try {
      const updated = await withToken((token) => renamePlaylist(token, selectedPlaylist.id, trimmed));
      if (!updated) {
        return;
      }
      upsertPlaylist(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename playlist.");
    } finally {
      setActionBusy(false);
    }
  }

  async function onDeletePlaylist(): Promise<void> {
    if (!selectedPlaylist || actionBusy) {
      return;
    }

    setActionBusy(true);
    setError(null);
    try {
      const deletedId = selectedPlaylist.id;
      const success = await withToken(async (token) => {
        await deletePlaylist(token, deletedId);
        return true;
      });
      if (!success) {
        return;
      }

      setPlaylists((previous) => previous.filter((playlist) => playlist.id !== deletedId));
      setSelectedPlaylistId((current) => (current === deletedId ? null : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete playlist.");
    } finally {
      setActionBusy(false);
    }
  }

  async function onAddSongToPlaylist(songId: number): Promise<void> {
    if (!selectedPlaylist || actionBusy) {
      return;
    }

    setActionBusy(true);
    setError(null);
    try {
      const updated = await withToken((token) => addSongToPlaylist(token, selectedPlaylist.id, songId));
      if (!updated) {
        return;
      }
      upsertPlaylist(updated);
      setManualSongIdDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add song to playlist.");
    } finally {
      setActionBusy(false);
    }
  }

  async function onRemoveSongFromPlaylist(songId: number): Promise<void> {
    if (!selectedPlaylist || actionBusy) {
      return;
    }

    setActionBusy(true);
    setError(null);
    try {
      const updated = await withToken((token) => removeSongFromPlaylist(token, selectedPlaylist.id, songId));
      if (!updated) {
        return;
      }
      upsertPlaylist(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove song from playlist.");
    } finally {
      setActionBusy(false);
    }
  }

  // Keep drawerPlaylist in sync when its data updates
  const drawerPlaylist = useMemo(() => {
    if (selectedPlaylistId === LIKED_SONGS_PLAYLIST_ID) {
      return {
        id: LIKED_SONGS_PLAYLIST_ID,
        user_id: LIKED_SONGS_PLAYLIST_ID,
        name: "Liked Songs",
        songs: likedSongs.map((s, i) => ({ ...s, position: i + 1 })),
      } as Playlist;
    }
    return playlists.find((p) => p.id === selectedPlaylistId) ?? null;
  }, [playlists, selectedPlaylistId, likedSongs]);

  // Generate a simple cover gradient from the playlist name
  function playlistGradient(name: string): string {
    if (name === "Liked Songs" || !name) {
      return "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)";
    }
    const colors = [
      ["#10b981", "#06b6d4"],
      ["#6366f1", "#8b5cf6"],
      ["#f59e0b", "#ef4444"],
      ["#ec4899", "#a855f7"],
      ["#3b82f6", "#06b6d4"],
      ["#14b8a6", "#84cc16"],
    ];
    const idx = name.charCodeAt(0) % colors.length;
    return `linear-gradient(135deg, ${colors[idx][0]} 0%, ${colors[idx][1]} 100%)`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent transition-colors duration-500">
        <main className="mx-auto flex w-full max-w-7xl flex-col pb-20 pt-8 px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-slate-500">Loading your library...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-500">
      <main className="mx-auto flex w-full max-w-7xl flex-col pb-20 pt-8 px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl p-8 mb-8 mt-4">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/80 via-cyan-500/80 to-blue-600/80 backdrop-blur-xl -z-10" />
          <div className="flex flex-col text-white">
            <span className="text-sm font-medium uppercase tracking-wider opacity-80 mb-2">Library</span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-3">Playlists</h1>
            <p className="text-sm md:text-base opacity-90">Create personal playlists while keeping Liked Songs powered by likes.</p>
          </div>
        </section>

        {error ? (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-300">
            {error}
          </div>
        ) : null}

        {/* ── All Playlists cards ── */}
        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Library</h2>
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{playlists.length + 1} playlists</p>
          </div>

          {/* Create new playlist input */}
          <div className="mb-6 flex gap-2 max-w-sm">
            <input
              value={newPlaylistName}
              onChange={(event) => setNewPlaylistName(event.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void onCreatePlaylist(); }}
              placeholder="New playlist name…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
            />
            <button
              type="button"
              onClick={() => void onCreatePlaylist()}
              disabled={actionBusy || !newPlaylistName.trim()}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create
            </button>
          </div>

          <div className="flex gap-5 overflow-x-auto pb-3" style={{ scrollSnapType: "x mandatory" }}>
            {/* 1. Liked Songs Card */}
            <button
              type="button"
              onClick={() => setSelectedPlaylistId(LIKED_SONGS_PLAYLIST_ID)}
              className="group relative flex w-44 shrink-0 snap-start flex-col gap-3 text-left transition-transform hover:-translate-y-1"
              style={{ cursor: "pointer" }}
            >
              <div
                className={`relative aspect-square w-full overflow-hidden rounded-xl shadow-md transition-shadow group-hover:shadow-xl ${selectedPlaylistId === LIKED_SONGS_PLAYLIST_ID ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-transparent" : ""}`}
                style={{ background: playlistGradient("Liked Songs") }}
              >
                {/* Heart Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width={44} height={44} viewBox="0 0 24 24" fill="rgba(255,255,255,0.75)">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                </div>
                {/* Song count badge */}
                <div className="absolute bottom-2 right-2 rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                  {likedSongs.length} songs
                </div>
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5 ml-0.5">
                      <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <p className="truncate font-semibold text-slate-900 dark:text-white text-sm">Liked Songs</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">Your favorite tracks</p>
              </div>
            </button>

            {/* 2. Custom Playlists */}
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => setSelectedPlaylistId(playlist.id)}
                  className="group relative flex w-44 shrink-0 snap-start flex-col gap-3 text-left transition-transform hover:-translate-y-1"
                  style={{ cursor: "pointer" }}
                >
                  {/* Square cover */}
                  <div
                    className={`relative aspect-square w-full overflow-hidden rounded-xl shadow-md transition-shadow group-hover:shadow-xl ${selectedPlaylistId === playlist.id ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-transparent" : ""}`}
                    style={{ background: playlistGradient(playlist.name) }}
                  >
                    {/* Music note icon in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width={40} height={40} viewBox="0 0 24 24" fill="rgba(255,255,255,0.35)">
                        <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572V21a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66A1.5 1.5 0 007.5 17.25V6.437a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.408.935z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {/* Song count badge */}
                    <div className="absolute bottom-2 right-2 rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                      {playlist.songs.length} songs
                    </div>
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5 ml-0.5">
                          <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <p className="truncate font-semibold text-slate-900 dark:text-white text-sm">{playlist.name}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{playlist.songs.length} songs</p>
                  </div>
                </button>
              ))}
            </div>
        </section>
      </main>

      {/* Playlist drawer */}
      <PlaylistDrawer
        playlist={drawerPlaylist}
        onClose={() => setSelectedPlaylistId(null)}
        onRemoveSong={selectedPlaylistId === LIKED_SONGS_PLAYLIST_ID ? undefined : (songId) => void onRemoveSongFromPlaylist(songId)}
        onAddSong={selectedPlaylistId === LIKED_SONGS_PLAYLIST_ID || !selectedPlaylist ? undefined : (songId) => void onAddSongToPlaylist(songId)}
        onUnliked={(songId) => {
          setLikedSongs((previous) => previous.filter((item) => item.id !== songId));
        }}
        actionBusy={actionBusy}
      />
    </div>
  );
}
