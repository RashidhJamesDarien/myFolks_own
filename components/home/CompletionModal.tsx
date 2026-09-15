"use client";

import { Icon } from "./Icon";
import type { FriendRequestStatus, Profile } from "./types";

const REQUEST_LABELS: Record<FriendRequestStatus, string> = {
  pending: "Request pending",
  accepted: "Friends",
  incoming: "Request received",
};

export function CompletionModal({
  profile,
  requestStatus,
  onAddFriend,
  onSendMessage,
  onContinue,
}: {
  profile: Profile;
  requestStatus?: FriendRequestStatus;
  onAddFriend: () => void;
  onSendMessage: () => void;
  onContinue: () => void;
}) {
  const addFriendDisabled = Boolean(requestStatus);

  const addFriendLabel = requestStatus
    ? REQUEST_LABELS[requestStatus]
    : "Add to friends";

  return (
    <div className="modal-backdrop">
      <div className="completion-modal">
        <div className="completion-icon">
          <Icon name="sparkle" size={28} />
        </div>

        <p className="eyebrow">Six rounds complete</p>

        <h2>You found a match.</h2>

        <p className="completion-intro">
          You completed all six discovery rounds. This is the
          person you selected in your final round.
        </p>

        <div className="completion-profile">
          <div className="completion-profile-photo">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.display_name}
                className="completion-profile-image"
              />
            ) : (
              <div className="completion-profile-placeholder">
                <Icon name="user" size={34} />
              </div>
            )}
          </div>

          <div className="completion-profile-details">
            <h3>{profile.display_name}</h3>

            {profile.username && (
              <p className="completion-username">
                @{profile.username}
              </p>
            )}

            {profile.featured_interest && (
              <p className="completion-interest">
                {profile.featured_interest}
              </p>
            )}

            {profile.bio && (
              <p className="completion-bio">{profile.bio}</p>
            )}

            {profile.location && (
              <p className="completion-location">
                {profile.location}
              </p>
            )}
          </div>
        </div>

        <div className="completion-actions">
          <button
            type="button"
            className="button primary"
            onClick={onAddFriend}
            disabled={addFriendDisabled}
          >
            {addFriendLabel}
          </button>

          <button
            type="button"
            className="button lavender"
            onClick={onSendMessage}
          >
            Send a message
          </button>
        </div>

        <button
          type="button"
          className="text-button"
          onClick={onContinue}
        >
          Continue discovering
        </button>
      </div>
    </div>
  );
}
