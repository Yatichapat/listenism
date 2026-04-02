const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AUTH_CHANGED_EVENT = "listenism-auth-changed";

export type UserPublic = {
  id: number;
  email: string;
  display_name: string;
  role?: string;
  like_count?: number;
  follower_count?: number;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  display_name: string;
  role?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
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

  return (await res.json()) as T;
}

export async function register(payload: RegisterPayload): Promise<UserPublic> {
  return request<UserPublic>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function me(token: string): Promise<UserPublic> {
  return request<UserPublic>("/api/v1/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function setAccessToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("listenism_access_token", token);
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("listenism_access_token");
}

export function clearAccessToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("listenism_access_token");
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

export { AUTH_CHANGED_EVENT };
