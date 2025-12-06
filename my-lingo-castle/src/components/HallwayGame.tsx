"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { ChallengeModal } from "./ChallengeModal";
import { GameHUD } from "./GameHUD";

export type HallwayGameProps = {
  selectedCharacter: string;
  onGameOver: () => void;
};

type SpeedMode = "walk" | "run";
type DoorKind = "mystery" | "cabinet" | "gate";

export function HallwayGame({ selectedCharacter, onGameOver }: HallwayGameProps) {
  const [speed, setSpeed] = useState<SpeedMode>("walk");
  const [isPaused, setIsPaused] = useState(false);
  const [doorKey, setDoorKey] = useState(0);
  const [doorInFlight, setDoorInFlight] = useState(false);
  const [doorAtFront, setDoorAtFront] = useState(false);
  const [incomingDoorKind, setIncomingDoorKind] = useState<DoorKind | null>(null);
  const [frontDoorKind, setFrontDoorKind] = useState<DoorKind | null>(null);
  const [showChallenge, setShowChallenge] = useState(false);
  const [score, setScore] = useState(0);
  const [gameProgress, setGameProgress] = useState(0);
  const [hasKey, setHasKey] = useState(false);
  const [doorUnlocking, setDoorUnlocking] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  // Randomly spawn encounters every few seconds while not paused.
  useEffect(() => {
    if (isPaused || doorInFlight || doorAtFront) return;

    const delay = 2500 + Math.random() * 3500;
    const timeout = setTimeout(() => {
      let kind: DoorKind = "mystery";

      if (gameProgress >= 10) {
        kind = "gate";
      } else if (Math.random() < 0.2) {
        kind = "cabinet";
      }

      setIncomingDoorKind(kind);
      setDoorInFlight(true);
      setDoorKey((k) => k + 1);
    }, delay);

    return () => clearTimeout(timeout);
  }, [isPaused, doorInFlight, doorAtFront, gameProgress]);

  const backgroundDuration = isPaused
    ? 9999
    : speed === "run"
    ? 6
    : 12;

  const handleChallengeSuccess = () => {
    setShowChallenge(false);
    setDoorUnlocking(true);

    setTimeout(() => {
      setDoorUnlocking(false);
      setDoorAtFront(false);
      setFrontDoorKind(null);
      setIsPaused(false);

      setGameProgress((p) => Math.min(p + 1, 10));
      setScore((s) => s + (frontDoorKind === "cabinet" ? 20 : 10));

      if (frontDoorKind === "cabinet") {
        setHasKey(true);
      }
    }, 800);
  };

  const handleChallengeFail = () => {
    setShowChallenge(false);
    setAccessDenied(true);
    setShakeKey((k) => k + 1);
    setTimeout(() => {
      setAccessDenied(false);
      setDoorAtFront(false);
      setFrontDoorKind(null);
      setIsPaused(false);
    }, 800);
  };

  const labelForFrontDoor =
    frontDoorKind === "cabinet"
      ? "Locked Cabinet"
      : frontDoorKind === "gate"
      ? "Dungeon Gate"
      : "Mystery Door";
  return (
    <div className="relative flex w-full flex-col items-center gap-8">
      <GameHUD progress={gameProgress} hasKey={hasKey} score={score} />

      <header className="flex w-full max-w-3xl items-center justify-between text-center text-sm text-ghost-white/70">
        <div className="flex-1 text-left text-[11px] uppercase tracking-[0.26em] text-ghost-white/50">
          Pace: <span className="text-ghost-white/80">{speed}</span>
        </div>
        <div className="flex-1 text-center">
          <h2 className="font-heading text-3xl text-mystic-gold drop-shadow-[0_0_14px_rgba(255,215,0,0.65)]">
            The Whispering Hallway
          </h2>
          <p className="mt-2 max-w-xl text-xs text-ghost-white/70">
            Walk or run through the endless corridor of Dark Dialect. Beware of
            the mystery doors that emerge from the shadows.
          </p>
        </div>
        <div className="flex-1 text-right text-[11px] uppercase tracking-[0.26em] text-ghost-white/50">
          Doors Cleared:{" "}
          <span className="text-mystic-gold drop-shadow-[0_0_10px_rgba(255,215,0,0.7)]">
            {score}
          </span>
        </div>
      </header>

      {/* Hallway viewport */}
      <div className="relative h-72 w-full max-w-3xl overflow-hidden rounded-3xl border border-castle-stone/80 bg-gradient-to-b from-[#020308] via-[#050817] to-[#050308] shadow-[0_0_40px_rgba(0,0,0,0.9)]">
        {/* Moving brick walls / floor */}
        <motion.div
          key={`${speed}-${isPaused}-bg`}
          className="pointer-events-none absolute inset-0"
          initial={{ backgroundPositionX: "0%" }}
          animate={{
            backgroundPositionX: isPaused ? "0%" : ["0%", "100%"],
          }}
          transition={{
            duration: backgroundDuration,
            ease: "linear",
            repeat: isPaused ? 0 : Infinity,
          }}
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, #151726 0, #151726 40px, #0c0d18 40px, #0c0d18 80px), linear-gradient(to bottom, #050715, #020309)",
            backgroundSize: "160px 100%, 100% 100%",
          }}
        />

        {/* Perspective floor */}
        <div className="pointer-events-none absolute inset-x-[-20%] bottom-[-40%] h-[140%] origin-top bg-[radial-gradient(circle_at_50%_0%,#3b3b55_0,#050309_60%)] opacity-70 blur-[1px]" />

        {/* Central vanishing point glow */}
        <div className="pointer-events-none absolute inset-x-1/2 top-8 h-10 w-10 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#c4b5fd,transparent_70%)] opacity-50" />

        {/* Incoming encounter */}
        {doorInFlight && !doorAtFront && (
          <motion.div
            key={doorKey}
            initial={{ scale: 0.2, opacity: 0, y: -120 }}
            animate={{ scale: 1.1, opacity: 1, y: 10 }}
            transition={{ duration: 1.6, ease: "easeIn" }}
            onAnimationComplete={() => {
              setDoorInFlight(false);
              setDoorAtFront(true);
              setFrontDoorKind(incomingDoorKind);
              setIncomingDoorKind(null);
              setIsPaused(true);

              if (incomingDoorKind === "gate") {
                if (hasKey) {
                  // Player has the key: open the final gate and end the run (victory placeholder).
                  setDoorUnlocking(true);
                  setTimeout(() => {
                    setDoorUnlocking(false);
                    onGameOver();
                  }, 900);
                } else {
                  // Locked gate without key: shake and send the player back to the hallway.
                  setAccessDenied(true);
                  setShakeKey((k) => k + 1);
                  setTimeout(() => {
                    setAccessDenied(false);
                    setDoorAtFront(false);
                    setFrontDoorKind(null);
                    setIsPaused(false);
                  }, 900);
                }
              } else {
                setShowChallenge(true);
              }
            }}
            className="absolute inset-x-0 top-10 mx-auto h-32 w-24 rounded-2xl border-2 border-mystic-gold bg-gradient-to-b from-[#3b2b40] to-[#120613] shadow-[0_0_28px_rgba(0,0,0,0.9)]"
          >
            <div className="absolute inset-2 rounded-xl border border-black/60 bg-gradient-to-b from-[#4b3550] to-[#1a091c]" />
            <div className="absolute inset-x-6 bottom-4 h-3 rounded-full bg-mystic-gold/70" />
          </motion.div>
        )}

        {/* Door right in front of the player */}
        {doorAtFront && (
          <motion.div
            key={shakeKey}
            animate={
              doorUnlocking
                ? { scale: 1.1, opacity: 0, y: -40 }
                : accessDenied
                ? { x: [0, -10, 10, -8, 8, -4, 4, 0] }
                : { x: 0, scale: 1, opacity: 1 }
            }
            transition={{
              duration: 0.7,
              ease: "easeInOut",
            }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          >
            <div
              className={cn(
                "rounded-3xl border-2 border-mystic-gold shadow-[0_0_40px_rgba(0,0,0,0.95)]",
                frontDoorKind === "gate"
                  ? "h-48 w-40 bg-gradient-to-b from-[#202233] via-[#101120] to-[#05050b]"
                  : frontDoorKind === "cabinet"
                  ? "h-32 w-40 bg-gradient-to-b from-[#4b3418] via-[#2b1d0c] to-[#120a04]"
                  : "h-40 w-32 bg-gradient-to-b from-[#4a2f3f] via-[#2a131d] to-[#0b0509]",
              )}
            >
              <div
                className={cn(
                  "m-3 rounded-2xl border border-black/70",
                  frontDoorKind === "cabinet"
                    ? "bg-gradient-to-b from-[#6b4a26] to-[#2f1f0d]"
                    : "bg-gradient-to-b from-[#5b3b4e] to-[#1e0b16]",
                )}
              />
              <div className="mx-auto mt-[-18px] flex items-center justify-center gap-1">
                {frontDoorKind === "cabinet" && (
                  <span className="text-lg">🗄️</span>
                )}
                {frontDoorKind === "gate" && (
                  <span className="text-xl">⛓️</span>
                )}
                <div className="h-4 w-16 rounded-full bg-mystic-gold/80 shadow-[0_0_20px_rgba(255,215,0,0.75)]" />
              </div>
            </div>
            <p className="rounded-full bg-black/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-mystic-gold">
              {labelForFrontDoor}
            </p>
            {frontDoorKind === "gate" && !hasKey && (
              <p className="max-w-xs text-[11px] text-ghost-white/70">
                The gate is sealed by an ancient lock. You sense it will only
                yield to a Golden Key hidden somewhere in the corridors.
              </p>
            )}
            <button
              type="button"
              onClick={onGameOver}
              className="text-xs text-ghost-white/50 underline-offset-4 hover:text-mystic-gold hover:underline"
            >
              End run (temporary)
            </button>
          </motion.div>
        )}

        {/* Avatar at bottom center */}
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
          <motion.div
            animate={isPaused ? { y: 0 } : { y: [0, -12, 0] }}
            transition={{
              duration: 0.7,
              repeat: isPaused ? 0 : Infinity,
              ease: "easeInOut",
            }}
            className="flex h-36 w-36 items-center justify-center rounded-[2.5rem] border-4 border-mystic-gold bg-castle-stone/90 shadow-[0_20px_30px_-10px_rgba(0,0,0,0.8)]"
          >
            <div className="flex h-[85%] w-[85%] items-center justify-center rounded-[2rem] border border-mystic-gold/60 bg-gradient-to-b from-[#1f1c2c] via-[#151324] to-[#0b0a14]">
              <span className="text-[100px] leading-none drop-shadow-[0_0_18px_rgba(0,0,0,0.75)]">
                {selectedCharacter}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
        <span className="text-xs uppercase tracking-[0.28em] text-ghost-white/60">
          Pace
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setSpeed("walk");
              if (!doorAtFront) setIsPaused(false);
            }}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold tracking-wide transition",
              "border border-castle-stone/80 bg-castle-stone/70 text-ghost-white/80",
              "hover:border-mystic-gold/70 hover:text-mystic-gold",
              speed === "walk" &&
                "border-mystic-gold/90 text-mystic-gold shadow-[0_0_18px_rgba(255,215,0,0.7)]",
            )}
          >
            Walk
          </button>
          <button
            type="button"
            onClick={() => {
              setSpeed("run");
              if (!doorAtFront) setIsPaused(false);
            }}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold tracking-wide transition",
              "border border-castle-stone/80 bg-castle-stone/70 text-ghost-white/80",
              "hover:border-mystic-gold/70 hover:text-mystic-gold",
              speed === "run" &&
                "border-mystic-gold/90 text-mystic-gold shadow-[0_0_18px_rgba(255,215,0,0.7)]",
            )}
          >
            Run
          </button>
        </div>
      </div>

      {showChallenge && (
        <ChallengeModal
          level="I"
          onSuccess={handleChallengeSuccess}
          onFail={handleChallengeFail}
        />
      )}
    </div>
  );
}

