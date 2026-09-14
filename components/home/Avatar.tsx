"use client";

import { initials } from "./utils";
import type { Profile } from "./types";

export function Avatar({
  profile,
  large = false,
}: {
  profile?: Profile | null;
  large?: boolean;
}) {
  if (profile?.photo_url) {
    return (
      <img
        src={profile.photo_url}
        alt={profile.display_name}
        className={`avatar-image ${large ? "avatar-large" : ""}`}
      />
    );
  }

  return (
    <div className={`avatar ${large ? "avatar-large" : ""}`}>
      {initials(profile?.display_name || "myFolks")}
    </div>
  );
}
