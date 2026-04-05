const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
import { requestWithAuth } from "@/services/api/auth";

type ActionResponse = {
  success: boolean;
  message: string;
};

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
  return request<ActionResponse>("/api/v1/social/like", token, {
    song_id: songId,
  });
}

export async function unlikeSong(token: string, songId: number): Promise<ActionResponse> {
  return request<ActionResponse>("/api/v1/social/unlike", token, {
    song_id: songId,
  });
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
