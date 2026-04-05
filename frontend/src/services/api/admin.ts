import { requestWithAuth } from "@/services/api/auth";

export type AdminUser = {
  id: number;
  email: string;
  display_name: string;
  role: string;
  like_count: number;
  follower_count: number;
  created_at?: string | null;
};

export type SongReport = {
  id: number;
  song_id: number;
  song_title: string;
  reporter_id: number;
  reporter_email: string;
  reason?: string | null;
  created_at?: string | null;
};

export type UserReport = {
  id: number;
  reported_user_id: number;
  reported_user_email: string;
  reporter_id: number;
  reporter_email: string;
  reason?: string | null;
  created_at?: string | null;
};

type ListResponse<T> = {
  items: T[];
};

export async function listAllUsers(token: string): Promise<AdminUser[]> {
  const response = await requestWithAuth<ListResponse<AdminUser>>("/api/v1/auth/users", token, {
    method: "GET",
  });
  return response.items;
}

export async function listReportedSongs(token: string): Promise<SongReport[]> {
  const response = await requestWithAuth<ListResponse<SongReport>>("/api/v1/social/reports/songs", token, {
    method: "GET",
  });
  return response.items;
}

export async function listReportedUsers(token: string): Promise<UserReport[]> {
  const response = await requestWithAuth<ListResponse<UserReport>>("/api/v1/social/reports/users", token, {
    method: "GET",
  });
  return response.items;
}

export async function deleteSongAsAdmin(token: string, songId: number): Promise<void> {
  await requestWithAuth<void>(`/api/v1/music/songs/admin/${songId}`, token, {
    method: "DELETE",
  });
}

export async function deleteUserAsAdmin(token: string, userId: number): Promise<void> {
  await requestWithAuth<void>(`/api/v1/auth/users/${userId}`, token, {
    method: "DELETE",
  });
}
