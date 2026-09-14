"use client";

import React, { useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { Eyebrow } from "./Eyebrow";
import { StatusMessage } from "./StatusMessage";
import {
  FEATURED_INTERESTS,
  INITIAL_FEATURED_INTERESTS,
} from "./constants";
import type { Profile, StatusValue } from "./types";

export function ProfileView({
  profile,
  editing,
  editFullName,
  editUsername,
  editBio,
  editLocation,
  editInterests,
  editCustomInterest,
  editProfilePhotoUrl,
  editProfileStatus,
  editProfileSaving,
  onStartEdit,
  onCancelEdit,
  onFullNameChange,
  onUsernameChange,
  onBioChange,
  onLocationChange,
  onToggleInterest,
  onCustomInterestChange,
  onPhoto,
  onRemovePhoto,
  onSave,
  onSignOut,
}: {
  profile: Profile | null;
  editing: boolean;
  editFullName: string;
  editUsername: string;
  editBio: string;
  editLocation: string;
  editInterests: string[];
  editCustomInterest: string;
  editProfilePhotoUrl: string | null;
  editProfileStatus: StatusValue;
  editProfileSaving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onFullNameChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onToggleInterest: (interest: string) => void;
  onCustomInterestChange: (value: string) => void;
  onPhoto: (file?: File) => void;
  onRemovePhoto: () => void;
  onSave: () => void;
  onSignOut: () => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [showMoreInterests, setShowMoreInterests] =
    useState(false);

  const visibleInterests = showMoreInterests
    ? FEATURED_INTERESTS
    : FEATURED_INTERESTS.slice(
        0,
        INITIAL_FEATURED_INTERESTS,
      );

  if (editing) {
    return (
      <section className="view-panel">
        <div className="section-heading-row">
          <div>
            <Eyebrow>Your identity</Eyebrow>

            <h1>Edit my profile</h1>

            <p className="section-copy">
              Update the information people see when they
              discover you on myFolks.
            </p>
          </div>
        </div>

        <div className="profile-form">
          <div className="form-grid">
            <div className="profile-identity-section full">
              <input
                ref={photoInputRef}
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  onPhoto(event.target.files?.[0])
                }
              />

              <button
                type="button"
                className="profile-photo-button"
                onClick={() =>
                  photoInputRef.current?.click()
                }
                aria-label="Change profile photo"
              >
                {editProfilePhotoUrl ? (
                  <img
                    src={editProfilePhotoUrl}
                    alt="New profile photo"
                    className="profile-photo-circle"
                  />
                ) : (
                  <Avatar
                    profile={profile}
                    large
                  />
                )}
              </button>

              <p className="profile-photo-hint">
                Click your photo to choose a new one
              </p>

              {editProfilePhotoUrl && (
                <button
                  type="button"
                  className="remove-profile-photo"
                  onClick={onRemovePhoto}
                >
                  Remove new photo
                </button>
              )}
            </div>

            <div className="field full">
              <label htmlFor="edit-profile-name">
                Display name
              </label>

              <input
                id="edit-profile-name"
                type="text"
                value={editFullName}
                maxLength={80}
                onChange={(event) =>
                  onFullNameChange(
                    event.target.value,
                  )
                }
                disabled={editProfileSaving}
                required
              />
            </div>

            <div className="field full">
              <label htmlFor="edit-profile-username">
                Username
              </label>

              <input
                id="edit-profile-username"
                type="text"
                value={editUsername}
                maxLength={40}
                onChange={(event) =>
                  onUsernameChange(
                    event.target.value,
                  )
                }
                disabled={editProfileSaving}
                required
              />
            </div>

            <div className="field full">
              <label htmlFor="edit-profile-location">
                Location
              </label>

              <input
                id="edit-profile-location"
                type="text"
                value={editLocation}
                maxLength={120}
                onChange={(event) =>
                  onLocationChange(
                    event.target.value,
                  )
                }
                disabled={editProfileSaving}
                placeholder="City, country"
              />
            </div>

            <div className="field full interest-field">
              <div className="interest-label-row">
                <label>
                  Featured interests
                </label>

                <span className="interest-label-hint">
                  Choose as many as you like
                </span>
              </div>

              <div className="interest-picker">
                <div
                  className="interest-bubbles"
                  aria-label="Featured interests"
                >
                  {visibleInterests.map(
                    (interest) => {
                      const selected =
                        editInterests.includes(
                          interest,
                        );

                      return (
                        <button
                          key={interest}
                          type="button"
                          className={`interest-bubble ${
                            selected
                              ? "is-selected"
                              : ""
                          }`}
                          onClick={() =>
                            onToggleInterest(
                              interest,
                            )
                          }
                          aria-pressed={selected}
                          disabled={
                            editProfileSaving
                          }
                        >
                          <span>
                            {interest}
                          </span>

                          {selected && (
                            <span
                              className="interest-bubble-check"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>

                {!showMoreInterests && (
                  <button
                    type="button"
                    className="interest-more-button"
                    onClick={() =>
                      setShowMoreInterests(true)
                    }
                  >
                    more +
                  </button>
                )}
              </div>

              <div className="interest-custom-input">
                <input
                  type="text"
                  value={editCustomInterest}
                  maxLength={200}
                  onChange={(event) =>
                    onCustomInterestChange(
                      event.target.value,
                    )
                  }
                  disabled={editProfileSaving}
                  placeholder="Or type your own interest..."
                />
              </div>

              <p className="interest-helper">
                For multiple custom interests, separate them
                with commas.
              </p>
            </div>

            <div className="field full">
              <label htmlFor="edit-profile-bio">
                Short bio
              </label>

              <textarea
                id="edit-profile-bio"
                rows={5}
                maxLength={280}
                value={editBio}
                onChange={(event) =>
                  onBioChange(event.target.value)
                }
                disabled={editProfileSaving}
                placeholder="Tell people a little about yourself..."
              />
            </div>
          </div>

          {editProfileStatus && (
            <StatusMessage
              text={editProfileStatus.text}
              type={editProfileStatus.type}
            />
          )}

          <div className="dialog-actions">
            <button
              type="button"
              className="button lavender"
              onClick={onCancelEdit}
              disabled={editProfileSaving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="button primary"
              onClick={onSave}
              disabled={editProfileSaving}
            >
              {editProfileSaving
                ? "Saving..."
                : "Save changes"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="view-panel">
      <Eyebrow>Your controls</Eyebrow>

      <h1>My profile</h1>

      <p className="section-copy">
        Review exactly what you share, update your profile,
        or take your profile out of Discover whenever you
        want.
      </p>

      {profile && (
        <div className="current-profile-card">
          <Avatar profile={profile} large />

          <h2>{profile.display_name}</h2>

          {profile.username && (
            <p className="profile-username">
              @{profile.username}
            </p>
          )}

          <strong>
            {profile.featured_interest ||
              "No interests added yet."}
          </strong>

          <p>
            {profile.bio || "No bio added yet."}
          </p>

          {profile.location && (
            <p>{profile.location}</p>
          )}

          <div className="visibility-pill">
            Visibility:{" "}
            {profile.visibility || "published"} · Profile
            active
          </div>
        </div>
      )}

      <div className="dialog-actions">
        <button
          type="button"
          className="button primary"
          onClick={onStartEdit}
          disabled={!profile}
        >
          Edit profile
        </button>

        <button
          type="button"
          className="button outline"
          onClick={onSignOut}
        >
          Sign out
        </button>
      </div>
    </section>
  );
}
