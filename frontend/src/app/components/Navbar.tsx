"use client";

import { useEffect, useState } from "react";
import UnloginNav from "./navbar/UnloginNav";
import StudentNav from "./navbar/StudentNav";
import ArtistNav from "./navbar/ArtistNav";
import AdminNav from "./navbar/AdminNav";
import { AUTH_CHANGED_EVENT, clearAccessToken, getAccessToken, me, type UserPublic } from "@/services/api/auth";

export type UserRole = "unauthenticated" | "student" | "artist" | "admin";

interface NavbarProps {
  role?: UserRole;
}

export default function Navbar({ role = "unauthenticated" }: NavbarProps) {
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>(role);
  const [isLoading, setIsLoading] = useState<boolean>(role !== "unauthenticated");

  useEffect(() => {
    async function loadUser() {
      setIsLoading(true);
      const token = getAccessToken();
      if (!token) {
        setCurrentUser(null);
        setCurrentRole("unauthenticated");
        setIsLoading(false);
        return;
      }
      try {
        const user = await me(token);
        setCurrentUser(user);
        // Normalize backend role: "listener" maps to "student", keep others as-is
        let normalizedRole: UserRole = "student";
        if (user.role === "artist") {
          normalizedRole = "artist";
        } else if (user.role === "admin") {
          normalizedRole = "admin";
        }
        setCurrentRole(normalizedRole);
      } catch {
        clearAccessToken();
        setCurrentUser(null);
        setCurrentRole("unauthenticated");
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();

    const onAuthChanged = () => {
      void loadUser();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === "listenism_access_token") {
        void loadUser();
      }
    };

    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (isLoading) {
    return <div className="h-16 border-b border-transparent"></div>; // Placeholder while loading
  }

  // If component was passed a specific role prop that differs from unauthenticated,
  // we can use it to override (e.g. for testing)
  const effectiveRole = role !== "unauthenticated" ? role : currentRole;

  switch (effectiveRole) {
    case "student":
      return <StudentNav user={currentUser} />;
    case "artist":
      return <ArtistNav user={currentUser} />;
    case "admin":
      return <AdminNav user={currentUser} />;
    case "unauthenticated":
    default:
      return <UnloginNav />;
  }
}
