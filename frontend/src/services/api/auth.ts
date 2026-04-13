const API_BASE =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AUTH_CHANGED_EVENT = "listenism-auth-changed";
const ACCESS_TOKEN_KEY = "listenism_access_token";
const REFRESH_TOKEN_KEY = "listenism_refresh_token";

type JsonInit = RequestInit & {
  suppressAuthRefresh?: boolean;
};

type RefreshResponse = AuthResponse;

let refreshInFlight: Promise<string | null> | null = null;

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
  refresh_token: string;
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

async function requestRaw(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers || {}),
    },
  });
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  let detail = fallback;
  try {
    const data = await res.json();
    if (data?.detail) {
      detail = String(data.detail);
    }
  } catch {
    // ignore parse errors and keep fallback message
  }
  return detail;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const res = await requestRaw("/api/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        clearAccessToken();
        return null;
      }

      const tokens = (await res.json()) as RefreshResponse;
      setAuthTokens(tokens.access_token, tokens.refresh_token);
      return tokens.access_token;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

async function requestWithAuth<T>(path: string, token: string, init?: JsonInit): Promise<T> {
  const headers = {
    ...(init?.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
  });

  if (res.ok) {
    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }

  if (res.status === 401 && !init?.suppressAuthRefresh) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return requestWithAuth<T>(path, refreshedToken, {
        ...init,
        suppressAuthRefresh: true,
      });
    }
  }

  throw new Error(await parseErrorMessage(res, `Request failed with ${res.status}`));
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

export async function refresh(payload: { refresh_token: string }): Promise<AuthResponse> {
  return request<AuthResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function me(token: string): Promise<UserPublic> {
  return requestWithAuth<UserPublic>("/api/v1/auth/me", token, { method: "GET" });
}

export function setAccessToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

export function setRefreshToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
}

export function setAuthTokens(accessToken: string, refreshToken: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearAccessToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

export { AUTH_CHANGED_EVENT, requestWithAuth };
