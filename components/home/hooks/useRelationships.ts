"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

import { API } from "../constants";
import { apiRequest } from "../utils";

import {
  mapRequestsToStates,
  statusFromRequestError,
} from "../lib/friend-requests";

import type {
  FriendRequestResponse,
  FriendRequestStates,
  FriendRequestsResponse,
  FriendsResponse,
  Profile,
} from "../types";

type UseRelationshipsOptions = {
  authenticated: boolean;
  backendConnected: boolean;
};

/**
 * Friends list plus per-person friend-request status.
 */
export function useRelationships({
  authenticated,
  backendConnected,
}: UseRelationshipsOptions) {
  const [friends, setFriends] = useState<Profile[]>([]);

  const [friendRequestStates, setFriendRequestStates] =
    useState<FriendRequestStates>({});

  const loadFriendRequestStatuses = async () => {
    if (!backendConnected) return null;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) return null;

      const data = (await apiRequest(
        API.friendRequests,
      )) as FriendRequestsResponse;

      const states = mapRequestsToStates(
        Array.isArray(data.requests) ? data.requests : [],
        user.id,
      );

      setFriendRequestStates(states);

      return states;
    } catch (error) {
      console.error(
        "Failed to load friend request statuses:",
        error,
      );

      return null;
    }
  };

  const loadFriends = async () => {
    if (!backendConnected) return;

    try {
      const data = (await apiRequest(
        API.friends,
      )) as FriendsResponse;

      setFriends(
        Array.isArray(data.friends) ? data.friends : [],
      );
    } catch (error) {
      console.error("Failed to load friends:", error);
    }
  };

  useEffect(() => {
    if (!authenticated || !backendConnected) return;

    const refresh = async () => {
      await loadFriendRequestStatuses();
      await loadFriends();
    };

    void refresh();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, backendConnected]);

  const setRequestState = (
    profileId: string,
    status: FriendRequestStates[string]["status"],
    requestId = "",
  ) => {
    setFriendRequestStates((current) => ({
      ...current,
      [profileId]: {
        status,
        requestId:
          requestId || current[profileId]?.requestId || "",
      },
    }));
  };

  const getStatus = (profileId?: string) =>
    profileId
      ? friendRequestStates[profileId]?.status
      : undefined;

  const isAcceptedFriend = (profileId?: string) =>
    getStatus(profileId) === "accepted";

  /**
   * Send a friend request.
   *
   * Duplicate-request errors are treated as status updates rather
   * than failures. Returns an error message only when the caller
   * should surface something to the user.
   */
  const sendFriendRequest = async (
    profileId: string,
  ): Promise<{ error?: string }> => {
    const existing = getStatus(profileId);

    if (
      existing === "pending" ||
      existing === "accepted" ||
      existing === "incoming"
    ) {
      return {};
    }

    try {
      if (!backendConnected) {
        throw new Error(
          "Your session is not connected to the backend. Please refresh and try again.",
        );
      }

      const data = (await apiRequest(API.friendRequests, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_id: profileId }),
      })) as FriendRequestResponse;

      const createdRequestId =
        typeof data.request?.id === "string"
          ? data.request.id
          : typeof data.id === "string"
            ? data.id
            : "";

      setRequestState(profileId, "pending", createdRequestId);

      return {};
    } catch (error) {
      console.error("Failed to send friend request:", error);

      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "Unable to send the friend request.";

      const impliedStatus = statusFromRequestError(message);

      if (impliedStatus) {
        setRequestState(profileId, impliedStatus);

        if (impliedStatus === "accepted") {
          await loadFriends();
        }

        return {};
      }

      return { error: message };
    }
  };

  const reset = () => {
    setFriends([]);
    setFriendRequestStates({});
  };

  return {
    friends,
    friendRequestStates,
    getStatus,
    isAcceptedFriend,
    sendFriendRequest,
    loadFriends,
    loadFriendRequestStatuses,
    reset,
  };
}
