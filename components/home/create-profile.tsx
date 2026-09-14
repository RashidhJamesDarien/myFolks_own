"use client";

import React, { useRef, useState } from "react";
import { Icon } from "./Icon";
import { Eyebrow } from "./Eyebrow";
import { StatusMessage } from "./StatusMessage";
import {
  FEATURED_INTERESTS,
  INITIAL_FEATURED_INTERESTS,
} from "./constants";
import type { StatusValue } from "./types";

export function CreateProfileView({
  profilePhoto,
  profilePhotoUrl,
  status,
  formStatus,
  onPhoto,
  onRemovePhoto,
  onSubmit,
}: {
  profilePhoto: File | null;
  profilePhotoUrl: string | null;
  status: StatusValue;
  formStatus: StatusValue;
  onPhoto: (file?: File) => void;
  onRemovePhoto: () => void;
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>,
  ) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const interestInputRef =
    useRef<HTMLInputElement>(null);

  const [
    selectedInterests,
    setSelectedInterests,
  ] = useState<string[]>([]);

  const [
    customInterest,
    setCustomInterest,
  ] = useState("");

  const [
    showMoreInterests,
    setShowMoreInterests,
  ] = useState(false);

  const visibleInterests = showMoreInterests
    ? FEATURED_INTERESTS
    : FEATURED_INTERESTS.slice(
        0,
        INITIAL_FEATURED_INTERESTS,
      );

  const combinedInterests = [
    ...selectedInterests,
    ...(customInterest.trim()
      ? [customInterest.trim()]
      : []),
  ];

  const featuredInterestValue =
    combinedInterests.join(", ");

  const handleInterestSelect = (
    interest: string,
  ) => {
    setSelectedInterests((previous) => {
      if (previous.includes(interest)) {
        return previous.filter(
          (item) => item !== interest,
        );
      }

      return [...previous, interest];
    });
  };

  const handleInterestInput = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setCustomInterest(event.target.value);
  };

  const handleCreateProfileSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    if (
      selectedInterests.length === 0 &&
      !customInterest.trim()
    ) {
      event.preventDefault();

      const input = interestInputRef.current;

      if (input) {
        input.setCustomValidity(
          "Choose at least one interest or enter your own.",
        );

        input.reportValidity();

        window.setTimeout(() => {
          input.setCustomValidity("");
        }, 100);
      }

      return;
    }

    onSubmit(event);
  };

  return (
    <section className="view-panel">
      <Eyebrow>Consent-first profile</Eyebrow>

      <h1>Create your myFolks profile</h1>

      <p className="section-copy">
        Keep it simple, kind, and recognisably you. You
        choose what becomes public and can unpublish or
        delete your profile at any time.
      </p>

      <form
        className="profile-form"
        onSubmit={handleCreateProfileSubmit}
      >
        <div className="form-grid">
          <div className="profile-identity-section full">
            <input
              ref={inputRef}
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
                inputRef.current?.click()
              }
              aria-label="Choose profile photo"
            >
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt="Selected profile photo"
                  className="profile-photo-circle"
                />
              ) : (
                <div className="profile-photo-circle profile-photo-placeholder">
                  <Icon name="user" size={30} />
                </div>
              )}
            </button>

            {profilePhoto && (
              <button
                type="button"
                className="remove-profile-photo"
                onClick={onRemovePhoto}
              >
                Remove photo
              </button>
            )}

            <p className="profile-photo-hint">
              Add a profile photo
            </p>

            {status && (
              <StatusMessage
                text={status.text}
                type={status.type}
              />
            )}
          </div>

          <div className="field full">
            <label htmlFor="profile-name">
              Display name
            </label>

            <input
              id="profile-name"
              required
              maxLength={80}
              placeholder="Your display name"
            />
          </div>

          <div className="field full interest-field">
            <div className="interest-label-row">
              <label htmlFor="profile-interest-custom">
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
                  (interest, index) => {
                    const isSelected =
                      selectedInterests.includes(
                        interest,
                      );

                    const isNewlyRevealed =
                      showMoreInterests &&
                      index >=
                        INITIAL_FEATURED_INTERESTS;

                    return (
                      <button
                        key={interest}
                        type="button"
                        className={`interest-bubble ${
                          isSelected
                            ? "is-selected"
                            : ""
                        } ${
                          isNewlyRevealed
                            ? "interest-bubble-reveal"
                            : ""
                        }`}
                        style={
                          {
                            "--interest-delay":
                              isNewlyRevealed
                                ? `${
                                    (index -
                                      INITIAL_FEATURED_INTERESTS) *
                                    55
                                  }ms`
                                : "0ms",
                          } as React.CSSProperties
                        }
                        onClick={() =>
                          handleInterestSelect(
                            interest,
                          )
                        }
                        aria-pressed={isSelected}
                      >
                        <span>{interest}</span>

                        {isSelected && (
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

              {!showMoreInterests &&
                visibleInterests.length <
                  FEATURED_INTERESTS.length && (
                  <button
                    type="button"
                    className="interest-more-button"
                    onClick={() =>
                      setShowMoreInterests(true)
                    }
                    aria-expanded={false}
                  >
                    more +
                  </button>
                )}
            </div>

            <div className="interest-custom-input">
              <input
                id="profile-interest-custom"
                type="text"
                maxLength={120}
                value={customInterest}
                onChange={handleInterestInput}
                placeholder="Or type your own interest..."
              />
            </div>

            <input
              ref={interestInputRef}
              id="profile-interest"
              type="text"
              tabIndex={-1}
              aria-hidden="true"
              value={featuredInterestValue}
              readOnly
              onChange={() => {}}
              style={{
                position: "absolute",
                width: "1px",
                height: "1px",
                padding: 0,
                margin: "-1px",
                overflow: "hidden",
                clip: "rect(0, 0, 0, 0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
            />

            <p className="interest-helper">
              Select multiple interests that feel like you.
              You can also add your own.
            </p>
          </div>

          <div className="field full">
            <label htmlFor="profile-bio">
              Short bio (optional)
            </label>

            <textarea
              id="profile-bio"
              rows={4}
              maxLength={280}
            />
          </div>
        </div>

        {formStatus && (
          <StatusMessage
            text={formStatus.text}
            type={formStatus.type}
          />
        )}

        <button
          type="submit"
          className="button primary"
        >
          Create profile
        </button>
      </form>
    </section>
  );
}
