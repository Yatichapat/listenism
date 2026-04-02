"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { clearAccessToken, getAccessToken, me, type UserPublic } from "@/services/api/auth";

export default function AuthSessionCard() {
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
      });
  }, []);

  return (
    <div className="mt-8 rounded-2xl bg-white dark:bg-white/5 p-6 shadow-xl shadow-black/5 dark:shadow-none border border-transparent dark:border-white/10 backdrop-blur-md transition-colors duration-500">
      {status === "loading" ? (
        <p className="text-slate-500 dark:text-slate-400">Checking session...</p>
      ) : status === "authed" && user ? (
        <>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">Welcome, {user.display_name}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Signed in as {user.email}</p>
          <button
            onClick={() => {
              clearAccessToken();
              setUser(null);
              setStatus("guest");
            }}
            className="mt-4 rounded-full bg-slate-900 dark:bg-white px-6 py-2 text-sm font-medium text-white dark:text-slate-900 hover:scale-105 transition-transform"
          >
            Logout
          </button>
        </>
      ) : (
        <div className="flex gap-3">
          <Link href="/login" className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 hover:scale-105 transition-all shadow-lg shadow-blue-500/30">
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-slate-300 dark:border-slate-700 px-6 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            Register
          </Link>
        </div>
      )}
    </div>
  );
}
