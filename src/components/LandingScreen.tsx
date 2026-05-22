"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Mood, Gender, GenderPreference } from "@/app/page";

const moods: { value: Mood; label: string; emoji: string }[] = [
  { value: "walking", label: "Walking", emoji: "🚶" },
  { value: "bored", label: "Bored", emoji: "😶" },
  { value: "studying", label: "Studying", emoji: "📖" },
  { value: "late-night", label: "Late night thoughts", emoji: "🌙" },
  { value: "coffee", label: "Coffee?", emoji: "☕" },
  { value: "trekking", label: "Trekking", emoji: "⛰️" },
];

const genders: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const preferences: { value: GenderPreference; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "anyone", label: "Anyone" },
];

interface Props {
  onStart: (
    mood: Mood,
    gender: Gender,
    preference: GenderPreference
  ) => void;
  onRequestLocation: () => void;
  locationGranted: boolean;
  geoError: string | null;
  onlineCount: number;
}

export function LandingScreen({
  onStart,
  onRequestLocation,
  locationGranted,
  geoError,
  onlineCount,
}: Props) {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [selectedPreference, setSelectedPreference] =
    useState<GenderPreference | null>(null);
  const [step, setStep] = useState<"intro" | "gender" | "mood">("intro");

  const handleLocationClick = async () => {
    await onRequestLocation();
    setStep("gender");
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {step === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center text-center max-w-sm"
          >
            <motion.div
              className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-8"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-3 h-3 rounded-full bg-accent" />
            </motion.div>

            <h1 className="text-3xl font-light tracking-tight text-text-primary mb-3">
              whispr
            </h1>
            <p className="text-text-secondary text-base leading-relaxed mb-10">
              Talk to someone nearby.
              <br />
              Anonymous. Ephemeral. Local.
            </p>

            {onlineCount > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-text-muted text-sm mb-8"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                {onlineCount} {onlineCount === 1 ? "person" : "people"} nearby
              </motion.p>
            )}

            {!locationGranted && (
              <button
                onClick={handleLocationClick}
                className="glass px-8 py-3.5 rounded-2xl text-text-primary text-sm font-medium
                         hover:bg-white/[0.04] transition-all duration-300 active:scale-[0.97]"
              >
                Enable location to start
              </button>
            )}

            {locationGranted && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setStep("gender")}
                className="bg-accent/90 hover:bg-accent px-8 py-3.5 rounded-2xl text-white text-sm font-medium
                         transition-all duration-300 active:scale-[0.97] shadow-lg shadow-accent/20"
              >
                Find someone
              </motion.button>
            )}

            {geoError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400/80 text-xs mt-4 max-w-xs"
              >
                {geoError}
              </motion.p>
            )}
          </motion.div>
        )}

        {step === "gender" && (
          <motion.div
            key="gender"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center text-center max-w-sm"
          >
            <p className="text-text-secondary text-sm mb-5">I am</p>

            <div className="flex gap-3 mb-8">
              {genders.map((g) => (
                <motion.button
                  key={g.value}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedGender(g.value)}
                  className={`px-6 py-3 rounded-xl text-sm transition-all duration-200 ${
                    selectedGender === g.value
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "glass-light text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {g.label}
                </motion.button>
              ))}
            </div>

            {selectedGender && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <p className="text-text-secondary text-sm mb-5">
                  I want to talk to
                </p>

                <div className="flex gap-3 mb-8">
                  {preferences.map((p) => (
                    <motion.button
                      key={p.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedPreference(p.value)}
                      className={`px-5 py-3 rounded-xl text-sm transition-all duration-200 ${
                        selectedPreference === p.value
                          ? "bg-accent/20 text-accent border border-accent/30"
                          : "glass-light text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {p.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {selectedGender && selectedPreference && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setStep("mood")}
                className="bg-accent/90 hover:bg-accent px-8 py-3.5 rounded-2xl text-white text-sm font-medium
                         transition-all duration-300 active:scale-[0.97] shadow-lg shadow-accent/20"
              >
                Continue
              </motion.button>
            )}
          </motion.div>
        )}

        {step === "mood" && (
          <motion.div
            key="mood"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center text-center max-w-sm"
          >
            <p className="text-text-secondary text-sm mb-6">
              What&apos;s your vibe right now?
            </p>

            <div className="flex flex-wrap justify-center gap-2.5 mb-10">
              {moods.map((m) => (
                <motion.button
                  key={m.value}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedMood(m.value)}
                  className={`px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    selectedMood === m.value
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "glass-light text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <span className="mr-1.5">{m.emoji}</span>
                  {m.label}
                </motion.button>
              ))}
            </div>

            {selectedMood && selectedGender && selectedPreference && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() =>
                  onStart(selectedMood, selectedGender, selectedPreference)
                }
                className="bg-accent/90 hover:bg-accent px-8 py-3.5 rounded-2xl text-white text-sm font-medium
                         transition-all duration-300 active:scale-[0.97] shadow-lg shadow-accent/20"
              >
                Start chatting
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
