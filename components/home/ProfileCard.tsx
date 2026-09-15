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
    <article
      className={`profile-card profile-card-${variant}`}
    >
      <div className="profile-card-top">
        <div className="profile-header">
          <Avatar profile={profile} />

          <div className="profile-heading">
            <span>myFolks member</span>

            <h2>{profile.display_name}</h2>

            {profile.username && (
              <p className="profile-username">
                @{profile.username}
              </p>
            )}
          </div>
        </div>
      </div>

      {profile.featured_interest && (
        <div className="profile-interest">
          <span>Featured interest</span>

          <strong>
            {profile.featured_interest}
          </strong>
        </div>
      )}

      {profile.bio && (
        <p className="profile-bio">
          {profile.bio}
        </p>
      )}

      <div className="profile-card-bottom">
        <button
          type="button"
          className="button primary full-width profile-connect-button"
          onClick={onChoose}
        >
          <span>Connect</span>
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
      </div>
    </article>
  );
}