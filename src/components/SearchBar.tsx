"use client";

import { Search } from "lucide-react";
import { useRef } from "react";

interface SearchBarProps {
  placeholder?: string;
  centerText?: string;
}

export default function SearchBar({ placeholder = "Search here...", centerText = "Powered by NEAR AI" }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function showComingSoon() {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent("nearcity-show-coming-soon", { detail: { rect: { left: r.left, top: r.top, bottom: r.bottom, width: r.width } } }));
  }

  return (
    <div className="mt-8 flex justify-center">
      <div className="relative w-full max-w-2xl">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-600">
          <Search className="h-5 w-5" />
        </span>
        <input
          ref={inputRef}
          placeholder={placeholder}
          readOnly
          onClick={showComingSoon}
          onFocus={showComingSoon}
          className="w-full rounded-full border-2 border-purple-200 bg-white px-10 md:px-12 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-purple-400 cursor-pointer"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-purple-600 hidden md:inline-block">{centerText}</span>
      </div>
    </div>
  );
}
