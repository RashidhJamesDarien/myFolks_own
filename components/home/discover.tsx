"use client";

import { Icon } from "./Icon";
import { Eyebrow } from "./Eyebrow";
import { StatusMessage } from "./StatusMessage";
import { ProfileCard } from "./ProfileCard";
import type { Profile, StatusValue } from "./types";

export function DiscoverView({
  profiles,
  currentPair,
  discoverState,
  progressCurrent,
  progressTotal,
  progressPercent,
  positiveSelections,
  visibleProfilesCount,
  notice,
  onChoose,
  onSkip,
  onReport,
  onBlock,
  onRetry,
}: {
  profiles: Profile[];
  currentPair: Profile[];
  discoverState: string;
  progressCurrent: number;
  progressTotal: number;
  progressPercent: number;
  positiveSelections: Profile[];
  visibleProfilesCount: number;
  notice: StatusValue;
  onChoose: (index: number) => void;
  onSkip: () => void;
  onReport: (profile: Profile) => void;
  onBlock: (profile: Profile) => void;
  onRetry: () => void;
}) {
  const loading = discoverState === "loading";
  const empty = discoverState === "empty";
  const error = discoverState === "error";

  const insufficient =
    profiles.length > 0 &&
    visibleProfilesCount < 2;

  return (
    <section className="view-panel">
      <div className="section-heading-row">
        <div>
          <Eyebrow>
            Shared-interest discovery
          </Eyebrow>

          <h1>
            Which interest feels familiar?
          </h1>

          <p>
            Choose the featured interest you connect with
            most. It&apos;s about finding common ground,
            never judging people.
          </p>
        </div>

        <div className="progress-card">
          <div className="progress-header">
            <span>Your session</span>

            <span>
              {progressTotal
                ? `Pair ${progressCurrent} of ${progressTotal}`
                : "No pairs"}
            </span>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="state-card">
          <Icon name="loader" size={32} />

          <p>
            Loading profiles to discover…
          </p>
        </div>
      )}

      {empty && (
        <div className="state-card">
          <p>No profiles to discover yet.</p>
        </div>
      )}

      {error && (
        <div className="state-card error-state">
          <p>
            Profiles could not be loaded right now. Please
            try again.
          </p>

          <button
            type="button"
            className="button primary"
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      )}

      {notice && (
        <StatusMessage
          text={notice.text}
          type={notice.type}
        />
      )}

      {insufficient && (
        <div className="insufficient-card">
          <Icon name="users" size={40} />

          <h2>More profiles are needed</h2>

          <p>
            There are not enough available profiles to
            create a discovery pair right now. Check back
            after more people choose to be visible in
            Discover.
          </p>
        </div>
      )}

      {!loading &&
        !empty &&
        !error &&
        !insufficient &&
        currentPair.length === 2 && (
          <>
            <div className="pair-grid">
              <ProfileCard
                profile={currentPair[0]}
                variant="coral"
                onChoose={() => onChoose(0)}
                onReport={() => onReport(currentPair[0])}
                onBlock={() => onBlock(currentPair[0])}
              />

              <div className="or-badge">OR</div>

              <ProfileCard
                profile={currentPair[1]}
                variant="lavender"
                onChoose={() => onChoose(1)}
                onReport={() => onReport(currentPair[1])}
                onBlock={() => onBlock(currentPair[1])}
              />
            </div>

            <div className="discovery-controls">
              <button
                type="button"
                className="button lavender"
                onClick={onSkip}
              >
                Skip this pair
              </button>

              <span className="selection-count">
                {positiveSelections.length} selections
              </span>
            </div>
          </>
        )}
    </section>
  );
}
