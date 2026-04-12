"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import SongListRow from "@/app/songs/SongListRow";
import { type Playlist, listSongs } from "@/services/api/music";
import { type Song } from "@/types/songs";

interface PlaylistDrawerProps {
  playlist: Playlist | null;
  onClose: () => void;
  onRemoveSong?: (songId: number) => void;
  onUnliked?: (songId: number) => void;
  onAddSong?: (songId: number) => void;
  actionBusy?: boolean;
}

export default function PlaylistDrawer({
  playlist,
  onClose,
  onRemoveSong,
  onUnliked,
  onAddSong,
  actionBusy,
}: PlaylistDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const open = Boolean(playlist);

  useEffect(() => { setMounted(true); }, []);

  // Fetch all songs when opening the drawer if adding is allowed
  useEffect(() => {
    if (open && onAddSong) {
      listSongs().then((songs) => setAllSongs(songs)).catch(() => {});
    }
  }, [open, onAddSong]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    // exclude songs already in the playlist
    const existingIds = new Set((playlist?.songs || []).map(s => s.id));
    return allSongs
      .filter(s => !existingIds.has(s.id))
      .filter(s => s.title.toLowerCase().includes(q) || (s.artist_name || "").toLowerCase().includes(q))
      .slice(0, 5); // limit to 5 results
  }, [searchQuery, allSongs, playlist?.songs]);

  // Reset search when playlist changes or closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open, playlist?.id]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!mounted) return null;

  const songs = playlist
    ? [...playlist.songs].sort((a, b) => a.position - b.position)
    : [];

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 9998,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.35s ease",
        }}
      />

      {/* Drawer */}
      <aside
        onClick={(e) => e.stopPropagation()}
        aria-label={playlist ? `${playlist.name} songs` : "Playlist"}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100dvh",
          width: "min(480px, 100vw)",
          background: "linear-gradient(160deg, #0f172a 0%, #1a1a2e 100%)",
          borderLeft: "1px solid rgba(16,185,129,0.2)",
          boxShadow: open ? "-8px 0 48px rgba(0,0,0,0.6)" : "none",
          zIndex: 9999,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid rgba(16,185,129,0.15)",
          background: "rgba(255,255,255,0.02)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Playlist icon */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24" fill="white">
                <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572V21a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66A1.5 1.5 0 007.5 17.25V6.437a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.408.935z" clipRule="evenodd" />
              </svg>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(52,211,153,0.8)",
                marginBottom: 2,
              }}>
                Playlist
              </p>
              <h2 style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#f1f5f9",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                margin: 0,
              }}>
                {playlist?.name ?? ""}
              </h2>
              <p style={{
                fontSize: 12,
                color: "rgba(148,163,184,0.75)",
                marginTop: 2,
              }}>
                {songs.length} song{songs.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Close playlist"
              style={{
                width: 34, height: 34,
                borderRadius: "50%",
                border: "1px solid rgba(16,185,129,0.3)",
                background: "rgba(16,185,129,0.1)",
                color: "#34d399",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(16,185,129,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(16,185,129,0.1)";
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Add Song Search Input */}
          {onAddSong && (
            <div style={{ marginTop: 16, position: "relative" }}>
              <div style={{ position: "relative" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(148,163,184,0.7)" }}>
                  <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Search and add songs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={actionBusy}
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 36px",
                    borderRadius: 8,
                    border: "1px solid rgba(16,185,129,0.2)",
                    background: "rgba(0,0,0,0.2)",
                    color: "white",
                    fontSize: 14,
                    outline: "none",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(16,185,129,0.6)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(16,185,129,0.2)"; }}
                />
              </div>

              {/* Autocomplete Results */}
              {searchQuery.trim().length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
                  background: "#1e293b",
                  border: "1px solid rgba(16,185,129,0.2)",
                  borderRadius: 8,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  zIndex: 10,
                  overflow: "hidden",
                }}>
                  {searchResults.length === 0 ? (
                    <div style={{ padding: "12px 16px", fontSize: 13, color: "rgba(148,163,184,0.7)" }}>
                      No songs found.
                    </div>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {searchResults.map(song => (
                        <li key={song.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onAddSong(song.id);
                              setSearchQuery("");
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 16px",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              background: "transparent",
                              border: "none",
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.title}</p>
                              <p style={{ margin: 0, fontSize: 12, color: "rgba(148,163,184,0.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.artist_name}</p>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#34d399", flexShrink: 0, marginLeft: 8 }}>
                              <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Song list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          {songs.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", paddingTop: 64, gap: 12,
              color: "rgba(148,163,184,0.5)",
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
              <p style={{ fontSize: 14 }}>This playlist is empty</p>
              <p style={{ fontSize: 12, opacity: 0.7 }}>Add songs from the Liked Songs section</p>
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: "0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
              {songs.map((song) => (
                <li key={`${playlist?.id}-${song.id}`} style={{ position: "relative" }}>
                  <SongListRow
                    id={song.id}
                    title={song.title}
                    artistName={song.artist_name}
                    genre={song.genre}
                    audioUrl={song.audio_url}
                    viewCount={song.view_count ?? 0}
                    likeCount={song.like_count ?? 0}
                    onUnliked={onUnliked}
                  />
                  {onRemoveSong && (
                    <button
                      type="button"
                      onClick={() => onRemoveSong(song.id)}
                      disabled={actionBusy}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        background: "transparent",
                        color: "#f43f5e",
                        cursor: actionBusy ? "not-allowed" : "pointer",
                        opacity: actionBusy ? 0.5 : 1,
                        transition: "background 0.15s",
                        fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(244,63,94,0.12)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      }}
                    >
                      x
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>,
    document.body
  );
}
