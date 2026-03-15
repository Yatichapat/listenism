"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { clearAccessToken, getAccessToken, me, type UserPublic } from "@/services/api/auth";

export default function Home() {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [status, setStatus] = useState<"loading" | "guest" | "authed">("loading");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setStatus("guest");
      return;
    }

    me(token)
      .then((profile) => {
        setUser(profile);
        setStatus("authed");
      })
      .catch(() => {
        clearAccessToken();
        setUser(null);
        setStatus("guest");
      })
      .finally(() => {
        if (!user) {
          setStatus((current) => (current === "loading" ? "guest" : current));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100">
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-12">
        <h1 className="text-4xl font-bold text-zinc-900">Listenism</h1>
        <p className="mt-3 text-zinc-600">University music platform with JWT auth integration.</p>

        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          {status === "loading" ? (
            <p className="text-zinc-500">Checking session...</p>
          ) : status === "authed" && user ? (
            <>
              <p className="text-lg font-semibold text-zinc-900">Welcome, {user.display_name}</p>
              <p className="mt-1 text-sm text-zinc-600">Signed in as {user.email}</p>
              <button
                onClick={() => {
                  clearAccessToken();
                  setUser(null);
                  setStatus("guest");
                }}
                className="mt-4 rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex gap-3">
              <Link href="/login" className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                Login
              </Link>
              <Link
                href="/register"
                className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
