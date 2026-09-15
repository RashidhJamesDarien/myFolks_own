"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowUp,
  Check,
  FileText,
  Paperclip,
  Trash2,
  X,
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
  onDeleteMessage: (
    messageId: string,
    mode: "me" | "everyone",
  ) => Promise<boolean>;
};

function formatTime(timestamp?: string) {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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
  onDeleteMessage,
}: MessagesViewProps) {
  const bottomRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const messagesAreaRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const longPressTimerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const longPressTriggeredRef =
    useRef(false);

  const [
    menuMessage,
    setMenuMessage,
  ] =
    useState<ConversationMessage | null>(
      null,
    );

  const [
    menuPosition,
    setMenuPosition,
  ] = useState({
    x: 0,
    y: 0,
  });

  const [
    confirmingDelete,
    setConfirmingDelete,
  ] =
    useState<ConversationMessage | null>(
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

  const closeMenu = () => {
    setMenuMessage(null);
  };

  const clearLongPress = () => {
    if (
      longPressTimerRef.current
    ) {
      clearTimeout(
        longPressTimerRef.current,
      );

      longPressTimerRef.current =
        null;
    }
  };

  const openMessageMenu = (
    message: ConversationMessage,
    x: number,
    y: number,
  ) => {
    if (!activeConversation) {
      return;
    }

    /*
     * activeConversation is the OTHER person.
     *
     * Therefore:
     *
     * sender_id !== activeConversation.profile_id
     *
     * means this message was sent by the
     * currently authenticated user.
     */
    const isSent =
      message.sender_id !==
      activeConversation.profile_id;

    const menuWidth = 210;

    const menuHeight =
      isSent ? 104 : 62;

    const safeX = Math.min(
      x,
      window.innerWidth -
        menuWidth -
        12,
    );

    const safeY = Math.min(
      y,
      window.innerHeight -
        menuHeight -
        12,
    );

    setMenuMessage(message);

    setMenuPosition({
      x: Math.max(
        12,
        safeX,
      ),
      y: Math.max(
        12,
        safeY,
      ),
    });
  };

  useEffect(() => {
    const handlePointerDown =
      () => {
        closeMenu();
      };

    const handleEscape =
      (event: KeyboardEvent) => {
        if (
          event.key ===
          "Escape"
        ) {
          closeMenu();

          setConfirmingDelete(
            null,
          );
        }
      };

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );

      clearLongPress();
    };
  }, []);

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

  const handleContextMenu = (
    event: React.MouseEvent,
    message: ConversationMessage,
  ) => {
    event.preventDefault();

    openMessageMenu(
      message,
      event.clientX,
      event.clientY,
    );
  };

  const handleTouchStart = (
    event: React.TouchEvent,
    message: ConversationMessage,
  ) => {
    clearLongPress();

    longPressTriggeredRef.current =
      false;

    const touch =
      event.touches[0];

    if (!touch) {
      return;
    }

    const x =
      touch.clientX;

    const y =
      touch.clientY;

    longPressTimerRef.current =
      setTimeout(() => {
        longPressTriggeredRef.current =
          true;

        openMessageMenu(
          message,
          x,
          y,
        );
      }, 600);
  };

  const handleTouchMove = () => {
    clearLongPress();
  };

  const handleTouchEnd = () => {
    clearLongPress();
  };

  const handleTrashClick = (
    event: React.MouseEvent,
    message: ConversationMessage,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    clearLongPress();

    const rect =
      event.currentTarget.getBoundingClientRect();

    /*
     * Open the menu next to the trash button
     * instead of at the mouse cursor.
     */
    openMessageMenu(
      message,
      rect.left,
      rect.bottom + 8,
    );
  };

  const handleDeleteForMe =
    async () => {
      if (
        !menuMessage?.id
      ) {
        return;
      }

      const messageId =
        menuMessage.id;

      closeMenu();

      await onDeleteMessage(
        messageId,
        "me",
      );
    };

  const handleDeleteForEveryone =
    () => {
      if (
        !menuMessage?.id ||
        !activeConversation
      ) {
        return;
      }

      /*
       * Only the sender can delete a message
       * for everyone.
       */
      const isSent =
        menuMessage.sender_id !==
        activeConversation.profile_id;

      if (!isSent) {
        closeMenu();
        return;
      }

      const message =
        menuMessage;

      closeMenu();

      setConfirmingDelete(
        message,
      );
    };

  const confirmDeleteForEveryone =
    async () => {
      if (
        !confirmingDelete?.id
      ) {
        return;
      }

      const messageId =
        confirmingDelete.id;

      setConfirmingDelete(
        null,
      );

      await onDeleteMessage(
        messageId,
        "everyone",
      );
    };

  return (
    <section
      className={`myfolks-messages ${
        mobileOpen
          ? "mobile-chat-open"
          : ""
      }`}
    >
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
                      /*
                       * activeConversation is the OTHER
                       * person in the conversation.
                       *
                       * Therefore a message is sent by
                       * the current user when sender_id
                       * is different from their profile id.
                       */
                      const sent =
                        message.sender_id !==
                        activeConversation.profile_id;

                      const deletedForEveryone =
                        message.deleted_for_everyone ===
                        true;

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
                          } ${
                            deletedForEveryone
                              ? "deleted"
                              : ""
                          }`}
                          onContextMenu={(
                            event,
                          ) =>
                            handleContextMenu(
                              event,
                              message,
                            )
                          }
                          onTouchStart={(
                            event,
                          ) =>
                            handleTouchStart(
                              event,
                              message,
                            )
                          }
                          onTouchMove={
                            handleTouchMove
                          }
                          onTouchEnd={
                            handleTouchEnd
                          }
                          onTouchCancel={
                            handleTouchEnd
                          }
                        >
                          <button
                            type="button"
                            className="message-delete-trigger"
                            aria-label={`Delete message from ${formatTime(
                              message.created_at,
                            )}`}
                            title="Delete message"
                            onClick={(
                              event,
                            ) =>
                              handleTrashClick(
                                event,
                                message,
                              )
                            }
                          >
                            <Trash2
                              size={14}
                              strokeWidth={2}
                            />
                          </button>

                          <article className="message-bubble">
                            {deletedForEveryone ? (
                              <div className="deleted-message">
                                <Trash2
                                  size={13}
                                />

                                <span>
                                  Message deleted
                                </span>
                              </div>
                            ) : (
                              <>
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
                                    {
                                      message.text
                                    }
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
                              </>
                            )}
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

      {menuMessage &&
        activeConversation && (
          <div
            className="message-context-menu"
            style={{
              left:
                menuPosition.x,
              top:
                menuPosition.y,
            }}
            onPointerDown={(event) =>
              event.stopPropagation()
            }
            onContextMenu={(event) =>
              event.preventDefault()
            }
          >
            <button
              type="button"
              className="message-context-action"
              onClick={
                handleDeleteForMe
              }
            >
              <Trash2 size={15} />

              <span>
                Delete for me
              </span>
            </button>

            {menuMessage.sender_id !==
              activeConversation.profile_id && (
              <button
                type="button"
                className="message-context-action danger"
                onClick={
                  handleDeleteForEveryone
                }
              >
                <Trash2 size={15} />

                <span>
                  Delete for everyone
                </span>
              </button>
            )}
          </div>
        )}

      {confirmingDelete && (
        <div
          className="delete-confirm-overlay"
          role="presentation"
          onPointerDown={() =>
            setConfirmingDelete(
              null,
            )
          }
        >
          <div
            className="delete-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-message-title"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="delete-confirm-icon">
              <Trash2 size={18} />
            </div>

            <div className="delete-confirm-copy">
              <h3 id="delete-message-title">
                Delete for everyone?
              </h3>

              <p>
                This message will be
                removed for both you
                and the other person.
              </p>
            </div>

            <div className="delete-confirm-actions">
              <button
                type="button"
                className="delete-cancel-button"
                onClick={() =>
                  setConfirmingDelete(
                    null,
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-button"
                onClick={
                  confirmDeleteForEveryone
                }
              >
                Delete
              </button>
            </div>

            <button
              type="button"
              className="delete-confirm-close"
              onClick={() =>
                setConfirmingDelete(
                  null,
                )
              }
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}