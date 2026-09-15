"use client";

import React, { useRef, useState } from "react";

import {
  ALLOWED_MESSAGE_ASSET_TYPES,
  API,
  MAX_MESSAGE_ASSET_SIZE,
} from "../constants";

import { apiRequest } from "../utils";
import type { MessageAsset, Profile, StatusValue } from "../types";

/**
 * Uploads one attachment with progress reporting.
 *
 * Uses XHR rather than fetch because fetch cannot report
 * upload progress.
 */
function uploadMessageAsset(
  file: File,
  profileId: string,
  onProgress: (percent: number) => void,
) {
  return new Promise<MessageAsset>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("POST", API.messageAssets);
    request.withCredentials = true;
    request.setRequestHeader("Accept", "application/json");

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(
          Math.round((event.loaded / event.total) * 100),
        );
      }
    };

    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error("upload_failed"));
        return;
      }

      try {
        resolve(
          JSON.parse(
            request.responseText || "{}",
          ) as MessageAsset,
        );
      } catch {
        reject(new Error("upload_failed"));
      }
    };

    request.onerror = () => reject(new Error("upload_failed"));

    const body = new FormData();

    body.append("file", file);
    body.append("profile_id", profileId);

    request.send(body);
  });
}

type UseMessagingOptions = {
  backendConnected: boolean;
  isAcceptedFriend: (profileId?: string) => boolean;
};

/**
 * Composer state for the messages view.
 *
 * Messaging is gated on an accepted friendship in both
 * `openConversation` and `sendMessage`.
 */
export function useMessaging({
  backendConnected,
  isAcceptedFriend,
}: UseMessagingOptions) {
  const [activeProfile, setActiveProfile] =
    useState<Profile | null>(null);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [asset, setAsset] = useState<File | null>(null);
  const [status, setStatus] = useState<StatusValue>(null);
  const [sending, setSending] = useState(false);
  const [count, setCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const notFriendsMessage =
    "You can only message accepted friends.";

  const openConversation = (profile: Profile) => {
    if (!isAcceptedFriend(profile.profile_id)) {
      setStatus({ text: notFriendsMessage, type: "error" });
      return false;
    }

    setActiveProfile(profile);
    setOpen(true);

    return true;
  };

  const changeText = (value: string) => {
    setText(value);
    setCount(value.length);
  };

  const chooseAsset = (file?: File) => {
    if (!file) return;

    const allowed =
      file.type.startsWith("image/") ||
      ALLOWED_MESSAGE_ASSET_TYPES.includes(file.type);

    if (!allowed || file.size > MAX_MESSAGE_ASSET_SIZE) {
      setStatus({
        text: "Choose an image or document up to 10 MB.",
        type: "error",
      });

      return;
    }

    setAsset(file);
    setStatus(null);
  };

  const removeAsset = () => {
    setAsset(null);
    clearFileInput();
  };

  const sendMessage = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if ((!text.trim() && !asset) || !activeProfile) {
      setStatus({
        text: "Write a message or choose an attachment before sending.",
        type: "error",
      });

      return;
    }

    if (!isAcceptedFriend(activeProfile.profile_id)) {
      setStatus({ text: notFriendsMessage, type: "error" });
      return;
    }

    setSending(true);

    try {
      if (!backendConnected) {
        throw new Error(
          "Your session is not connected to the backend.",
        );
      }

      let uploaded: MessageAsset | null = null;

      if (asset) {
        uploaded = await uploadMessageAsset(
          asset,
          activeProfile.profile_id,
          (percent) =>
            setStatus({
              text: `Uploading ${percent}%`,
              type: "info",
            }),
        );
      }

      await apiRequest(API.messages, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: activeProfile.profile_id,
          text: text.trim(),
          message_asset_url: uploaded?.url,
          message_asset_name: uploaded?.name,
          message_asset_type: uploaded?.type,
          message_asset_size: uploaded?.size,
        }),
      });

      setText("");
      setAsset(null);
      setCount(0);
      clearFileInput();

      setStatus({ text: "Message sent.", type: "success" });
    } catch (error) {
      console.error("Failed to send message:", error);

      setStatus({
        text:
          error instanceof Error
            ? error.message
            : "Your message or attachment could not be sent. Nothing was shared.",
        type: "error",
      });
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setActiveProfile(null);
    setOpen(false);
    setText("");
    setAsset(null);
    setStatus(null);
    setCount(0);
    clearFileInput();
  };

  return {
    activeProfile,
    setActiveProfile,
    open,
    setOpen,
    text,
    asset,
    status,
    setStatus,
    sending,
    count,
    fileInputRef,
    openConversation,
    changeText,
    chooseAsset,
    removeAsset,
    sendMessage,
    reset,
  };
}
