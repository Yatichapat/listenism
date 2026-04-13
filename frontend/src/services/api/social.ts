const API_BASE =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
import { requestWithAuth } from "@/services/api/auth";

const LIKED_SONGS_CHANGED_EVENT = "listenism-liked-songs-changed";
const LIKED_SONG_IDS_STORAGE_KEY = "listenism-liked-song-ids";

type ActionResponse = {
  success: boolean;
  message: string;
};

export type CommentItem = {
  id: number;
  song_id: number;
  user_id: number;
  user_name: string;
  content: string;
  created_at?: string | null;
};

type CommentListResponse = {
  items: CommentItem[];
};

function readLikedSongIdsFromStorage(): number[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(LIKED_SONG_IDS_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is number => Number.isFinite(value));
  } catch {
    return [];
  }
}

function writeLikedSongIdsToStorage(songIds: number[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LIKED_SONG_IDS_STORAGE_KEY, JSON.stringify(songIds));
}

export function isSongLikedInStorage(songId: number): boolean {
  return readLikedSongIdsFromStorage().includes(songId);
}

export function markSongAsLiked(songId: number): void {
  const nextSongIds = new Set(readLikedSongIdsFromStorage());
  nextSongIds.add(songId);
  writeLikedSongIdsToStorage(Array.from(nextSongIds));
}

export function markSongAsUnliked(songId: number): void {
  const nextSongIds = new Set(readLikedSongIdsFromStorage());
  nextSongIds.delete(songId);
  writeLikedSongIdsToStorage(Array.from(nextSongIds));
}

async function request<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await requestWithAuth<T>(path, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res;
}

export async function reportSong(token: string, songId: number, reason?: string): Promise<ActionResponse> {
  return request<ActionResponse>("/api/v1/social/report/song", token, {
    song_id: songId,
    reason: reason || "Reported by user",
  });
}

export async function likeSong(token: string, songId: number): Promise<ActionResponse> {
  const response = await request<ActionResponse>("/api/v1/social/like", token, {
    song_id: songId,
  });
  markSongAsLiked(songId);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LIKED_SONGS_CHANGED_EVENT));
  }
  return response;
}

export async function unlikeSong(token: string, songId: number): Promise<ActionResponse> {
  const response = await request<ActionResponse>("/api/v1/social/unlike", token, {
    song_id: songId,
  });
  markSongAsUnliked(songId);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LIKED_SONGS_CHANGED_EVENT));
  }
  return response;
}

export async function commentSong(token: string, songId: number, content: string): Promise<ActionResponse> {
  return request<ActionResponse>("/api/v1/social/comment", token, {
    song_id: songId,
    content,
  });
}

export async function updateComment(token: string, commentId: number, content: string): Promise<ActionResponse> {
  return requestWithAuth<ActionResponse>(`/api/v1/social/comment/${commentId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

export async function deleteComment(token: string, commentId: number): Promise<ActionResponse> {
  return requestWithAuth<ActionResponse>(`/api/v1/social/comment/${commentId}`, token, {
    method: "DELETE",
  });
}

export async function listComments(songId: number): Promise<CommentItem[]> {
  const res = await fetch(`${API_BASE}/api/v1/social/comments?song_id=${songId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
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

  const data = (await res.json()) as CommentListResponse;
  return data.items;
}

export async function followArtist(token: string, artistId: number): Promise<ActionResponse> {
  return request<ActionResponse>("/api/v1/social/follow", token, {
    artist_id: artistId,
  });
}

export async function unfollowArtist(token: string, artistId: number): Promise<ActionResponse> {
  return request<ActionResponse>("/api/v1/social/unfollow", token, {
    artist_id: artistId,
  });
}

export async function reportUser(token: string, userId: number, reason?: string): Promise<ActionResponse> {
  return request<ActionResponse>("/api/v1/social/report/user", token, {
    user_id: userId,
    reason: reason || "Reported by user",
  });
}
