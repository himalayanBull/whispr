"use client";

import { useState, useEffect } from "react";

export function useTimeOfDay() {
  const [isLateNight, setIsLateNight] = useState(false);

  useEffect(() => {
    const check = () => {
      const hour = new Date().getHours();
      setIsLateNight(hour >= 22 || hour < 5);
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  return { isLateNight };
}
