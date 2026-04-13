"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

type Props = {
  initialQuery?: string;
};

export default function SearchInputUI({ initialQuery = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  // We don't read from searchParams constantly to avoid losing typing focus
  const [value, setValue] = useState(initialQuery);

  // Debounce the input and push to router
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (value.trim()) {
        params.set("q", value.trim());
      }
      // Replace URL without scrolling
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [value, pathname, router]);

  return (
    <div className="relative flex w-full max-w-3xl items-center mx-auto group">
      <Search className="pointer-events-none absolute left-5 h-5 w-5 text-zinc-500 transition-colors group-focus-within:text-white" />
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What do you want to listen to?"
        className="w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-14 pr-14 text-lg font-medium tracking-wide text-white placeholder-zinc-500 outline-none backdrop-blur-md transition-all focus:border-white/20 focus:bg-white/10 focus:ring-white/15"
      />
      {value && (
        <button 
          onClick={() => setValue("")} 
          className="absolute right-6 rounded-full p-1 text-zinc-500 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
