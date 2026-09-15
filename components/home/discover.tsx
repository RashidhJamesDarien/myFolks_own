"use client";

import { Icon } from "./Icon";
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

  /*
   * The pair itself is the source of truth for rendering.
   *
   * This prevents the fallback state from hiding a valid
   * pair that Home has already prepared.
   */
  const hasPair =
    currentPair.length === 2 &&
    Boolean(currentPair[0]?.profile_id) &&
    Boolean(currentPair[1]?.profile_id);

  const insufficient =
    !loading &&
    !error &&
    !hasPair &&
    profiles.length > 0 &&
    visibleProfilesCount < 2;

  return (
    <section className="view-panel discover-view">
      {loading && (
        <div className="state-card discover-state-card">
          <Icon name="loader" size={32} />

          <p>Finding people to discover…</p>
        </div>
      )}

      {empty && !hasPair && (
        <div className="state-card discover-state-card">
          <p>No profiles to discover yet.</p>
        </div>
      )}

      {error && !hasPair && (
        <div className="state-card error-state discover-state-card">
          <p>
            Profiles could not be loaded right now.
            Please try again.
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

      {hasPair && (
        <>
          <div className="discover-intro">
            <div>
              <span className="discover-kicker">
                Discover people
              </span>

              <h1>Find your people.</h1>

              <p>
                Choose the person you feel most connected
                to, or skip to discover another pair.
              </p>
            </div>

            <div className="discover-progress">
              <span>
                {progressTotal
                  ? `${progressCurrent} / ${progressTotal}`
                  : "Discover"}
              </span>

              <div
                className="discover-progress-track"
                aria-hidden="true"
              >
                <div
                  className="discover-progress-fill"
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pair-grid">
            <ProfileCard
              profile={currentPair[0]}
              variant="coral"
              onChoose={() => onChoose(0)}
              onReport={() =>
                onReport(currentPair[0])
              }
              onBlock={() =>
                onBlock(currentPair[0])
              }
            />

            <div
              className="or-badge"
              aria-hidden="true"
            >
              OR
            </div>

            <ProfileCard
              profile={currentPair[1]}
              variant="lavender"
              onChoose={() => onChoose(1)}
              onReport={() =>
                onReport(currentPair[1])
              }
              onBlock={() =>
                onBlock(currentPair[1])
              }
            />
          </div>

          <div className="discovery-controls">
            <button
              type="button"
              className="button lavender discovery-skip-button"
              onClick={onSkip}
            >
              Skip this pair
            </button>

            <span className="selection-count">
              {positiveSelections.length}{" "}
              {positiveSelections.length === 1
                ? "connection"
                : "connections"}
            </span>
          </div>
        </>
      )}
    </section>
  );
}