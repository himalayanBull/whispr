"use client";

import { motion } from "framer-motion";

interface Props {
  onCancel: () => void;
}

export function SearchingScreen({ onCancel }: Props) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center text-center"
      >
        <div className="relative w-20 h-20 mb-10">
          <motion.div
            className="absolute inset-0 rounded-full border border-accent/20"
            animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border border-accent/20"
            animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.7,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
          </div>
        </div>

        <p className="text-text-secondary text-sm mb-2">
          Looking for someone nearby...
        </p>
        <p className="text-text-muted text-xs mb-10">within 10 km</p>

        <button
          onClick={onCancel}
          className="text-text-muted text-xs hover:text-text-secondary transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}
