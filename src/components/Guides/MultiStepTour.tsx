"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

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
      startAttemptRef.current = 0;
    };

    if (!showOnMount) {
      destroyDriver();
      return;
    }

    if (hasStartedRef.current) return;

    const tryStart = () => {
      if (!showOnMount || hasStartedRef.current) return;

      const firstTarget = steps[0]?.element;
      if (firstTarget && !document.querySelector(firstTarget)) {
        if (startAttemptRef.current < 80) {
          startAttemptRef.current += 1;
          startTimerRef.current = window.setTimeout(tryStart, 50);
          return;
        }
      }

      hasStartedRef.current = true;

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
      destroyDriver();
    };
  }, [showOnMount, steps, showProgress]);

  return null;
}

