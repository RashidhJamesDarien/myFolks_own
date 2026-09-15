"use client";

import React from "react";
import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import { Eyebrow } from "./Eyebrow";
import { StatusMessage } from "./StatusMessage";
import type { Profile, StatusValue } from "./types";

export function MessagesView({
  friends,
  activeProfile,
  mobileOpen,
  messageText,
  messageAsset,
  messageStatus,
  messageSending,
  messageCount,
  fileInputRef,
  onSelect,
  onBack,
  onTextChange,
  onFile,
  onRemoveAsset,
  onSend,
}: {
  friends: Profile[];
  activeProfile: Profile | null;
  mobileOpen: boolean;
  messageText: string;
  messageAsset: File | null;
  messageStatus: StatusValue;
  messageSending: boolean;
  messageCount: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (profile: Profile) => void;
  onBack: () => void;
  onTextChange: (value: string) => void;
  onFile: (file?: File) => void;
  onRemoveAsset: () => void;
  onSend: (
    event: React.FormEvent<HTMLFormElement>,
  ) => void;
}) {
  return (
    <section className="view-panel">
      <Eyebrow>Conversations</Eyebrow>

      <h1>Messages</h1>

      <div
        className={`messages-shell ${
          mobileOpen ? "chat-open" : ""
        }`}
      >
        <aside className="conversation-list-pane">
          <div className="conversation-heading">
            <h2>Connections</h2>

            <span>{friends.length}</span>
          </div>

          <div className="conversation-list">
            {!friends.length ? (
              <div className="conversation-empty">
                <Icon name="handshake" size={32} />

                <p>
                  Your accepted connections will appear
                  here. Choose common ground first, then
                  keep the conversation kind.
                </p>
              </div>
            ) : (
              friends.map((friend) => (
                <button
                  type="button"
                  className={`conversation-item ${
                    activeProfile?.profile_id ===
                    friend.profile_id
                      ? "selected"
                      : ""
                  }`}
                  key={friend.profile_id}
                  onClick={() =>
                    onSelect(friend)
                  }
                >
                  <Avatar profile={friend} />

                  <span>
                    <strong>
                      {friend.display_name}
                    </strong>

                    <small>
                      {friend.featured_interest}
                    </small>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        {!activeProfile ? (
          <div className="messages-no-selection">
            <Icon name="messages" size={42} />

            <h2>Choose a conversation</h2>

            <p>
              Select an accepted connection to see your
              shared conversation here.
            </p>
          </div>
        ) : (
          <section className="conversation-pane">
            <header className="conversation-header">
              <button
                type="button"
                className="mobile-back-button"
                onClick={onBack}
                aria-label="Back to conversations"
              >
                <Icon name="arrowLeft" size={20} />
              </button>

              <Avatar profile={activeProfile} />

              <div>
                <h2>
                  {activeProfile.display_name}
                </h2>

                <p>Presence unavailable</p>
              </div>

              <button
                type="button"
                className="conversation-more"
                aria-label="Conversation options"
              >
                <Icon name="more" size={22} />
              </button>
            </header>

            <div className="message-thread">
              <div className="message-empty">
                <Icon name="sparkle" size={32} />

                <p>
                  Start with what you both enjoy:{" "}
                  <strong>
                    {activeProfile.featured_interest}
                  </strong>
                  .
                </p>
              </div>
            </div>

            <div className="message-composer">
              <form onSubmit={onSend}>
                <div className="composer-row">
                  <textarea
                    value={messageText}
                    onChange={(event) =>
                      onTextChange(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();

                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    rows={2}
                    maxLength={280}
                    placeholder="Write something kind..."
                  />

                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept="image/*,.pdf,.txt,.doc,.docx"
                    onChange={(event) =>
                      onFile(event.target.files?.[0])
                    }
                  />

                  <button
                    type="button"
                    className="button outline"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                  >
                    Attach
                  </button>

                  <button
                    type="submit"
                    className="button primary"
                    disabled={messageSending}
                  >
                    {messageSending
                      ? "Sending..."
                      : "Send message"}
                  </button>
                </div>

                {messageAsset && (
                  <div className="attachment-preview">
                    <span>{messageAsset.name}</span>

                    <button
                      type="button"
                      onClick={onRemoveAsset}
                    >
                      Remove
                    </button>
                  </div>
                )}

                {messageStatus && (
                  <StatusMessage
                    text={messageStatus.text}
                    type={messageStatus.type}
                  />
                )}
              </form>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
