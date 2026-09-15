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

  const messagesAreaRef =
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
    const container =
      messagesAreaRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    const nearBottom =
      distanceFromBottom < 160;

    if (nearBottom) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [
    messages.length,
    messageLoading,
  ]);

  return (
    <section className="myfolks-messages">
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

            <div
              ref={messagesAreaRef}
              className="messages-area"
            >
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

                if (
                  !messageSending &&
                  (messageText.trim() ||
                    messageAsset)
                ) {
                  onSend();
                }
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
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                        "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();

                      if (
                        !messageSending &&
                        (messageText.trim() ||
                          messageAsset)
                      ) {
                        onSend();
                      }
                    }
                  }}
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
                  Enter to send · Shift + Enter for a new line
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