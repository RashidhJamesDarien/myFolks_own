"use client";

import React, { useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";

const STORAGE_KEY = "myfolks-theme";

type ViewTransitionDocument = Document & {
  startViewTransition?: (
    callback: (() => void) | (() => Promise<void>),
  ) => { finished: Promise<void> };
};

function getThemeRadius(x: number, y: number) {
  const { innerWidth: width, innerHeight: height } = window;

  return Math.max(
    Math.hypot(x, y),
    Math.hypot(width - x, y),
    Math.hypot(x, height - y),
    Math.hypot(width - x, height - y),
  );
}

/**
 * Dark mode with the circular View Transitions reveal.
 */
export function useTheme() {
  const [darkMode, setDarkMode] = useState(false);
  const [themeAnimating, setThemeAnimating] = useState(false);

  useLayoutEffect(() => {
    const isDark =
      window.localStorage.getItem(STORAGE_KEY) === "dark";

    document.documentElement.dataset.theme = isDark
      ? "dark"
      : "light";

    document.documentElement.classList.toggle(
      "supports-view-transition",
      "startViewTransition" in document,
    );

    setDarkMode(isDark);
  }, []);

  const toggleTheme = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (themeAnimating) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const nextDarkMode = !darkMode;

    const root = document.documentElement;

    root.style.setProperty("--theme-x", `${x}px`);
    root.style.setProperty("--theme-y", `${y}px`);
    root.style.setProperty(
      "--theme-radius",
      `${getThemeRadius(x, y)}px`,
    );

    setThemeAnimating(true);

    const applyTheme = () => {
      root.dataset.theme = nextDarkMode ? "dark" : "light";

      flushSync(() => {
        setDarkMode(nextDarkMode);
      });

      window.localStorage.setItem(
        STORAGE_KEY,
        nextDarkMode ? "dark" : "light",
      );
    };

    const doc = document as ViewTransitionDocument;

    if (doc.startViewTransition) {
      const stop = () => setThemeAnimating(false);

      void doc.startViewTransition(applyTheme).finished.then(
        stop,
        stop,
      );

      return;
    }

    applyTheme();

    window.setTimeout(() => setThemeAnimating(false), 700);
  };

  return { darkMode, themeAnimating, toggleTheme };
}
