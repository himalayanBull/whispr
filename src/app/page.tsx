"use client";

import { useState, useEffect } from "react";
import { LandingScreen } from "@/components/LandingScreen";
import { ChatScreen } from "@/components/ChatScreen";
import { SearchingScreen } from "@/components/SearchingScreen";
import { useSocket } from "@/hooks/useSocket";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useTimeOfDay } from "@/hooks/useTimeOfDay";

export type AppState = "landing" | "searching" | "chatting" | "disconnected";
export type Mood =
  | "walking"
  | "bored"
  | "studying"
  | "late-night"
  | "coffee"
  | "trekking";
export type Gender = "male" | "female";
export type GenderPreference = "male" | "female" | "anyone";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("landing");
  const [mood, setMood] = useState<Mood | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [genderPreference, setGenderPreference] =
    useState<GenderPreference | null>(null);
  const { location, requestLocation, error: geoError } = useGeolocation();
  const { isLateNight } = useTimeOfDay();
  const {
    messages,
    partnerDistance,
    partnerMood,
    onlineCount,
    isPartnerTyping,
    sendMessage,
    findMatch,
    skipPartner,
    disconnect,
    reportUser,
  } = useSocket(location, mood, gender, genderPreference);

  useEffect(() => {
    if (appState === "searching" && partnerDistance !== null) {
      setAppState("chatting");
    }
  }, [partnerDistance, appState]);

  const handleStart = async (
    selectedMood: Mood,
    selectedGender: Gender,
    selectedPreference: GenderPreference
  ) => {
    setMood(selectedMood);
    setGender(selectedGender);
    setGenderPreference(selectedPreference);
    let loc = location;
    if (!loc) {
      loc = await requestLocation();
    }
    setAppState("searching");
    findMatch({
      latitude: loc?.latitude,
      longitude: loc?.longitude,
      mood: selectedMood,
      gender: selectedGender,
      genderPreference: selectedPreference,
    });
  };

  const handleNext = () => {
    setAppState("searching");
    skipPartner();
  };

  const handleDisconnect = () => {
    disconnect();
    setAppState("landing");
  };

  const bgClass = isLateNight ? "late-night-bg" : "gradient-bg";

  return (
    <main className={`h-full w-full ${bgClass} relative overflow-hidden`}>
      {appState === "landing" && (
        <LandingScreen
          onStart={handleStart}
          onRequestLocation={requestLocation}
          locationGranted={!!location}
          geoError={geoError}
          onlineCount={onlineCount}
        />
      )}
      {appState === "searching" && (
        <SearchingScreen onCancel={handleDisconnect} />
      )}
      {appState === "chatting" && (
        <ChatScreen
          messages={messages}
          partnerDistance={partnerDistance}
          partnerMood={partnerMood}
          isPartnerTyping={isPartnerTyping}
          onSend={sendMessage}
          onNext={handleNext}
          onDisconnect={handleDisconnect}
          onReport={reportUser}
          isLateNight={isLateNight}
        />
      )}
    </main>
  );
}
