const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

import { type Song } from "@/types/songs";
import { type Album } from "@/types/album";
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

export async function listRecommendedSongs(token: string, limit: number = 10): Promise<Song[]> {
  const response = await request<SongListResponse>(`/api/v1/music/songs/recommended?limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.items;
}

export async function listMySongs(token: string): Promise<Song[]> {
  const response = await request<SongListResponse>("/api/v1/music/songs/mine", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.items;
}

export async function deleteMySong(token: string, songId: number): Promise<void> {
  await request<void>(`/api/v1/music/songs/${songId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
