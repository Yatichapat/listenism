"use client";
import React, { useEffect, useState } from "react";
import { getAccessToken, me } from "@/services/api/auth";
import { deleteMySong, listMySongs, updateMySong, uploadArtistSongs, type UploadMode } from "@/services/api/music";
import { type Song } from "@/types/songs";
import { RefreshCcw } from 'lucide-react';

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
    <div className="mx-auto max-w-4xl p-8 text-white">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Artist Studio</h1>
          <p className="text-sm text-zinc-400">{artistName ? `Signed in as ${artistName}` : "Manage your songs"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadArtistData()}
            className="rounded px-3 py-2 text-sm text-zinc-300 border border-white/10 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={songsLoading}
            aria-label="Refresh songs"
          >
            {songsLoading ? "Refreshing..." : <RefreshCcw className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddForm((prev) => !prev);
              setSuccess(false);
              setSuccessMessage("");
              setError("");
            }}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {showAddForm ? "Close" : "+ Add Song"}
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-lg border border-white/10 bg-white/5 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-white">Upload Song</h2>

          <div className="group relative w-full overflow-hidden rounded-xl border-2 border-dashed border-white/20 bg-black/20 transition-all hover:border-blue-400/50">
            {coverImage ? (
              <div className="relative w-full overflow-hidden bg-black/40">
                <img 
                  src={URL.createObjectURL(coverImage)} 
                  alt="Cover preview" 
                  className="w-full max-h-[400px] object-contain opacity-80 transition-opacity group-hover:opacity-100" 
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity bg-black/50 group-hover:opacity-100 backdrop-blur-sm">
                   <input
                     type="file"
                     accept="image/*"
                     onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                     className="absolute inset-0 cursor-pointer opacity-0 text-[0px]"
                     title="Change cover"
                   />
                   <span className="rounded-full bg-blue-600 px-6 py-2 font-bold text-white shadow-lg pointer-events-none">Change Cover</span>
                </div>
              </div>
            ) : (
              <div className="relative flex aspect-video md:aspect-[3/1] w-full flex-col items-center justify-center p-6 text-center hover:bg-white/5 transition-all">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                  className="absolute inset-0 cursor-pointer opacity-0 text-[0px]"
                />
                <div className="pointer-events-none flex flex-col items-center gap-2">
                  <div className="rounded-full bg-blue-500/20 px-6 py-3 text-lg text-blue-400 font-bold shadow-sm">
                    + Upload Cover Art
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    {uploadMode === "album" ? "Album Cover" : "Song Cover"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Show your visual identity at the top
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex w-full rounded border border-white/10 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => {
                  if (uploadMode === "single") return;
                  setUploadMode("single");
                  setSuccess(false);
                  setSuccessMessage("");
                  setError("");
                  setTitle("");
                  setAlbumTitle("");
                  setCoverImage(null);
                  setSingleAudio(null);
                  setAlbumTracks([]);
                }}
                className={`flex-1 rounded py-2 text-sm font-medium transition-all ${uploadMode === "single"
                    ? "bg-blue-400 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                  }`}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => {
                  if (uploadMode === "album") return;
                  setUploadMode("album");
                  setSuccess(false);
                  setSuccessMessage("");
                  setError("");
                  setTitle("");
                  setAlbumTitle("");
                  setCoverImage(null);
                  setSingleAudio(null);
                  setAlbumTracks([]);
                }}
                className={`flex-1 rounded py-2 text-sm font-medium transition-all ${uploadMode === "album"
                    ? "bg-blue-400 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                  }`}
              >
                Album
              </button>
            </div>
          </div>

          {uploadMode === "single" ? (
            <div>
              <label className="mb-1 block font-medium text-zinc-300">Song Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded border border-white/10 bg-black/20 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block font-medium text-zinc-300">Album Title</label>
              <input
                type="text"
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                className="w-full rounded border border-white/10 bg-black/20 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1 block font-medium text-zinc-300">Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="h-10 w-full rounded border border-white/10 bg-black/20 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="" disabled className="bg-zinc-900">Select genre</option>
              {GENRES.map((g) => (
                <option key={g} value={g} className="bg-zinc-900">{g}</option>
              ))}
            </select>
          </div>


          <div>
            <label className="mb-1 block font-medium text-zinc-300">{uploadMode === "album" ? "Audio Files" : "Audio File"}</label>
            {uploadMode === "album" ? (
              <div className="space-y-3">
                <div className="relative flex w-full items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-black/20 p-4 transition-all hover:bg-white/5 hover:border-purple-400/50">
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
                    className="w-full text-zinc-400 file:cursor-pointer file:mr-4 file:rounded-full file:border-0 file:bg-purple-500/20 file:px-5 file:py-2 file:text-sm file:font-bold file:text-purple-300 transition-all hover:file:bg-purple-500/30"
                  />
                </div>

                {albumTracks.length > 0 && (
                  <div className="space-y-3 rounded border border-white/10 bg-black/20 p-3">
                    <p className="text-sm font-medium text-zinc-300">Track titles</p>
                    {albumTracks.map((track, index) => (
                      <div key={`${track.file.name}-${index}`} className="grid gap-2 md:grid-cols-[1fr_2fr] md:items-center">
                        <div className="truncate text-sm text-zinc-400">{track.file.name}</div>
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
                          className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
                          placeholder="Track title"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative flex w-full items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-black/20 p-4 transition-all hover:bg-white/5 hover:border-purple-400/50">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setSingleAudio(e.target.files?.[0] || null)}
                  className="w-full text-zinc-400 file:cursor-pointer file:mr-4 file:rounded-full file:border-0 file:bg-purple-500/20 file:px-5 file:py-2 file:text-sm file:font-bold file:text-purple-300 transition-all hover:file:bg-purple-500/30"
                />
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-500">
            {uploadMode === "album"
              ? "Album uploads let you choose many audio files with one shared cover image. You can edit each track title before uploading."
              : "Single uploads require one audio file and one cover image."}
          </p>

          <button
            type="submit"
            className="w-full border border-white/20 rounded px-6 py-2 font-medium bg-white/10 text-blue/30 transition hover:bg-blue-400 hover:text-white disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload Song"}
          </button>
        </form>
      )}

      {error && <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-red-400">{error}</div>}
      {success && <div className="mb-4 rounded border border-green-500/30 bg-green-500/10 p-3 text-green-400">{successMessage || "Upload successful!"}</div>}

      {songsLoading && <p className="text-sm text-zinc-400">Loading your songs...</p>}
      {!songsLoading && mySongs.length === 0 && (
        <p className="text-sm text-zinc-400">No songs uploaded yet. Click Add Song to upload your first track.</p>
      )}
      {!songsLoading && mySongs.length > 0 && (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {mySongs.map((song) => (
            <li key={song.id} className="group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 hover:shadow-xl backdrop-blur-sm">
              {song.cover_url ? (
                <div className="relative aspect-square w-full overflow-hidden">
                  <img src={song.cover_url} alt={song.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
              ) : (
                <div className="relative aspect-square w-full flex items-center justify-center bg-white/5 text-sm text-zinc-500">
                  No cover
                </div>
              )}
              
              <div className="flex flex-col p-4 flex-1">
                <div className="mb-4">
                  <p className="font-bold text-lg text-white truncate">{song.title}</p>
                  <p className="text-sm text-zinc-400">{song.genre || "Unknown genre"}</p>
                </div>

                <div className="mt-auto flex flex-col gap-3">
                  {song.audio_url && (
                    <audio controls preload="none" className="h-8 w-full outline-none">
                      <source src={song.audio_url} />
                    </audio>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => startEditSong(song)}
                      className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSong(song.id)}
                      className="rounded bg-red-500/20 border border-red-500/30 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/80 hover:text-white hover:border-red-500 disabled:opacity-50"
                      disabled={deletingSongId === song.id}
                    >
                      {deletingSongId === song.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>

              {editingSongId === song.id && (
                <div className="absolute inset-x-0 bottom-0 top-0 z-10 flex flex-col justify-center overflow-y-auto bg-black/95 p-4 backdrop-blur-md">
                  <h4 className="mb-4 text-center font-bold text-white text-lg">Edit Song</h4>
                  
                  <label className="mb-1 block text-sm font-medium text-zinc-300">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mb-3 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  
                  <label className="mb-1 block text-sm font-medium text-zinc-300">Genre</label>
                  <select
                    value={editGenre}
                    onChange={(e) => setEditGenre(e.target.value)}
                    className="mb-3 w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                     <option value="" disabled className="bg-zinc-900">Select genre</option>
                     {GENRES.map((g) => <option key={g} value={g} className="bg-zinc-900">{g}</option>)}
                  </select>
                  
                  <label className="mb-1 block text-sm font-medium text-zinc-300">New Cover</label>
                  <div className="relative mb-6 flex w-full items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/20 p-2 transition-all hover:bg-white/5 hover:border-blue-400/50">
                    <input
                       type="file" accept="image/*" onChange={(e) => setEditCover(e.target.files?.[0] || null)}
                       className="w-full text-zinc-400 file:cursor-pointer file:mr-2 file:rounded file:border-0 file:bg-blue-500/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-300 transition-all hover:file:bg-blue-500/30"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 mt-auto">
                    <button type="button" onClick={() => void handleUpdateSong(song.id)} className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/25" disabled={savingSongId === song.id}>
                      {savingSongId === song.id ? "Saving..." : "Save"}
                    </button>
                    <button type="button" onClick={cancelEdit} className="flex-1 rounded border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UploadSongPage;