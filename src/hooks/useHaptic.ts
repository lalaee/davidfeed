import { useCallback } from "react";

type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error";

export function useHaptic() {
  const trigger = useCallback((type: HapticType = "light") => {
    // Check if vibration API is supported
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      switch (type) {
        case "light":
          navigator.vibrate(10);
          break;
        case "medium":
          navigator.vibrate(20);
          break;
        case "heavy":
          navigator.vibrate(30);
          break;
        case "success":
          navigator.vibrate([10, 50, 10]);
          break;
        case "warning":
          navigator.vibrate([20, 30, 20]);
          break;
        case "error":
          navigator.vibrate([30, 20, 30, 20, 30]);
          break;
      }
    }
  }, []);

  return { trigger };
}
