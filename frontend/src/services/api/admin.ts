import { requestWithAuth } from "@/services/api/auth";

const API_BASE =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

export type SystemHealth = {
  status: string;
  env: string;
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

export async function getSystemHealth(token: string): Promise<SystemHealth> {
  const response = await fetch(`${API_BASE}/health`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load system health (${response.status})`);
  }

  return (await response.json()) as SystemHealth;
}
