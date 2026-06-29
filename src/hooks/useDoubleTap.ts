import { useCallback, useRef } from "react";

interface DoubleTapOptions {
  onDoubleTap: (e: React.MouseEvent | React.TouchEvent) => void;
  onSingleTap?: (e: React.MouseEvent | React.TouchEvent) => void;
  delay?: number;
}

export function useDoubleTap({
  onDoubleTap,
  onSingleTap,
  delay = 300,
}: DoubleTapOptions) {
  const lastTapRef = useRef<number>(0);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const singleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const now = Date.now();
      const timeDiff = now - lastTapRef.current;

      // Get tap position
      let x: number, y: number;
      if ("touches" in e) {
        const touch = e.changedTouches[0];
        x = touch.clientX;
        y = touch.clientY;
      } else {
        x = e.clientX;
        y = e.clientY;
      }

      // Check if tap is near the last tap position (within 50px tolerance)
      const isNearLastTap =
        lastPositionRef.current &&
        Math.abs(x - lastPositionRef.current.x) < 50 &&
        Math.abs(y - lastPositionRef.current.y) < 50;

      if (timeDiff < delay && isNearLastTap) {
        // Double tap detected
        if (singleTapTimeoutRef.current) {
          clearTimeout(singleTapTimeoutRef.current);
          singleTapTimeoutRef.current = null;
        }
        lastTapRef.current = 0;
        lastPositionRef.current = null;
        onDoubleTap(e);
      } else {
        // Potential single tap - wait to see if double tap follows
        lastTapRef.current = now;
        lastPositionRef.current = { x, y };

        if (onSingleTap) {
          if (singleTapTimeoutRef.current) {
            clearTimeout(singleTapTimeoutRef.current);
          }
          singleTapTimeoutRef.current = setTimeout(() => {
            onSingleTap(e);
            singleTapTimeoutRef.current = null;
          }, delay);
        }
      }
    },
    [onDoubleTap, onSingleTap, delay]
  );

  return handleTap;
}
