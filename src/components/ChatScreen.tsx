"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage } from "@/hooks/useSocket";
import type { Mood } from "@/app/page";
import { TypingIndicator } from "./TypingIndicator";

const moodLabels: Record<Mood, string> = {
  walking: "🚶 Walking",
  bored: "😶 Bored",
  studying: "📖 Studying",
  "late-night": "🌙 Late night",
  coffee: "☕ Coffee",
  trekking: "⛰️ Trekking",
};

interface Props {
  messages: ChatMessage[];
  partnerDistance: number | null;
  partnerMood: Mood | null;
  isPartnerTyping: boolean;
  onSend: (text: string) => void;
  onNext: () => void;
  onDisconnect: () => void;
  onReport: () => void;
  isLateNight: boolean;
}

export function ChatScreen({
  messages,
  partnerDistance,
  partnerMood,
  isPartnerTyping,
  onSend,
  onNext,
  onDisconnect,
  onReport,
  isLateNight,
}: Props) {
  const [input, setInput] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const visibleMessages = messages.slice(-4);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input);
      setInput("");
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-5 pt-5 pb-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <div className="flex flex-col">
            {partnerDistance !== null && (
              <span className="text-text-muted text-xs font-mono">
                {partnerDistance.toFixed(1)} km away
              </span>
            )}
            {partnerMood && (
              <span className="text-text-muted text-[10px] mt-0.5">
                {moodLabels[partnerMood]}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNext}
            className="glass-light px-4 py-2 rounded-xl text-xs text-text-secondary
                     hover:text-text-primary transition-all duration-200 active:scale-95"
          >
            Next
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="glass-light w-8 h-8 rounded-xl flex items-center justify-center
                     text-text-muted hover:text-text-secondary transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="8" cy="13" r="1.5" />
            </svg>
          </button>
        </div>
      </motion.div>

      {/* Menu dropdown */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            className="absolute top-16 right-5 glass rounded-xl p-1.5 z-50 min-w-[140px]"
          >
            <button
              onClick={() => {
                onReport();
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-red-400/80
                       hover:bg-white/[0.03] transition-colors"
            >
              Report user
            </button>
            <button
              onClick={() => {
                onDisconnect();
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-text-muted
                       hover:bg-white/[0.03] transition-colors"
            >
              Disconnect
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 flex flex-col justify-end px-5 pb-3 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {visibleMessages.map((msg, i) => {
            const opacity = i === 0 && visibleMessages.length >= 4 ? 0.3 : 1;
            const blur =
              i === 0 && visibleMessages.length >= 4 ? "blur(1px)" : "none";

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15, scale: 0.97 }}
                animate={{ opacity, y: 0, scale: 1, filter: blur }}
                exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className={`mb-2.5 max-w-[80%] ${
                  msg.sender === "me" ? "self-end" : "self-start"
                }`}
              >
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === "me"
                      ? "bg-accent/15 text-text-primary rounded-br-md"
                      : "glass-light text-text-primary rounded-bl-md"
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isPartnerTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="self-start mb-2"
          >
            <TypingIndicator />
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit}
        className="px-5 pb-5 pt-2"
      >
        <div
          className={`glass rounded-2xl flex items-center px-4 py-3 transition-all duration-300 ${
            input ? "shadow-lg shadow-accent/5 border-accent/10" : ""
          }`}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Say something..."
            maxLength={500}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="ml-3 text-accent disabled:text-text-muted transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
      </motion.form>
    </div>
  );
}
