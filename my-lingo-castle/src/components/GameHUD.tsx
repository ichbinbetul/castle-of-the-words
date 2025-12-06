"use client";

import { cn } from "../lib/utils";

export type GameHUDProps = {
  progress: number;
  hasKey: boolean;
  score: number;
};

const HOSTAGE_NAME = "Archivist of Shadows";

export function GameHUD({ progress, hasKey, score }: GameHUDProps) {
  const clampedProgress = Math.max(0, Math.min(progress, 10));

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3">
      <div className="pointer-events-auto flex w-full max-w-5xl items-center justify-between gap-4 rounded-full border border-castle-stone/80 bg-black/70 px-4 py-2 text-xs text-ghost-white/80 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
        {/* Quest */}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[10px] uppercase tracking-[0.26em] text-ghost-white/60">
            Quest
          </span>
          <span className="truncate text-[11px]">
            Objective: Rescue the{" "}
            <span className="text-ghost-white">{HOSTAGE_NAME}</span>{" "}
            <span className="text-ghost-white/60">
              (Progress: {clampedProgress}/10)
            </span>
          </span>
        </div>

        {/* Inventory */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.26em] text-ghost-white/60">
            Inventory
          </span>
          <div
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]",
              "border-castle-stone/80 bg-castle-stone/70",
              hasKey &&
                "border-mystic-gold/90 bg-castle-stone/90 text-mystic-gold shadow-[0_0_18px_rgba(255,215,0,0.75)]",
              !hasKey && "opacity-40",
            )}
          >
            <span className="text-base leading-none">🗝️</span>
            <span className="leading-none">Golden Key</span>
          </div>
        </div>

        {/* Score */}
        <div className="flex min-w-[90px] flex-col items-end">
          <span className="text-[10px] uppercase tracking-[0.26em] text-ghost-white/60">
            XP
          </span>
          <span className="text-[12px] font-semibold text-mystic-gold drop-shadow-[0_0_10px_rgba(255,215,0,0.7)]">
            {score}
          </span>
        </div>
      </div>
    </div>
  );
}


