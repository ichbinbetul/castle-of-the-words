"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";

const QUOTES = [
  "Knowledge is the key to the unknown.",
  "Every word learned is another stone in your fortress.",
  "Beyond this gate lies the language of legends.",
  "Those who seek understanding may enter.",
  "The bravest heroes speak in many tongues.",
];

export type CastleGateProps = {
  onEnter: () => void;
};

export function CastleGate({ onEnter }: CastleGateProps) {
  const [isOpening, setIsOpening] = useState(false);

  const quote = useMemo(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
    [],
  );

  const handleClick = useCallback(() => {
    if (isOpening) return;
    setIsOpening(true);

    const timer = setTimeout(() => {
      onEnter();
    }, 1500);

    return () => clearTimeout(timer);
  }, [isOpening, onEnter]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-10 text-center">
      <div className="max-w-2xl">
        <p className="font-heading text-lg text-mystic-gold drop-shadow-[0_0_12px_rgba(255,215,0,0.6)] sm:text-2xl">
          {quote}
        </p>
      </div>

      <div className="relative flex items-center justify-center">
        <motion.button
          type="button"
          onClick={handleClick}
          disabled={isOpening}
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{
            scale: isOpening ? 1.05 : 1,
            opacity: 1,
          }}
          whileHover={!isOpening ? { scale: 1.02 } : undefined}
          whileTap={!isOpening ? { scale: 0.98 } : undefined}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "group relative h-72 w-60 overflow-hidden rounded-[2.5rem] border-4 border-castle-stone/90",
            "bg-gradient-to-b from-[#3b2414] via-[#26140b] to-[#120a05]",
            "shadow-[0_0_45px_rgba(0,0,0,0.9)]",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mystic-gold/60 focus-visible:ring-offset-4 focus-visible:ring-offset-gothic-bg",
            isOpening && "cursor-default",
          )}
        >
          {/* Door texture + frame */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 opacity-30 mix-blend-overlay">
              <div className="h-full w-full bg-[radial-gradient(circle_at_0_0,#ffffff33,transparent_60%),repeating-linear-gradient(90deg,#3b2414_0,#3b2414_4px,#26140b_4px,#26140b_8px)]" />
            </div>
            <div className="absolute inset-3 rounded-[2rem] border border-black/60 shadow-inner" />
          </div>

          {/* Door panels */}
          <div className="relative flex h-full w-full items-center justify-center">
            <motion.div
              className="relative flex h-[82%] w-[80%] items-center justify-center gap-2"
              animate={{
                rotateY: isOpening ? -30 : 0,
                scaleX: isOpening ? 0.9 : 1,
                translateZ: isOpening ? 20 : 0,
              }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Left panel */}
              <motion.div
                className="relative h-full w-1/2 rounded-l-[1.5rem] border-r border-black/60 bg-gradient-to-b from-[#4a2d18] to-[#2b160a] shadow-[inset_-8px_0_16px_rgba(0,0,0,0.75)]"
                animate={{
                  translateX: isOpening ? "-45%" : "0%",
                  rotateY: isOpening ? 25 : 0,
                }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              >
                <div className="absolute inset-y-10 right-2 w-1 rounded-full bg-black/40" />
              </motion.div>

              {/* Right panel */}
              <motion.div
                className="relative h-full w-1/2 rounded-r-[1.5rem] border-l border-black/60 bg-gradient-to-b from-[#4a2d18] to-[#2b160a] shadow-[inset_8px_0_16px_rgba(0,0,0,0.75)]"
                animate={{
                  translateX: isOpening ? "45%" : "0%",
                  rotateY: isOpening ? -25 : 0,
                }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              >
                {/* Handle */}
                <div className="absolute inset-y-1/2 left-3 flex -translate-y-1/2 items-center">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-mystic-gold to-[#8b6b1a] shadow-[0_0_18px_rgba(255,215,0,0.8)]" />
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Label */}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <span className="rounded-full bg-black/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-ghost-white/80 backdrop-blur-sm">
              Tap to open
            </span>
          </div>
        </motion.button>
      </div>
    </div>
  );
}


