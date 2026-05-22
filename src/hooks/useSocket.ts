"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { Location } from "./useGeolocation";
import type { Mood, Gender, GenderPreference } from "@/app/page";

export interface ChatMessage {
  id: string;
  text: string;
  sender: "me" | "them";
  timestamp: number;
}

export function useSocket(
  location: Location | null,
  mood: Mood | null,
  gender: Gender | null,
  genderPreference: GenderPreference | null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partnerDistance, setPartnerDistance] = useState<number | null>(null);
  const [partnerMood, setPartnerMood] = useState<Mood | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("online-count", (count: number) => {
      setOnlineCount(count);
    });

    socket.on(
      "matched",
      (data: { distance: number; partnerMood: Mood | null }) => {
        setPartnerDistance(data.distance);
        setPartnerMood(data.partnerMood);
        setMessages([]);
        setIsPartnerTyping(false);
      }
    );

    socket.on("message", (msg: { id: string; text: string }) => {
      setMessages((prev) => [
        ...prev,
        { id: msg.id, text: msg.text, sender: "them", timestamp: Date.now() },
      ]);
    });

    socket.on("partner-typing", (typing: boolean) => {
      setIsPartnerTyping(typing);
    });

    socket.on("partner-disconnected", () => {
      setPartnerDistance(null);
      setPartnerMood(null);
      setIsPartnerTyping(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const findMatch = useCallback(
    (overrides?: {
      latitude?: number;
      longitude?: number;
      mood?: Mood | null;
      gender?: Gender | null;
      genderPreference?: GenderPreference | null;
    }) => {
      const lat = overrides?.latitude ?? location?.latitude;
      const lon = overrides?.longitude ?? location?.longitude;
      if (socketRef.current && lat != null && lon != null) {
        setMessages([]);
        setPartnerDistance(null);
        setPartnerMood(null);
        socketRef.current.emit("find-match", {
          latitude: lat,
          longitude: lon,
          mood: overrides?.mood ?? mood,
          gender: overrides?.gender ?? gender,
          genderPreference: overrides?.genderPreference ?? genderPreference,
        });
      }
    },
    [location, mood, gender, genderPreference]
  );

  const sendMessage = useCallback((text: string) => {
    if (socketRef.current && text.trim()) {
      const id = crypto.randomUUID();
      socketRef.current.emit("send-message", { id, text: text.trim() });
      setMessages((prev) => [
        ...prev,
        { id, text: text.trim(), sender: "me", timestamp: Date.now() },
      ]);
    }
  }, []);

  const sendTyping = useCallback((typing: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit("typing", typing);
    }
    if (typing) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) socketRef.current.emit("typing", false);
      }, 2000);
    }
  }, []);

  const skipPartner = useCallback(() => {
    if (socketRef.current && location) {
      setMessages([]);
      setPartnerDistance(null);
      setPartnerMood(null);
      setIsPartnerTyping(false);
      socketRef.current.emit("skip", {
        latitude: location.latitude,
        longitude: location.longitude,
        mood,
        gender,
        genderPreference,
      });
    }
  }, [location, mood, gender, genderPreference]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("leave");
      setMessages([]);
      setPartnerDistance(null);
      setPartnerMood(null);
      setIsPartnerTyping(false);
    }
  }, []);

  const reportUser = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("report");
    }
  }, []);

  return {
    messages,
    partnerDistance,
    partnerMood,
    onlineCount,
    isPartnerTyping,
    sendMessage,
    sendTyping,
    findMatch,
    skipPartner,
    disconnect,
    reportUser,
  };
}
