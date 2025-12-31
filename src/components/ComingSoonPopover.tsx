"use client";

import { useEffect, useState } from "react";

interface Props {
  anchorRect: { left: number; top: number; bottom: number; width: number } | null;
  onClose: () => void;
  message?: string;
}

export default function ComingSoonPopover({ anchorRect, onClose, message = "Coming soon!!!" }: Props) {
  useEffect(() => {
    if (!anchorRect) {
      // clear variables
      document.documentElement.style.removeProperty("--nearcity-pop-left");
      document.documentElement.style.removeProperty("--nearcity-pop-top");
      return;
    }

    // Position the popover slightly below the anchor rect and center it
    const viewportWidth = window.innerWidth;
    const preferredLeft = anchorRect.left + anchorRect.width / 2;

    const popoverWidth = 220; // approximate
    let left = preferredLeft - popoverWidth / 2;
    left = Math.max(8, Math.min(left, viewportWidth - popoverWidth - 8));

    const top = anchorRect.bottom + 8;

    document.documentElement.style.setProperty("--nearcity-pop-left", `${left}px`);
    document.documentElement.style.setProperty("--nearcity-pop-top", `${top}px`);

    return () => {
      document.documentElement.style.removeProperty("--nearcity-pop-left");
      document.documentElement.style.removeProperty("--nearcity-pop-top");
    };
  }, [anchorRect]);

  // auto-dismiss after a short time
  useEffect(() => {
    if (!anchorRect) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [anchorRect, onClose]);

  if (!anchorRect) return null;

  return (
    <div className="fixed z-50 left-[var(--nearcity-pop-left)] top-[var(--nearcity-pop-top)]">
      <div className="bg-white border border-red-200 rounded-md px-4 py-2 shadow-md max-w-xs text-center">
        <div className="text-red-600 font-bold">{message}</div>
      </div>
    </div>
  );
}
