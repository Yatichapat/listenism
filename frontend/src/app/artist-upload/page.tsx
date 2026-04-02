"use client";
import React, { useEffect, useState } from "react";
import { getAccessToken, me } from "@/services/api/auth";
import { deleteMySong, listMySongs } from "@/services/api/music";
import { type Song } from "@/types/songs";

const GENRES = [
  "Pop", "Rock", "Hip-Hop", "Jazz", "Classical", "Electronic", "R&B", "Country", "Other"
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const UploadSongPage = () => {
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [album, setAlbum] = useState("");
  const [albumArt, setAlbumArt] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [genre, setGenre] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [mySongs, setMySongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [deletingSongId, setDeletingSongId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const loadArtistData = async () => {
    const token = getAccessToken();
    if (!token) {
      setError("Please login first before managing songs.");
      setMySongs([]);
      return;
    }

    setSongsLoading(true);
    try {
      const [profile, songs] = await Promise.all([me(token), listMySongs(token)]);
      setArtistName(profile.display_name);
      setMySongs(songs);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load your songs.");
    } finally {
      setSongsLoading(false);
    }
  };

  useEffect(() => {
    void loadArtistData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !genre) {
      setError("Please fill in song title and genre.");
      return;
    }

    if (!audio) {
      setError("Please select an audio file to upload.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError("Please login first before uploading a song.");
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('genre', genre);
      if (album.trim()) {
        formData.append('album_title', album.trim());
      } else if (albumArt) {
        formData.append('album_title', title.trim());
      }
      formData.append('audio_file', audio);
      if (albumArt) {
        formData.append('cover_file', albumArt);
      }

      const res = await fetch(`${API_BASE}/api/v1/music/songs/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        let detail = `Upload failed with status ${res.status}`;
        try {
          const data = await res.json();
          if (data?.detail) {
            detail = String(data.detail);
          }
        } catch {
          // Keep fallback detail if response body is not JSON.
        }
        throw new Error(detail);
      }

      setSuccess(true);
      setTitle("");
      setAlbum("");
      setGenre("");
      setAlbumArt(null);
      setAudio(null);
      setShowAddForm(false);
      await loadArtistData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSong = async (songId: number) => {
    const token = getAccessToken();
    if (!token) {
      setError("Please login first before deleting songs.");
      return;
    }

    setDeletingSongId(songId);
    setError("");
    setSuccess(false);
    try {
      await deleteMySong(token, songId);
      setMySongs((prev) => prev.filter((song) => song.id !== songId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingSongId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Artist Studio</h1>
          <p className="text-sm text-gray-500">{artistName ? `Signed in as ${artistName}` : "Manage your songs"}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm((prev) => !prev);
            setSuccess(false);
            setError("");
          }}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {showAddForm ? "Close" : "+ Add Song"}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Upload Song</h2>
          <div>
            <label className="mb-1 block font-medium">Song Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="mb-1 block font-medium">Album Name</label>
            <input
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium">Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full rounded border px-3 py-2"
              required
            >
              <option value="" disabled>Select genre</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-medium">Album Picture</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAlbumArt(e.target.files?.[0] || null)}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">If you choose a cover without album name, the song title will be used as the album name.</p>
          </div>
          <div>
            <label className="mb-1 block font-medium">Audio File</label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setAudio(e.target.files?.[0] || null)}
              className="w-full"
            />
          </div>
          <p className="text-xs text-gray-500">
            Audio file is required. Album cover is optional and will be attached to the album when provided.
          </p>
          <button
            type="submit"
            className="rounded bg-blue-600 px-6 py-2 text-white disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload Song"}
          </button>
        </form>
      )}

      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-600">{error}</div>}
      {success && <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-green-700">Upload successful!</div>}

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Songs</h2>
          <button
            type="button"
            onClick={() => void loadArtistData()}
            className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
            disabled={songsLoading}
          >
            {songsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {songsLoading && <p className="text-sm text-gray-500">Loading your songs...</p>}
        {!songsLoading && mySongs.length === 0 && (
          <p className="text-sm text-gray-500">No songs uploaded yet. Click Add Song to upload your first track.</p>
        )}
        {!songsLoading && mySongs.length > 0 && (
          <ul className="space-y-3">
            {mySongs.map((song) => (
              <li key={song.id} className="flex items-center justify-between gap-4 rounded border border-gray-200 p-3">
                <div className="flex items-center gap-3">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt={song.title} className="h-14 w-14 rounded object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
                      No cover
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{song.title}</p>
                    <p className="text-xs text-gray-500">{song.genre || "Unknown genre"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {song.audio_url ? (
                    <audio controls preload="none" className="h-8 w-64 max-w-full">
                      <source src={song.audio_url} />
                    </audio>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleDeleteSong(song.id)}
                    className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                    disabled={deletingSongId === song.id}
                  >
                    {deletingSongId === song.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default UploadSongPage;
