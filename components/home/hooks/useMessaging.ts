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
};

/**
 * Conversation profiles use the same profile shape
 * as the rest of the application.
 *
 * This prevents type mismatches when a conversation
 * profile is passed into components such as Avatar.
 */
export type ConversationProfile = Profile;

type MessagesResponse = {
  messages?: ConversationMessage[];
  count?: number;
  profile?: ConversationProfile;
};

type SendMessageResponse = {
  message?: ConversationMessage;
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
          "/api/presence",
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

        /**
         * Profile already contains all fields
         * required by ConversationProfile because
         * ConversationProfile is now an alias of Profile.
         */
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
    refreshMessages,
    reset,
  };
}