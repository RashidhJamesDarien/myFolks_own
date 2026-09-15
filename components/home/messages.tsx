"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  ArrowLeft,
  ArrowUp,
  Check,
  FileText,
  Paperclip,
} from "lucide-react";

import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

import type {
  MessageAsset,
  Profile,
  StatusValue,
} from "./types";

import type {
  ConversationMessage,
  ConversationProfile,
} from "./hooks/useMessaging";

type MessagesViewProps = {
  friends: Profile[];
  activeProfile: Profile | null;
  conversationProfile?: ConversationProfile | null;
  mobileOpen: boolean;
  messageText: string;
  messageAsset: MessageAsset | null;
  messageStatus: StatusValue;
  messageSending: boolean;
  messageLoading: boolean;
  messages: ConversationMessage[];
  messageCount: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (profile: Profile) => void;
  onBack: () => void;
  onTextChange: (value: string) => void;
  onFile: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onRemoveAsset: () => void;
  onSend: () => void;
};

function getInitials(
  profile:
    | Profile
    | ConversationProfile
    | null,
) {
  if (!profile) {
    return "?";
  }

  const value =
    profile.display_name?.trim() ||
    profile.username?.trim() ||
    "?";

  return value
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase() ?? "",
    )
    .join("");
}

function formatTime(timestamp?: string) {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(date);
}

function getLastSeenLabel(
  timestamp?: string | null,
) {
  if (!timestamp) {
    return "last seen unavailable";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "last seen unavailable";
  }

  const age =
    Date.now() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (age < 2 * minute) {
    return "online";
  }

  if (age < hour) {
    const minutes = Math.max(
      1,
      Math.floor(age / minute),
    );

    return `last seen ${minutes} ${
      minutes === 1
        ? "minute"
        : "minutes"
    } ago`;
  }

  if (age < day) {
    const hours = Math.floor(
      age / hour,
    );

    return `last seen ${hours} ${
      hours === 1
        ? "hour"
        : "hours"
    } ago`;
  }

  const days = Math.floor(
    age / day,
  );

  if (days < 7) {
    return `last seen ${days} ${
      days === 1
        ? "day"
        : "days"
    } ago`;
  }

  return `last seen ${new Intl.DateTimeFormat(
    undefined,
    {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !==
        new Date().getFullYear()
          ? "numeric"
          : undefined,
    },
  ).format(date)}`;
}

function isOnline(
  timestamp?: string | null,
) {
  if (!timestamp) {
    return false;
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    Date.now() -
      date.getTime() <
    2 * 60 * 1000
  );
}

export function MessagesView({
  friends,
  activeProfile,
  conversationProfile,
  mobileOpen,
  messageText,
  messageAsset,
  messageStatus,
  messageSending,
  messageLoading,
  messages,
  messageCount,
  fileInputRef,
  onSelect,
  onBack,
  onTextChange,
  onFile,
  onRemoveAsset,
  onSend,
}: MessagesViewProps) {
  const bottomRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const activeConversation =
    conversationProfile ??
    activeProfile;

  const presenceLabel =
    useMemo(
      () =>
        getLastSeenLabel(
          activeConversation?.last_seen_at,
        ),
      [
        activeConversation?.last_seen_at,
      ],
    );

  const online = isOnline(
    activeConversation?.last_seen_at,
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [
    messages.length,
    messageLoading,
  ]);

  return (
    <section className="myfolks-messages">
      <style jsx>{`
        .myfolks-messages {
          width: 100%;
          max-width: 1240px;
          margin: 0 auto;
          min-height: calc(100vh - 150px);
          display: grid;
          grid-template-columns: 330px minmax(0, 1fr);
          gap: 14px;
          padding: 18px;
          color: #e9e9e7;
        }

        .message-panel,
        .conversation-panel {
          min-height: 650px;
          border: 1px solid
            rgba(255, 255, 255, 0.075);
          background: #111211;
          border-radius: 24px;
          overflow: hidden;
          box-shadow:
            0 20px 60px
              rgba(0, 0, 0, 0.2),
            inset 0 1px 0
              rgba(255, 255, 255, 0.025);
        }

        .message-panel {
          display: flex;
          flex-direction: column;
        }

        .panel-heading {
          padding: 22px 20px 16px;
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.065);
        }

        .panel-eyebrow {
          margin: 0 0 5px;
          color: #8d918c;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .panel-title {
          margin: 0;
          color: #f3f3f0;
          font-size: 21px;
          line-height: 1.15;
          font-weight: 650;
          letter-spacing: -0.025em;
        }

        .conversation-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .conversation-button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 0;
          border-radius: 16px;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            background 160ms ease,
            transform 160ms ease;
        }

        .conversation-button:hover {
          background: #181a18;
        }

        .conversation-button:active {
          transform: scale(0.99);
        }

        .conversation-button.active {
          background: #1b1d1b;
          box-shadow:
            inset 0 0 0 1px
              rgba(255, 255, 255, 0.045);
        }

        .avatar-wrap {
          position: relative;
          flex: 0 0 auto;
        }

        .presence-dot {
          position: absolute;
          right: -1px;
          bottom: -1px;
          width: 9px;
          height: 9px;
          border: 2px solid #111211;
          border-radius: 999px;
          background: #656964;
        }

        .presence-dot.online {
          background: #b8d3b4;
        }

        .conversation-copy {
          min-width: 0;
          flex: 1;
        }

        .conversation-name {
          overflow: hidden;
          color: #e8e9e5;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .conversation-username {
          margin-top: 2px;
          overflow: hidden;
          color: #777b76;
          font-size: 12px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .empty-list {
          padding: 36px 22px;
          color: #7f837e;
          font-size: 13px;
          line-height: 1.6;
          text-align: center;
        }

        .conversation-panel {
          display: flex;
          flex-direction: column;
          min-width: 0;
          background: #0f100f;
        }

        .conversation-header {
          min-height: 78px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 18px;
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.065);
          background: #121312;
        }

        .back-button {
          display: none;
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          background: #191b19;
          color: #d8dad6;
          cursor: pointer;
        }

        .header-avatar {
          position: relative;
          flex: 0 0 auto;
        }

        .header-presence {
          position: absolute;
          right: -1px;
          bottom: -1px;
          width: 10px;
          height: 10px;
          border: 2px solid #121312;
          border-radius: 999px;
          background: #666a65;
        }

        .header-presence.online {
          background: #b8d3b4;
        }

        .header-copy {
          min-width: 0;
          flex: 1;
        }

        .header-name {
          overflow: hidden;
          margin: 0;
          color: #f0f1ed;
          font-size: 15px;
          line-height: 1.2;
          font-weight: 650;
          letter-spacing: -0.01em;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .header-presence-text {
          margin-top: 4px;
          color: #7f837e;
          font-size: 11px;
          line-height: 1.2;
        }

        .header-presence-text.online {
          color: #aeb9aa;
        }

        .message-count {
          flex: 0 0 auto;
          color: #696d68;
          font-size: 11px;
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 26px 24px 22px;
          background:
            radial-gradient(
              circle at 80% 0%,
              rgba(255, 255, 255, 0.018),
              transparent 30%
            ),
            #0f100f;
        }

        .welcome-state {
          min-height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 50px 25px;
          text-align: center;
        }

        .welcome-inner {
          max-width: 390px;
        }

        .welcome-mark {
          width: 50px;
          height: 50px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 17px;
          background: #191b19;
          color: #d9dbd7;
        }

        .welcome-title {
          margin: 0;
          color: #eceeea;
          font-size: 19px;
          font-weight: 650;
          letter-spacing: -0.02em;
        }

        .welcome-copy {
          margin: 8px 0 0;
          color: #747873;
          font-size: 13px;
          line-height: 1.65;
        }

        .message-loading {
          display: flex;
          justify-content: center;
          padding: 30px;
          color: #696d68;
          font-size: 12px;
        }

        .message-stack {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .message-row {
          display: flex;
          width: 100%;
        }

        .message-row.received {
          justify-content: flex-start;
        }

        .message-row.sent {
          justify-content: flex-end;
        }

        .message-bubble {
          max-width: min(72%, 620px);
          padding: 10px 13px 8px;
          border-radius: 16px;
          font-size: 13px;
          line-height: 1.5;
          word-break: break-word;
        }

        .message-row.received
          .message-bubble {
          border: 1px solid
            rgba(255, 255, 255, 0.065);
          border-top-left-radius: 5px;
          background: #191b19;
          color: #dfe1dd;
        }

        .message-row.sent
          .message-bubble {
          border: 1px solid
            rgba(255, 255, 255, 0.085);
          border-top-right-radius: 5px;
          background: #262926;
          color: #f0f1ed;
        }

        .message-text {
          white-space: pre-wrap;
        }

        .message-meta {
          margin-top: 4px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 5px;
          color: #747873;
          font-size: 9px;
        }

        .sent-check {
          display: inline-flex;
          align-items: center;
          color: #9ba29a;
        }

        .attachment-card {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 7px;
          padding: 9px;
          border: 1px solid
            rgba(255, 255, 255, 0.075);
          border-radius: 11px;
          background: rgba(
            255,
            255,
            255,
            0.035
          );
          color: inherit;
          text-decoration: none;
        }

        .attachment-icon {
          width: 31px;
          height: 31px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          border-radius: 9px;
          background: rgba(
            255,
            255,
            255,
            0.06
          );
          color: #b9bdb7;
        }

        .attachment-name {
          overflow: hidden;
          color: #d9dcd7;
          font-size: 11px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .composer {
          padding: 13px 15px 15px;
          border-top: 1px solid
            rgba(255, 255, 255, 0.065);
          background: #121312;
        }

        .asset-preview {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 9px;
          padding: 9px 11px;
          border: 1px solid
            rgba(255, 255, 255, 0.075);
          border-radius: 12px;
          background: #191b19;
        }

        .asset-preview-name {
          overflow: hidden;
          color: #c8cbc6;
          font-size: 11px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .asset-remove {
          border: 0;
          background: transparent;
          color: #8a8e89;
          font-size: 11px;
          cursor: pointer;
        }

        .asset-remove:hover {
          color: #d7d9d5;
        }

        .composer-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding: 7px;
          border: 1px solid
            rgba(255, 255, 255, 0.075);
          border-radius: 17px;
          background: #191b19;
        }

        .file-button,
        .send-button {
          width: 36px;
          height: 36px;
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 11px;
          cursor: pointer;
        }

        .file-button {
          background: transparent;
          color: #898e88;
        }

        .file-button:hover {
          background: #222522;
          color: #c7cbc5;
        }

        .send-button {
          background: #e5e7e2;
          color: #171917;
          transition:
            transform 150ms ease,
            opacity 150ms ease;
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .send-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .composer-input {
          flex: 1;
          min-width: 0;
          min-height: 36px;
          max-height: 110px;
          resize: none;
          border: 0;
          outline: 0;
          background: transparent;
          color: #e6e8e3;
          font: inherit;
          font-size: 13px;
          line-height: 1.45;
          padding: 9px 4px;
        }

        .composer-input::placeholder {
          color: #686c67;
        }

        .composer-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 4px 0;
        }

        .composer-hint {
          color: #5f635e;
          font-size: 10px;
        }

        .composer-status {
          color: #a9aea7;
          font-size: 10px;
        }

        .composer-status.error {
          color: #c19a91;
        }

        .composer-status.info {
          color: #969c94;
        }

        .composer-status.success {
          color: #a9b5a5;
        }

        @media (max-width: 800px) {
          .myfolks-messages {
            min-height: calc(100vh - 110px);
            grid-template-columns: 1fr;
            padding: 10px;
          }

          .message-panel {
            display: none;
          }

          .conversation-panel {
            min-height: calc(
              100vh - 130px
            );
          }

          .conversation-panel.mobile-active {
            display: flex;
          }

          .back-button {
            display: flex;
          }

          .messages-area {
            padding: 20px 13px 18px;
          }

          .message-bubble {
            max-width: 84%;
          }
        }

        @media (min-width: 801px) {
          .conversation-panel {
            display: flex;
          }
        }

        @media (max-width: 800px) {
          .conversation-panel:not(
              .mobile-active
            ) {
            display: none;
          }
        }
      `}</style>

      <aside className="message-panel">
        <div className="panel-heading">
          <p className="panel-eyebrow">
            Connected
          </p>

          <h1 className="panel-title">
            Messages
          </h1>
        </div>

        <div className="conversation-list">
          {friends.length === 0 ? (
            <div className="empty-list">
              Your accepted friends will
              appear here.
            </div>
          ) : (
            friends.map((friend) => (
              <button
                key={friend.profile_id}
                type="button"
                className={`conversation-button ${
                  activeProfile?.profile_id ===
                  friend.profile_id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  onSelect(friend)
                }
              >
                <div className="avatar-wrap">
                  <Avatar
                    profile={friend}
                  />

                  <span
                    className={`presence-dot ${
                      isOnline(
                        friend.last_seen_at,
                      )
                        ? "online"
                        : ""
                    }`}
                  />
                </div>

                <div className="conversation-copy">
                  <div className="conversation-name">
                    {friend.display_name}
                  </div>

                  <div className="conversation-username">
                    {friend.username
                      ? `@${friend.username}`
                      : "myFolks connection"}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section
        className={`conversation-panel ${
          mobileOpen
            ? "mobile-active"
            : ""
        }`}
      >
        {!activeConversation ? (
          <div className="welcome-state">
            <div className="welcome-inner">
              <div className="welcome-mark">
                <Icon
                  name="message"
                  size={22}
                />
              </div>

              <h2 className="welcome-title">
                Start a conversation
              </h2>

              <p className="welcome-copy">
                Choose a friend to open
                a private conversation.
                Your messages stay in
                this connection.
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="conversation-header">
              <button
                type="button"
                className="back-button"
                onClick={onBack}
                aria-label="Back to conversations"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="header-avatar">
                <Avatar
                  profile={
                    activeConversation
                  }
                />

                <span
                  className={`header-presence ${
                    online
                      ? "online"
                      : ""
                  }`}
                />
              </div>

              <div className="header-copy">
                <h2 className="header-name">
                  {
                    activeConversation.display_name
                  }
                </h2>

                <div
                  className={`header-presence-text ${
                    online
                      ? "online"
                      : ""
                  }`}
                >
                  {presenceLabel}
                </div>
              </div>

              <div className="message-count">
                {messageCount}
              </div>
            </header>

            <div className="messages-area">
              {messageLoading ? (
                <div className="message-loading">
                  Loading conversation…
                </div>
              ) : messages.length === 0 ? (
                <div className="welcome-state">
                  <div className="welcome-inner">
                    <div className="welcome-mark">
                      <Icon
                        name="message"
                        size={21}
                      />
                    </div>

                    <h2 className="welcome-title">
                      No messages yet
                    </h2>

                    <p className="welcome-copy">
                      Start the conversation
                      with{" "}
                      {
                        activeConversation.display_name
                      }
                      .
                    </p>
                  </div>
                </div>
              ) : (
                <div className="message-stack">
                  {messages.map(
                    (
                      message,
                      index,
                    ) => {
                      const sent =
                        message.sender_id !==
                        activeConversation.profile_id;

                      return (
                        <div
                          key={
                            message.id ??
                            `${message.created_at}-${index}`
                          }
                          className={`message-row ${
                            sent
                              ? "sent"
                              : "received"
                          }`}
                        >
                          <article className="message-bubble">
                            {message.message_asset_url && (
                              <a
                                href={
                                  message.message_asset_url
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="attachment-card"
                              >
                                <span className="attachment-icon">
                                  <FileText
                                    size={15}
                                  />
                                </span>

                                <span className="attachment-name">
                                  {message.message_asset_name ??
                                    "Attachment"}
                                </span>
                              </a>
                            )}

                            {message.text && (
                              <div className="message-text">
                                {message.text}
                              </div>
                            )}

                            <div className="message-meta">
                              <span>
                                {formatTime(
                                  message.created_at,
                                )}
                              </span>

                              {sent && (
                                <span className="sent-check">
                                  <Check size={11} />
                                </span>
                              )}
                            </div>
                          </article>
                        </div>
                      );
                    },
                  )}

                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault();
                onSend();
              }}
            >
              {messageAsset && (
                <div className="asset-preview">
                  <span className="asset-preview-name">
                    {messageAsset.name ??
                      "Attachment selected"}
                  </span>

                  <button
                    type="button"
                    className="asset-remove"
                    onClick={onRemoveAsset}
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="composer-row">
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  onChange={onFile}
                />

                <button
                  type="button"
                  className="file-button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  aria-label="Attach file"
                  title="Attach file"
                >
                  <Paperclip size={17} />
                </button>

                <textarea
                  value={messageText}
                  onChange={(event) =>
                    onTextChange(
                      event.target.value,
                    )
                  }
                  placeholder="Write something…"
                  className="composer-input"
                  rows={1}
                  maxLength={280}
                />

                <button
                  type="submit"
                  className="send-button"
                  disabled={
                    messageSending ||
                    (!messageText.trim() &&
                      !messageAsset)
                  }
                  aria-label="Send message"
                  title="Send message"
                >
                  <ArrowUp
                    size={17}
                    strokeWidth={2.4}
                  />
                </button>
              </div>

              <div className="composer-footer">
                <span className="composer-hint">
                  280 characters
                </span>

                {messageStatus && (
                  <span
                    className={`composer-status ${messageStatus.type}`}
                  >
                    {messageStatus.text}
                  </span>
                )}
              </div>
            </form>
          </>
        )}
      </section>
    </section>
  );
}