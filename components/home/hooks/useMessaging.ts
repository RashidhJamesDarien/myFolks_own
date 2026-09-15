"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "@/src/lib/supabase";

import {
  API,
  MAX_MESSAGE_ASSET_SIZE,
} from "@/components/home/constants";

import type {
  MessageAsset,
  Profile,
  StatusValue,
} from "@/components/home/types";

import {
  apiRequest,
} from "@/components/home/utils";

export type ConversationMessage = {
  id?: string;
  sender_id: string;
  recipient_id: string;
  text: string;
  message_asset_url?: string;
  message_asset_name?: string;
  message_asset_type?: string;
  message_asset_size?: number;
  created_at: string;

  deleted_for_sender?: boolean;
  deleted_for_recipient?: boolean;
  deleted_for_everyone?: boolean;
};

export type ConversationProfile =
  Profile;

type MessagesResponse = {
  messages?: ConversationMessage[];
  count?: number;
  profile?: ConversationProfile;
};

type SendMessageResponse = {
  message?: ConversationMessage;
};

type DeleteMessageResponse = {
  success?: boolean;
  mode?: "me" | "everyone";
  message_id?: string;
};

type UseMessagingOptions = {
  backendConnected: boolean;
  isAcceptedFriend: (
    profileId: string,
  ) => boolean;
};

export function useMessaging({
  backendConnected,
  isAcceptedFriend,
}: UseMessagingOptions) {
  const [
    activeProfile,
    setActiveProfile,
  ] = useState<Profile | null>(null);

  const [
    conversationProfile,
    setConversationProfile,
  ] = useState<ConversationProfile | null>(
    null,
  );

  const [open, setOpen] =
    useState(false);

  const [text, setText] =
    useState("");

  const [asset, setAsset] =
    useState<MessageAsset | null>(
      null,
    );

  const [status, setStatus] =
    useState<StatusValue>(null);

  const [sending, setSending] =
    useState(false);

  const [
    loadingMessages,
    setLoadingMessages,
  ] = useState(false);

  const [
    messages,
    setMessages,
  ] = useState<
    ConversationMessage[]
  >([]);

  const [count, setCount] =
    useState(0);

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const conversationRequestId =
    useRef(0);

  const presenceTimerRef =
    useRef<ReturnType<
      typeof setInterval
    > | null>(null);

  const updatePresence =
    useCallback(async () => {
      if (!backendConnected) {
        return;
      }

      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (
          !session?.access_token
        ) {
          return;
        }

        await fetch(
          API.presence,
          {
            method: "POST",
            headers: {
              Accept:
                "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
          },
        );
      } catch (error) {
        console.debug(
          "Presence update skipped:",
          error,
        );
      }
    }, [backendConnected]);

  useEffect(() => {
    if (!backendConnected) {
      return;
    }

    void updatePresence();

    presenceTimerRef.current =
      setInterval(
        () => {
          void updatePresence();
        },
        60_000,
      );

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void updatePresence();
        }
      };

    const handleActivity =
      () => {
        void updatePresence();
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    window.addEventListener(
      "focus",
      handleActivity,
    );

    return () => {
      if (
        presenceTimerRef.current
      ) {
        clearInterval(
          presenceTimerRef.current,
        );

        presenceTimerRef.current =
          null;
      }

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );

      window.removeEventListener(
        "focus",
        handleActivity,
      );
    };
  }, [
    backendConnected,
    updatePresence,
  ]);

  const loadMessages =
    useCallback(
      async (
        profileId: string,
        options?: {
          silent?: boolean;
        },
      ) => {
        const requestId =
          ++conversationRequestId.current;

        if (!options?.silent) {
          setLoadingMessages(
            true,
          );
        }

        try {
          if (
            !backendConnected
          ) {
            throw new Error(
              "The messaging service is currently unavailable.",
            );
          }

          if (
            !isAcceptedFriend(
              profileId,
            )
          ) {
            throw new Error(
              "You can only message accepted friends.",
            );
          }

          const response =
            await apiRequest<MessagesResponse>(
              `${API.messages}?profile_id=${encodeURIComponent(
                profileId,
              )}`,
              {
                method: "GET",
              },
            );

          if (
            requestId !==
            conversationRequestId.current
          ) {
            return;
          }

          setMessages(
            response.messages ??
              [],
          );

          setCount(
            response.count ??
              response.messages
                ?.length ??
              0,
          );

          if (
            response.profile
          ) {
            setConversationProfile(
              response.profile,
            );
          }
        } catch (error) {
          if (
            requestId !==
            conversationRequestId.current
          ) {
            return;
          }

          console.error(
            "Failed to load messages:",
            error,
          );

          setStatus({
            text:
              error instanceof Error
                ? error.message
                : "Messages could not be loaded.",
            type: "error",
          });
        } finally {
          if (
            requestId ===
            conversationRequestId.current
          ) {
            setLoadingMessages(
              false,
            );
          }
        }
      },
      [
        backendConnected,
        isAcceptedFriend,
      ],
    );

  const openConversation =
    useCallback(
      (profile: Profile) => {
        if (
          !isAcceptedFriend(
            profile.profile_id,
          )
        ) {
          setStatus({
            text:
              "You can message this person after they accept your friend request.",
            type: "info",
          });

          return;
        }

        setActiveProfile(
          profile,
        );

        setConversationProfile(
          profile,
        );

        setOpen(true);
        setText("");
        setAsset(null);
        setStatus(null);

        void loadMessages(
          profile.profile_id,
        );
      },
      [
        isAcceptedFriend,
        loadMessages,
      ],
    );

  const changeText =
    useCallback(
      (value: string) => {
        if (
          value.length <= 280
        ) {
          setText(value);
        }
      },
      [],
    );

  const chooseAsset =
    useCallback(
      (
        event: React.ChangeEvent<HTMLInputElement>,
      ) => {
        const file =
          event.target.files?.[0];

        if (!file) {
          return;
        }

        if (
          file.size >
          MAX_MESSAGE_ASSET_SIZE
        ) {
          setStatus({
            text:
              "Attachments must be 10 MB or smaller.",
            type: "error",
          });

          event.target.value = "";
          return;
        }

        setAsset({
          url: "",
          name: file.name,
          type: file.type,
          size: file.size,
        });

        setStatus(null);
      },
      [],
    );

  const removeAsset =
    useCallback(() => {
      setAsset(null);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }, []);

  const sendMessage =
    useCallback(async () => {
      if (
        !activeProfile ||
        sending
      ) {
        return;
      }

      const trimmedText =
        text.trim();

      if (
        !trimmedText &&
        !asset
      ) {
        return;
      }

      if (
        !isAcceptedFriend(
          activeProfile.profile_id,
        )
      ) {
        setStatus({
          text:
            "You can only message accepted friends.",
          type: "error",
        });

        return;
      }

      setSending(true);
      setStatus(null);

      try {
        let uploadedAsset:
          | MessageAsset
          | null = null;

        if (asset) {
          const file =
            fileInputRef.current
              ?.files?.[0];

          if (!file) {
            throw new Error(
              "The selected attachment is no longer available.",
            );
          }

          const {
            data: { session },
          } =
            await supabase.auth.getSession();

          if (
            !session?.access_token
          ) {
            throw new Error(
              "Your session has expired. Please sign in again.",
            );
          }

          const formData =
            new FormData();

          formData.append(
            "file",
            file,
          );

          const uploadResponse =
            await fetch(
              API.messageAssets,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: formData,
              },
            );

          const uploadData =
            (await uploadResponse.json()) as
              | MessageAsset
              | {
                  error?: string;
                };

          if (
            !uploadResponse.ok
          ) {
            throw new Error(
              "error" in
                uploadData &&
              typeof uploadData.error ===
                "string"
                ? uploadData.error
                : "The attachment could not be uploaded.",
            );
          }

          uploadedAsset =
            uploadData as MessageAsset;
        }

        const response =
          await apiRequest<SendMessageResponse>(
            API.messages,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                {
                  profile_id:
                    activeProfile.profile_id,
                  text: trimmedText,
                  message_asset_url:
                    uploadedAsset?.url ??
                    null,
                  message_asset_name:
                    uploadedAsset?.name ??
                    null,
                  message_asset_type:
                    uploadedAsset?.type ??
                    null,
                  message_asset_size:
                    uploadedAsset?.size ??
                    null,
                },
              ),
            },
          );

        if (
          response.message
        ) {
          setMessages(
            (previous) => [
              ...previous,
              response.message!,
            ],
          );

          setCount(
            (previous) =>
              previous + 1,
          );
        }

        setText("");
        setAsset(null);

        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            "";
        }

        await loadMessages(
          activeProfile.profile_id,
          {
            silent: true,
          },
        );

        void updatePresence();
      } catch (error) {
        console.error(
          "Failed to send message:",
          error,
        );

        setStatus({
          text:
            error instanceof Error
              ? error.message
              : "The message could not be sent.",
          type: "error",
        });
      } finally {
        setSending(false);
      }
    }, [
      activeProfile,
      asset,
      isAcceptedFriend,
      loadMessages,
      sending,
      text,
      updatePresence,
    ]);

  /* =========================================================
     DELETE MESSAGE
     ========================================================= */

  const deleteMessage =
    useCallback(
      async (
        messageId: string,
        mode: "me" | "everyone",
      ): Promise<boolean> => {
        if (!messageId) {
          console.error(
            "Delete message called without a message ID.",
          );

          setStatus({
            text:
              "The message could not be identified.",
            type: "error",
          });

          return false;
        }

        if (!backendConnected) {
          setStatus({
            text:
              "The messaging service is currently unavailable.",
            type: "error",
          });

          return false;
        }

        if (!activeProfile) {
          setStatus({
            text:
              "No conversation is currently open.",
            type: "error",
          });

          return false;
        }

        try {
          console.log(
            "Deleting message:",
            {
              messageId,
              mode,
              conversation:
                activeProfile.profile_id,
            },
          );

          const response =
            await apiRequest<DeleteMessageResponse>(
              API.messages,
              {
                method: "DELETE",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  message_id:
                    messageId,
                  mode,
                }),
              },
            );

          console.log(
            "Delete response:",
            response,
          );

          /*
           * The API must explicitly confirm
           * that the deletion succeeded.
           */
          if (
            response.success !== true
          ) {
            throw new Error(
              "The server did not confirm the message deletion.",
            );
          }

          /*
           * Make sure the server deleted
           * the exact message we requested.
           */
          if (
            response.message_id &&
            response.message_id !==
              messageId
          ) {
            throw new Error(
              "The server returned an unexpected message ID.",
            );
          }

          /*
           * Remove the message immediately
           * from the local conversation.
           *
           * IMPORTANT:
           *
           * We intentionally DO NOT call
           * loadMessages() here.
           *
           * The DELETE request has already
           * succeeded. Immediately performing
           * another GET can race with the
           * database update and make a deleted
           * message appear again.
           */
          setMessages(
            (previous) =>
              previous.filter(
                (message) =>
                  message.id !==
                  messageId,
              ),
          );

          /*
           * Recalculate the count from the
           * current conversation state rather
           * than blindly decrementing it.
           */
          setCount(
            (previous) =>
              Math.max(
                0,
                previous - 1,
              ),
          );

          setStatus({
            text:
              mode === "everyone"
                ? "Message deleted for everyone."
                : "Message deleted for you.",
            type: "success",
          });

          console.log(
            "Message deletion completed successfully:",
            {
              messageId,
              mode,
            },
          );

          return true;
        } catch (error) {
          console.error(
            "Failed to delete message:",
            error,
          );

          setStatus({
            text:
              error instanceof Error
                ? error.message
                : "The message could not be deleted.",
            type: "error",
          });

          return false;
        }
      },
      [
        activeProfile,
        backendConnected,
      ],
    );

  const refreshMessages =
    useCallback(() => {
      if (
        activeProfile
      ) {
        void loadMessages(
          activeProfile.profile_id,
          {
            silent: true,
          },
        );
      }
    }, [
      activeProfile,
      loadMessages,
    ]);

  const reset =
    useCallback(() => {
      ++conversationRequestId.current;

      setActiveProfile(null);
      setConversationProfile(null);
      setOpen(false);
      setText("");
      setAsset(null);
      setStatus(null);
      setSending(false);
      setLoadingMessages(false);
      setMessages([]);
      setCount(0);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }, []);

  return {
    activeProfile,
    conversationProfile,
    open,
    setOpen,
    text,
    asset,
    status,
    sending,
    loadingMessages,
    messages,
    count,
    fileInputRef,
    openConversation,
    changeText,
    chooseAsset,
    removeAsset,
    sendMessage,
    deleteMessage,
    refreshMessages,
    reset,
  };
}