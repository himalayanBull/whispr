"use client";

import { useState, useCallback } from "react";

export interface Location {
  latitude: number;
  longitude: number;
}

export function useGeolocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async (): Promise<Location | null> => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return null;
    }

    return new Promise<Location | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(loc);
          setError(null);
          resolve(loc);
        },
        (err) => {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setError("Location access denied. Enable it to find nearby people.");
              break;
            case err.POSITION_UNAVAILABLE:
              setError("Location unavailable. Try again.");
              break;
            case err.TIMEOUT:
              setError("Location request timed out.");
              break;
          }
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  return { location, requestLocation, error };
}
