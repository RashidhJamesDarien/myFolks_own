"use client";

import React from "react";

export function Eyebrow({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="eyebrow">
      {children}
    </p>
  );
}
