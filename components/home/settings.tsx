"use client";

import React from "react";

import { Eyebrow } from "./Eyebrow";
import { StatusMessage } from "./StatusMessage";
import { RadioGrid } from "./RadioGrid";
import { ToggleRow } from "./ToggleRow";

import type {
  Settings,
  StatusValue,
} from "./types";

export function SettingsView({
  settings,
  status,
  blockedCount,
  onChange,
  onSave,
  onDelete,
  onSignOut,
}: {
  settings: Settings;
  status: StatusValue;
  blockedCount: number;
  onChange: (
    settings: Settings,
  ) => void;
  onSave: (
    event: React.FormEvent<HTMLFormElement>,
  ) => void;
  onDelete: () => void;
  onSignOut: () => void;
}) {
  return (
    <section className="view-panel">
      <div className="settings-heading">
        <Eyebrow>
          Your controls
        </Eyebrow>

        <h1>Settings</h1>

        <p className="section-copy">
          Choose how you appear, who
          can contact you, and how
          myFolks communicates with
          you.
        </p>
      </div>

      <form
        className="settings-form"
        onSubmit={onSave}
      >
        <SettingsSection
          title="Profile visibility"
        >
          <RadioGrid
            name="visibility"
            value={
              settings.visibility
            }
            options={[
              [
                "published",
                "Published — show my profile in Discover",
              ],
              [
                "unpublished",
                "Unpublished — hide my profile from Discover",
              ],
            ]}
            onChange={(value) =>
              onChange({
                ...settings,
                visibility:
                  value,
              })
            }
          />
        </SettingsSection>

        <SettingsSection
          title="Last seen visibility"
        >
          <RadioGrid
            name="lastSeenVisibility"
            value={
              settings.lastSeenVisibility
            }
            options={[
              [
                "everyone",
                "Everyone",
              ],
              [
                "friends",
                "Friends",
              ],
              [
                "nobody",
                "Nobody",
              ],
            ]}
            onChange={(value) =>
              onChange({
                ...settings,
                lastSeenVisibility:
                  value as Settings["lastSeenVisibility"],
              })
            }
          />
        </SettingsSection>

        <SettingsSection
          title="Featured interest display"
        >
          <ToggleRow
            label="Show my featured interest in Discover"
            checked={
              settings.interestDisplay
            }
            onChange={(checked) =>
              onChange({
                ...settings,
                interestDisplay:
                  checked,
              })
            }
          />
        </SettingsSection>

        <SettingsSection
          title="Message permissions"
        >
          <RadioGrid
            name="messagePermission"
            value={
              settings.messagePermission
            }
            options={[
              [
                "friends_only",
                "Friends only",
              ],
              [
                "requests",
                "Allow message requests",
              ],
            ]}
            onChange={(value) =>
              onChange({
                ...settings,
                messagePermission:
                  value,
              })
            }
          />
        </SettingsSection>

        <SettingsSection
          title="Notifications"
        >
          <div className="toggle-stack">
            <ToggleRow
              label="Friend requests"
              checked={
                settings.friendNotifications
              }
              onChange={(checked) =>
                onChange({
                  ...settings,
                  friendNotifications:
                    checked,
                })
              }
            />

            <ToggleRow
              label="Messages"
              checked={
                settings.messageNotifications
              }
              onChange={(checked) =>
                onChange({
                  ...settings,
                  messageNotifications:
                    checked,
                })
              }
            />
          </div>
        </SettingsSection>

        <button
          type="submit"
          className="button primary"
        >
          Save settings
        </button>

        {status && (
          <StatusMessage
            text={status.text}
            type={status.type}
          />
        )}
      </form>

      <div className="safety-card">
        <h2>
          Privacy and safety
        </h2>

        <div className="safety-grid">
          <button
            type="button"
            className="safety-button lavender-bg"
          >
            Blocked profiles (
            {blockedCount})
          </button>

          <button
            type="button"
            className="safety-button danger-bg"
          >
            Report an issue
          </button>

          <button
            type="button"
            className="safety-button danger-outline"
            onClick={onDelete}
          >
            Delete account
          </button>

          <button
            type="button"
            className="safety-button outline-bg"
            onClick={onSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </section>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-section">
      <h2>{title}</h2>

      {children}
    </section>
  );
}