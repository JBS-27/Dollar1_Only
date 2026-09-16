import { useEffect, useState } from "react";
import { pulseParticipation, startAmbient, stopAmbient } from "../lib/sound";

const STORAGE_KEY = "one-dollar-only:muted";

export function useAmbientSound(latestAt: string | null): {
  muted: boolean;
  toggle: () => void;
} {
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    if (muted) {
      void stopAmbient();
      return;
    }
    void startAmbient();
  }, [muted]);

  useEffect(() => {
    if (muted || !latestAt) return;
    pulseParticipation();
  }, [latestAt, muted]);

  return {
    muted,
    toggle: () => setMuted((value) => !value),
  };
}
