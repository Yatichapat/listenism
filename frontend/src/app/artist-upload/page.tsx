"use client";
import React, { useEffect, useState } from "react";
import { getAccessToken, me } from "@/services/api/auth";
import { deleteMySong, listMySongs, updateMySong, uploadArtistSongs, type UploadMode } from "@/services/api/music";
import { type Song } from "@/types/songs";

type AlbumTrackDraft = {
  file: File;
  title: string;
};

const GENRES = [
  "Pop", "Rock", "Hip-Hop", "Jazz", "Classical", "Electronic", "R&B", "Country", "Other"
];

const UploadSongPage = () => {
  const [uploadMode, setUploadMode] = useState<UploadMode>("single");
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [singleAudio, setSingleAudio] = useState<File | null>(null);
  const [albumTracks, setAlbumTracks] = useState<AlbumTrackDraft[]>([]);
  const [genre, setGenre] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [mySongs, setMySongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [deletingSongId, setDeletingSongId] = useState<number | null>(null);
  const [editingSongId, setEditingSongId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const [editCover, setEditCover] = useState<File | null>(null);
  const [savingSongId, setSavingSongId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
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

  const resetForm = () => {
    setTitle("");
    setAlbumTitle("");
    setGenre("");
    setCoverImage(null);
    setSingleAudio(null);
    setAlbumTracks([]);
  };

  const cancelEdit = () => {
    setEditingSongId(null);
    setEditTitle("");
    setEditGenre("");
    setEditCover(null);
  };

  const startEditSong = (song: Song) => {
    setEditingSongId(song.id);
    setEditTitle(song.title);
    setEditGenre(song.genre || "");
    setEditCover(null);
    setSuccess(false);
    setSuccessMessage("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genre) {
      setError("Please select a genre.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError("Please login first before uploading a song.");
      return;
    }

    if (!coverImage) {
      setError(uploadMode === "album" ? "Please select an album cover image." : "Please select a cover image.");
      return;
    }

    if (uploadMode === "single") {
      if (!title.trim()) {
        setError("Please fill in the song title.");
        return;
      }
      if (!singleAudio) {
        setError("Please select an audio file to upload.");
        return;
      }
    } else {
      if (!albumTitle.trim()) {
        setError("Please fill in the album title.");
        return;
      }
      if (albumTracks.length === 0) {
        setError("Please select at least one audio file for the album.");
        return;
      }
      if (albumTracks.some((track) => !track.title.trim())) {
        setError("Please fill in a title for every album track.");
        return;
      }
    }

    setLoading(true);
    setError("");
    setSuccess(false);
    setSuccessMessage("");
    try {
      const formData = new FormData();
      formData.append("upload_type", uploadMode);
      formData.append("genre", genre);
      formData.append("cover_file", coverImage);

      if (uploadMode === "single") {
        formData.append("title", title.trim());
        if (albumTitle.trim()) {
          formData.append("album_title", albumTitle.trim());
        }
        if (singleAudio) {
          formData.append("audio_file", singleAudio);
        }
      } else {
        formData.append("album_title", albumTitle.trim());
        albumTracks.forEach((track) => {
          formData.append("audio_files", track.file);
          formData.append("track_titles", track.title.trim());
        });
      }

      const uploadedSongs = await uploadArtistSongs(token, formData);

      setSuccess(true);
      setSuccessMessage(
        `Upload successful! ${uploadedSongs.length} song${uploadedSongs.length > 1 ? "s" : ""} added.`,
      );
      resetForm();
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
    setSuccessMessage("");
    try {
      await deleteMySong(token, songId);
      setMySongs((prev) => prev.filter((song) => song.id !== songId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingSongId(null);
    }
  };

  const handleUpdateSong = async (songId: number) => {
    const token = getAccessToken();
    if (!token) {
      setError("Please login first before editing songs.");
      return;
    }

    if (!editTitle.trim()) {
      setError("Please fill in the song title.");
      return;
    }

    if (!editGenre.trim()) {
      setError("Please select a genre.");
      return;
    }

    setSavingSongId(songId);
    setError("");
    setSuccess(false);
    setSuccessMessage("");

    try {
      const formData = new FormData();
      formData.append("title", editTitle.trim());
      formData.append("genre", editGenre.trim());
      if (editCover) {
        formData.append("cover_file", editCover);
      }

      const updatedSong = await updateMySong(token, songId, formData);
      setMySongs((prev) => prev.map((song) => (song.id === songId ? updatedSong : song)));
      setSuccess(true);
      setSuccessMessage("Song updated successfully.");
      cancelEdit();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSavingSongId(null);
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
            setSuccessMessage("");
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
            <label className="mb-1 block font-medium">Upload Type</label>
            <select
              value={uploadMode}
              onChange={(e) => {
                const nextMode = e.target.value as UploadMode;
                setUploadMode(nextMode);
                setSuccess(false);
                setSuccessMessage("");
                setError("");
                setTitle("");
                setAlbumTitle("");
                setCoverImage(null);
                setSingleAudio(null);
                setAlbumTracks([]);
              }}
              className="w-full rounded border px-3 py-2"
            >
              <option value="single">Single</option>
              <option value="album">Album</option>
            </select>
          </div>

          {uploadMode === "single" ? (
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
          ) : (
            <div>
              <label className="mb-1 block font-medium">Album Title</label>
              <input
                type="text"
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>
          )}

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
            <label className="mb-1 block font-medium">{uploadMode === "album" ? "Album Cover" : "Song Cover"}</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              {uploadMode === "album"
                ? "Use one cover image for the full album."
                : "Single songs must include a cover image."}
            </p>
          </div>

          <div>
            <label className="mb-1 block font-medium">{uploadMode === "album" ? "Audio Files" : "Audio File"}</label>
            {uploadMode === "album" ? (
              <div className="space-y-3">
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setAlbumTracks(
                      files.map((file) => ({
                        file,
                        title: file.name.replace(/\.[^.]+$/, ""),
                      })),
                    );
                  }}
                  className="w-full"
                />

                {albumTracks.length > 0 && (
                  <div className="space-y-3 rounded border border-gray-200 bg-gray-50 p-3">
                    <p className="text-sm font-medium text-gray-700">Track titles</p>
                    {albumTracks.map((track, index) => (
                      <div key={`${track.file.name}-${index}`} className="grid gap-2 md:grid-cols-[1fr_2fr] md:items-center">
                        <div className="truncate text-sm text-gray-600">{track.file.name}</div>
                        <input
                          type="text"
                          value={track.title}
                          onChange={(e) => {
                            const nextTitle = e.target.value;
                            setAlbumTracks((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, title: nextTitle } : item,
                              ),
                            );
                          }}
                          className="w-full rounded border px-3 py-2"
                          placeholder="Track title"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setSingleAudio(e.target.files?.[0] || null)}
                className="w-full"
              />
            )}
          </div>

          <p className="text-xs text-gray-500">
            {uploadMode === "album"
              ? "Album uploads let you choose many audio files with one shared cover image. You can edit each track title before uploading."
              : "Single uploads require one audio file and one cover image."}
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
      {success && <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-green-700">{successMessage || "Upload successful!"}</div>}

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
              <li key={song.id} className="rounded border border-gray-200 p-3">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

                  <div className="flex flex-wrap items-center gap-3">
                    {song.audio_url ? (
                      <audio controls preload="none" className="h-8 w-64 max-w-full">
                        <source src={song.audio_url} />
                      </audio>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => startEditSong(song)}
                      className="rounded border border-blue-200 px-3 py-1 text-sm text-blue-700 hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSong(song.id)}
                      className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                      disabled={deletingSongId === song.id}
                    >
                      {deletingSongId === song.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>

                {editingSongId === song.id && (
                  <div className="mt-4 rounded border border-blue-100 bg-blue-50/40 p-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded border px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Genre</label>
                        <select
                          value={editGenre}
                          onChange={(e) => setEditGenre(e.target.value)}
                          className="w-full rounded border px-3 py-2"
                        >
                          <option value="" disabled>Select genre</option>
                          {GENRES.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">New Cover</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditCover(e.target.files?.[0] || null)}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void handleUpdateSong(song.id)}
                        className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                        disabled={savingSongId === song.id}
                      >
                        {savingSongId === song.id ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default UploadSongPage;