"use client";

import React from "react";

export function Icon({
  name,
  size = 20,
  strokeWidth = 2,
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<string, React.ReactNode> = {
    menu: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
      </>
    ),

    x: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </>
    ),

    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),

    loader: (
      <>
        <path d="M21 12a9 9 0 1 1-6.7-8.7" />
      </>
    ),

    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),

    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </>
    ),

    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),

    heart: (
      <path d="M20.8 8.9c0 5.1-8.8 10.1-8.8 10.1S3.2 14 3.2 8.9A4.9 4.9 0 0 1 12 6.2a4.9 4.9 0 0 1 8.8 2.7Z" />
    ),

    messages: (
      <>
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.6 9.6 0 0 1-4-.9L3 21l1.9-4.1A8.2 8.2 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" />
        <path d="M8 11h.01" />
        <path d="M12 11h.01" />
        <path d="M16 11h.01" />
      </>
    ),

    arrowLeft: (
      <>
        <path d="m15 18-6-6 6-6" />
        <path d="M9 12h12" />
      </>
    ),

    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),

    sparkle: (
      <>
        <path d="m12 3-1.2 5.8L5 10l5.8 1.2L12 17l1.2-5.8L19 10l-5.8-1.2L12 3Z" />
        <path d="m19 16-.6 2.4L16 19l2.4.6L19 16Z" />
      </>
    ),

    close: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6 6 18" />
      </>
    ),

    plusImage: (
      <>
        <rect x="3" y="3" width="15" height="15" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m18 14 3 3" />
        <path d="M19.5 10v6" />
        <path d="M16.5 13h6" />
      </>
    ),

    handshake: (
      <>
        <path d="m11 5 2 2 2-2 5 5-3 3-2-2-3 3-4-4" />
        <path d="m5 10-3 3 4 4 3-3" />
        <path d="m14 15 3 3" />
        <path d="m17 12 3 3" />
      </>
    ),

    sun: (
      <>
        <circle
          cx="12"
          cy="12"
          r="4.25"
          fill="currentColor"
          stroke="none"
        />

        <path d="M12 2.5v2" />
        <path d="M12 19.5v2" />

        <path d="m4.93 4.93 1.42 1.42" />
        <path d="m17.65 17.65 1.42 1.42" />

        <path d="M2.5 12h2" />
        <path d="M19.5 12h2" />

        <path d="m4.93 19.07 1.42-1.42" />
        <path d="m17.65 6.35 1.42-1.42" />
      </>
    ),

    moon: (
      <>
        <path
          d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8a8.6 8.6 0 1 0 11.3 11.3Z"
          fill="currentColor"
          stroke="none"
        />

        <path
          d="M16.9 5.9a6.8 6.8 0 0 1 1.2 1.1"
          opacity="0.45"
        />
      </>
    ),
  };

  return <svg {...common}>{paths[name] ?? paths.sparkle}</svg>;
}
