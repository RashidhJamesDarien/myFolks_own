"use client";

export function StatusMessage({
  text,
  type,
}: {
  text: string;
  type: "info" | "success" | "error";
}) {
  return (
    <div
      className={`status-message ${type}`}
    >
      {text}
    </div>
  );
}
