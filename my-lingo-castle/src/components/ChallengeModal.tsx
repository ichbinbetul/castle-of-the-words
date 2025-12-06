"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";

type QuestionType = "grammar" | "reading" | "speaking" | "listening" | "writing";

type Question = {
  id: string;
  type: QuestionType;
  duration: number;
  content: string;
  audioSrc?: string;
  answer: string;
};

export const MOCK_QUESTIONS: Question[] = [
  {
    id: "g-1",
    type: "grammar",
    duration: 20,
    content: "Fill in the blank: \"The ravens ___ over the old castle.\"",
    answer: "flew",
  },
  {
    id: "r-1",
    type: "reading",
    duration: 40,
    content:
      "The traveler stepped into the silent hall, where portraits whispered tales of forgotten kings. Every shadow seemed to lean closer, listening to the echo of his footsteps.",
    answer: "He walks through a silent hall filled with whispering portraits.",
  },
  {
    id: "w-1",
    type: "writing",
    duration: 60,
    content: "Describe the entrance to Dark Dialect Castle in one sentence.",
    answer: "Any", // We will treat any non-empty answer as success for writing.
  },
  {
    id: "l-1",
    type: "listening",
    duration: 45,
    content: "Listen carefully and write what you heard.",
    audioSrc: "/mock/audio/castle-bells.mp3",
    answer: "The castle bells ring at midnight.",
  },
  {
    id: "s-1",
    type: "speaking",
    duration: 30,
    content:
      "Hold to cast your spell and say: \"Open, in the tongue of shadows.\"",
    answer: "spell-cast",
  },
];

export type ChallengeModalProps = {
  onSuccess: () => void;
  onFail: () => void;
  level: string;
};

export function ChallengeModal({ onSuccess, onFail, level }: ChallengeModalProps) {
  const [resolved, setResolved] = useState<"success" | "fail" | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [speakingHolding, setSpeakingHolding] = useState(false);
  const [speakingProgress, setSpeakingProgress] = useState(0);

  const question = useMemo<Question>(() => {
    const index = Math.floor(Math.random() * MOCK_QUESTIONS.length);
    return MOCK_QUESTIONS[index];
  }, []);

  // Initialize timer when question loads
  useEffect(() => {
    setTimeLeft(question.duration);
  }, [question]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || resolved !== null) return;
    if (timeLeft <= 0) {
      setResolved("fail");
      onFail();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : prev));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, resolved, onFail]);

  // Handle generic answer submission
  const handleSubmit = useCallback(() => {
    if (resolved !== null) return;

    if (question.type === "writing" && userAnswer.trim().length > 0) {
      setResolved("success");
      onSuccess();
      return;
    }

    const normalizedUser = userAnswer.trim().toLowerCase();
    const normalizedAnswer = question.answer.trim().toLowerCase();

    if (normalizedUser !== "" && normalizedUser === normalizedAnswer) {
      setResolved("success");
      onSuccess();
    } else {
      setResolved("fail");
      onFail();
    }
  }, [onFail, onSuccess, question, resolved, userAnswer]);

  // Simulated speaking hold-to-cast: succeed if held for 3 seconds.
  useEffect(() => {
    if (!speakingHolding || resolved !== null || question.type !== "speaking") {
      return;
    }

    const start = Date.now();
    setSpeakingProgress(0);

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / 3000, 1);
      setSpeakingProgress(progress * 100);
      if (elapsed >= 3000) {
        clearInterval(interval);
        setSpeakingHolding(false);
        if (resolved === null) {
          setResolved("success");
          onSuccess();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [onSuccess, question.type, resolved, speakingHolding]);

  const timerRatio =
    timeLeft !== null && question.duration > 0
      ? Math.max(timeLeft, 0) / question.duration
      : 0;

  const renderBody = () => {
    switch (question.type) {
      case "grammar":
        return (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-ghost-white/80">
              {question.content}
            </p>
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="w-full rounded-lg border border-castle-stone bg-gothic-bg px-3 py-2 text-sm text-ghost-white placeholder:text-ghost-white/40 focus:border-mystic-gold focus:outline-none focus:ring-2 focus:ring-mystic-gold"
              placeholder="Type your answer..."
            />
          </div>
        );
      case "reading":
        return (
          <div className="space-y-4">
            <div className="max-h-40 overflow-y-auto rounded-xl border border-castle-stone/80 bg-black/40 p-3 text-sm leading-relaxed text-ghost-white/80">
              {question.content}
            </div>
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="h-24 w-full resize-none rounded-lg border border-castle-stone bg-gothic-bg px-3 py-2 text-sm text-ghost-white placeholder:text-ghost-white/40 focus:border-mystic-gold focus:outline-none focus:ring-2 focus:ring-mystic-gold"
              placeholder="Summarize what you read..."
            />
          </div>
        );
      case "writing":
        return (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-ghost-white/80">
              {question.content}
            </p>
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="h-32 w-full resize-none rounded-lg border border-castle-stone bg-gothic-bg px-3 py-2 text-sm text-ghost-white placeholder:text-ghost-white/40 focus:border-mystic-gold focus:outline-none focus:ring-2 focus:ring-mystic-gold"
              placeholder="Write your sentence..."
            />
            <p className="text-[11px] text-ghost-white/50">
              Any thoughtful sentence will satisfy the castle for now.
            </p>
          </div>
        );
      case "listening":
        return (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-ghost-white/80">
              {question.content}
            </p>
            <button
              type="button"
              onClick={() => setAudioPlayed(true)}
              className="inline-flex items-center gap-2 rounded-full border border-mystic-gold/80 bg-black/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-mystic-gold shadow-[0_0_16px_rgba(0,0,0,0.7)] transition hover:bg-mystic-gold hover:text-gothic-bg"
            >
              Play Audio
            </button>
            {audioPlayed && (
              <p className="text-[11px] text-ghost-white/60">
                The echo of distant bells rings in your mind...
              </p>
            )}
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="w-full rounded-lg border border-castle-stone bg-gothic-bg px-3 py-2 text-sm text-ghost-white placeholder:text-ghost-white/40 focus:border-mystic-gold focus:outline-none focus:ring-2 focus:ring-mystic-gold"
              placeholder="What did you hear?"
            />
          </div>
        );
      case "speaking":
        return (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-ghost-white/80">
              {question.content}
            </p>
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onMouseDown={() => setSpeakingHolding(true)}
                onMouseUp={() => setSpeakingHolding(false)}
                onMouseLeave={() => setSpeakingHolding(false)}
                onTouchStart={() => setSpeakingHolding(true)}
                onTouchEnd={() => setSpeakingHolding(false)}
                className={cn(
                  "relative inline-flex items-center justify-center rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.25em] transition",
                  "border border-mystic-gold/80 bg-black/70 text-mystic-gold",
                  "shadow-[0_0_20px_rgba(0,0,0,0.8)]",
                  speakingHolding &&
                    "bg-mystic-gold text-gothic-bg shadow-[0_0_26px_rgba(255,215,0,0.9)]",
                )}
              >
                Hold to Cast Spell
              </button>
              <div className="h-2 w-40 overflow-hidden rounded-full border border-castle-stone/80 bg-black/60">
                <div
                  className="h-full bg-mystic-gold transition-[width]"
                  style={{ width: `${speakingProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-ghost-white/60">
                Hold for 3 seconds to complete the incantation.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative w-full max-w-xl rounded-3xl border-2 border-mystic-gold bg-castle-stone/95 p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] sm:p-8"
      >
        {/* Ornamental corners */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-4 top-4 h-6 w-6 rounded-full border border-mystic-gold/40" />
          <div className="absolute right-4 top-4 h-6 w-6 rounded-full border border-mystic-gold/40" />
          <div className="absolute bottom-4 left-4 h-6 w-6 rounded-full border border-mystic-gold/40" />
          <div className="absolute bottom-4 right-4 h-6 w-6 rounded-full border border-mystic-gold/40" />
        </div>

        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ghost-white/60">
              Level {level}
            </p>
            <h2 className="mt-1 font-heading text-xl text-mystic-gold drop-shadow-[0_0_16px_rgba(255,215,0,0.8)]">
              {question.type.charAt(0).toUpperCase() + question.type.slice(1)}{" "}
              Challenge
            </h2>
          </div>

          {/* Timer badge */}
          <div className="flex flex-col items-end gap-1">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-mystic-gold/70 bg-black/60 text-xs font-semibold text-mystic-gold shadow-[0_0_18px_rgba(0,0,0,0.8)]">
              <span>{timeLeft !== null ? Math.max(timeLeft, 0) : "--"}</span>
              <div
                className="pointer-events-none absolute inset-[3px] rounded-full border border-mystic-gold/30 opacity-70"
                style={{
                  background: `conic-gradient(rgba(255,215,0,0.7) ${
                    timerRatio * 360
                  }deg, transparent 0deg)`,
                }}
              />
            </div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ghost-white/50">
              Time
            </p>
          </div>
        </header>

        <div className="space-y-6">
          {renderBody()}

          {question.type !== "speaking" && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (resolved !== null) return;
                  setResolved("fail");
                  onFail();
                }}
                className="rounded-full border border-blood-red/70 bg-black/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blood-red/80 transition hover:bg-blood-red hover:text-ghost-white"
              >
                Give Up
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-full border border-mystic-gold/80 bg-mystic-gold px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-gothic-bg shadow-[0_0_18px_rgba(255,215,0,0.8)] transition hover:translate-y-[1px] hover:shadow-[0_0_26px_rgba(255,215,0,0.95)]"
              >
                Cast Answer
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}


