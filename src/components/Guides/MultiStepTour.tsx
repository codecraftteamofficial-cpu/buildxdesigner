"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";

const DEFAULT_SHOW_BUTTONS: ("next" | "previous" | "close")[] = [
  "next",
  "previous",
  "close",
];

interface TourStep {
  element?: string;
  title: string;
  description: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  onHighlightStarted?: () => void;
}

interface MultiStepTourProps {
  steps: TourStep[];
  showOnMount?: boolean;
  onComplete?: () => void;
  showProgress?: boolean;
  showButtons?: ("next" | "previous" | "close")[];
}

export function MultiStepTour({
  steps,
  showOnMount = true,
  onComplete,
  showProgress = true,
  showButtons = DEFAULT_SHOW_BUTTONS,
}: MultiStepTourProps) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const hasStartedRef = useRef(false);
  const startAttemptRef = useRef(0);
  const startTimerRef = useRef<number | null>(null);
  const onCompleteRef = useRef<(() => void) | undefined>(onComplete);
  // Track whether the tour is actively running so section changes don't restart it
  const tourActiveRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const clearStartTimer = () => {
      if (startTimerRef.current !== null) {
        window.clearTimeout(startTimerRef.current);
        startTimerRef.current = null;
      }
    };

    const destroyDriver = () => {
      clearStartTimer();
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
      hasStartedRef.current = false;
      tourActiveRef.current = false;
      startAttemptRef.current = 0;
    };

    if (!showOnMount) {
      destroyDriver();
      return;
    }

    // If the tour is already running, don't restart it even if showOnMount
    // stays true through a re-render caused by section navigation
    if (hasStartedRef.current || tourActiveRef.current) return;

    const tryStart = () => {
      if (!showOnMount || hasStartedRef.current || tourActiveRef.current) return;

      const firstTarget = steps[0]?.element;
      if (firstTarget && !document.querySelector(firstTarget)) {
        if (startAttemptRef.current < 80) {
          startAttemptRef.current += 1;
          startTimerRef.current = window.setTimeout(tryStart, 50);
          return;
        }
        // Gave up waiting — start anyway without element targeting for step 0
      }

      hasStartedRef.current = true;
      tourActiveRef.current = true;

      const driverSteps = steps.map((step) => ({
        element: step.element,
        popover: {
          title: step.title,
          description: step.description,
          side: step.side || "right",
          align: step.align || "start",
        },
        onHighlightStarted: step.onHighlightStarted,
      }));

      driverRef.current = driver({
        showProgress,
        showButtons,
        steps: driverSteps,
        disableActiveInteraction: true,
        allowClose: false,
        onDestroyStarted: () => {
          destroyDriver();
          onCompleteRef.current?.();
        },
      });

      driverRef.current.drive();
    };

    tryStart();

    return () => {
      // Only destroy on true unmount, not on re-renders from section changes.
      // We detect true unmount by checking if showOnMount is still true —
      // if it is, we're just re-rendering, so leave the tour alone.
      // The parent sets showOnMount=false to actually stop the tour.
      if (!showOnMount) {
        destroyDriver();
      }
    };
  }, [showOnMount, steps, showProgress]);

  return null;
}