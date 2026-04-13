const API_BASE =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

import { requestWithAuth } from "@/services/api/auth";
import { type Song } from "@/types/songs";
import { type Album, type AlbumDetail } from "@/types/album";
import { type Artist } from "@/types/artist";

type SongListResponse = {
  items: Song[];
};

type AlbumListResponse = {
  items: Album[];
};

type ArtistListResponse = {
  items: Artist[];
};

type SearchResultsResponse = {
  query: string;
  songs: Song[];
  albums: Album[];
  artists: Artist[];
};

export type PlaylistSong = Song & {
  position: number;
};

export type Playlist = {
  id: number;
  user_id: number;
  name: string;
  created_at?: string | null;
  songs: PlaylistSong[];
};

type PlaylistListResponse = {
  items: Playlist[];
};

export type ArtistSongAnalytics = {
  id: number;
  title: string;
  genre: string | null;
  play_count: number;
  like_count: number;
};

export type ArtistAnalytics = {
  artist_id: number;
  artist_name: string;
  follower_count: number;
  total_songs: number;
  total_plays: number;
  top_songs: ArtistSongAnalytics[];
};

type RecommendationItem = {
  song_id: number;
  score: number;
};

type RecommendationResponse = {
  user_id: number;
  items: RecommendationItem[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = `Request failed with ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) {
        detail = String(data.detail);
      }
    } catch {
      // ignore parse errors and keep default message
    }
    throw new Error(detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export async function listSongs(): Promise<Song[]> {
  const response = await request<SongListResponse>("/api/v1/music/songs", {
    method: "GET",
  });
  return response.items;
}

export async function listNewestSongs(limit: number = 10): Promise<Song[]> {
  const response = await request<SongListResponse>(`/api/v1/music/songs/newest?limit=${limit}`, {
    method: "GET",
  });
  return response.items;
}

export async function listHotSongs(limit: number = 10): Promise<Song[]> {
  const response = await request<SongListResponse>(`/api/v1/music/songs/hot?limit=${limit}`, {
    method: "GET",
  });
  return response.items;
}

export async function listNewestAlbums(limit: number = 10): Promise<Album[]> {
  const response = await request<AlbumListResponse>(`/api/v1/music/albums/newest?limit=${limit}`, {
    method: "GET",
  });
  return response.items;
}

export async function getAlbumById(albumId: number): Promise<AlbumDetail> {
  return await request<AlbumDetail>(`/api/v1/music/albums/${albumId}`, {
    method: "GET",
  });
}

export async function listHotArtists(limit: number = 10): Promise<Artist[]> {
  const response = await request<ArtistListResponse>(`/api/v1/music/artists/hot?limit=${limit}`, {
    method: "GET",
  });
  return response.items;
}

export async function listNewestArtists(limit: number = 10): Promise<Artist[]> {
  const response = await request<ArtistListResponse>(`/api/v1/music/artists/newest?limit=${limit}`, {
    method: "GET",
  });
  return response.items;
}

export async function searchMusic(query: string, limit: number = 10): Promise<SearchResultsResponse> {
  const encodedQuery = encodeURIComponent(query.trim());
  return await request<SearchResultsResponse>(`/api/v1/music/search?q=${encodedQuery}&limit=${limit}`, {
    method: "GET",
  });
}

export async function listRecommendedSongs(token: string, limit: number = 10): Promise<Song[]> {
  const response = await requestWithAuth<SongListResponse>(`/api/v1/music/songs/recommended?limit=${limit}`, token, {
    method: "GET",
  });
  return response.items;
}

export async function listFollowingFeedSongs(token: string, limit: number = 20): Promise<Song[]> {
  const response = await requestWithAuth<SongListResponse>(`/api/v1/music/songs/feed?limit=${limit}`, token, {
    method: "GET",
  });
  return response.items;
}

export async function listGenreFallbackSongs(token: string, limit: number = 10): Promise<Song[]> {
  const response = await requestWithAuth<SongListResponse>(`/api/v1/music/songs/fallback/genre?limit=${limit}`, token, {
    method: "GET",
  });
  return response.items;
}

export async function listAIRecommendedSongs(token: string, limit: number = 10): Promise<Song[]> {
  const response = await requestWithAuth<RecommendationResponse>(`/api/v1/recommendation/for-you?limit=${limit}`, token, {
    method: "GET",
  });

  const rankedSongIds = (response.items || []).map((item) => item.song_id);
  if (rankedSongIds.length === 0) {
    return [];
  }

  const songs = await listSongs();
  const byId = new Map<number, Song>(songs.map((song) => [song.id, song]));

  const rankedSongs: Song[] = [];
  for (const songId of rankedSongIds) {
    const song = byId.get(songId);
    if (song) {
      rankedSongs.push(song);
    }
    if (rankedSongs.length >= limit) {
      break;
    }
  }

  return rankedSongs;
}

export async function recordSongListen(token: string, songId: number): Promise<void> {
  await requestWithAuth<{ message: string }>(`/api/v1/music/songs/${songId}/listen`, token, {
    method: "POST",
  });
}

export async function updateMySong(
  token: string,
  songId: number,
  formData: FormData,
): Promise<Song> {
  return requestWithAuth<Song>(`/api/v1/music/songs/${songId}`, token, {
    method: "PATCH",
    body: formData,
  });
}

export async function getArtistAnalytics(token: string): Promise<ArtistAnalytics> {
  return requestWithAuth<ArtistAnalytics>("/api/v1/music/analytics/artist", token, {
    method: "GET",
  });
}

export async function listMySongs(token: string): Promise<Song[]> {
  const response = await requestWithAuth<SongListResponse>("/api/v1/music/songs/mine", token, {
    method: "GET",
  });
  return response.items;
}

export async function listLikedSongs(token: string): Promise<Song[]> {
  const response = await requestWithAuth<SongListResponse>("/api/v1/music/songs/liked", token, {
    method: "GET",
  });
  return response.items;
}

export async function createPlaylist(token: string, name: string): Promise<Playlist> {
  return requestWithAuth<Playlist>("/api/v1/music/playlists", token, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function listPlaylists(token: string): Promise<Playlist[]> {
  const response = await requestWithAuth<PlaylistListResponse>("/api/v1/music/playlists", token, {
    method: "GET",
  });
  return response.items;
}

export async function renamePlaylist(token: string, playlistId: number, name: string): Promise<Playlist> {
  return requestWithAuth<Playlist>(`/api/v1/music/playlists/${playlistId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function deletePlaylist(token: string, playlistId: number): Promise<void> {
  await requestWithAuth<void>(`/api/v1/music/playlists/${playlistId}`, token, {
    method: "DELETE",
  });
}

export async function addSongToPlaylist(token: string, playlistId: number, songId: number): Promise<Playlist> {
  return requestWithAuth<Playlist>(`/api/v1/music/playlists/${playlistId}/songs`, token, {
    method: "POST",
    body: JSON.stringify({ song_id: songId }),
  });
}

export async function removeSongFromPlaylist(token: string, playlistId: number, songId: number): Promise<Playlist> {
  return requestWithAuth<Playlist>(`/api/v1/music/playlists/${playlistId}/songs/${songId}`, token, {
    method: "DELETE",
  });
}

export async function deleteMySong(token: string, songId: number): Promise<void> {
  await requestWithAuth<void>(`/api/v1/music/songs/${songId}`, token, {
    method: "DELETE",
  });
}

export type UploadMode = "single" | "album";

export async function uploadArtistSongs(
  token: string,
  formData: FormData,
): Promise<Song[]> {
  const res = await requestWithAuth<SongListResponse>("/api/v1/music/songs/upload", token, {
    method: "POST",
    body: formData,
  });
  return res.items;
}
