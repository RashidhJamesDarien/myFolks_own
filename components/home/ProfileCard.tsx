"use client";

import { Avatar } from "./Avatar";
import type { Profile } from "./types";

export function ProfileCard({
  profile,
  variant,
  onChoose,
  onReport,
  onBlock,
}: {
  profile: Profile;
  variant: "coral" | "lavender";
  onChoose: () => void;
  onReport: () => void;
  onBlock: () => void;
}) {
  return (
    <article className="profile-card">
      <div className="profile-header">
        <Avatar profile={profile} />

        <div className="profile-heading">
          <span>A myFolks profile</span>

          <h2>{profile.display_name}</h2>
        </div>
      </div>

      <div className={`interest-box ${variant}`}>
        <span>Featured interest</span>

        <strong>{profile.featured_interest}</strong>
      </div>

      {profile.bio && (
        <p className="profile-bio">
          {profile.bio}
        </p>
      )}

      <button
        type="button"
        className="button primary full-width"
        onClick={onChoose}
      >
        I relate to this
      </button>

      <div className="profile-actions">
        <button
          type="button"
          onClick={onReport}
        >
          Report
        </button>

        <button
          type="button"
          onClick={onBlock}
        >
          Block
        </button>
      </div>
    </article>
  );
}
