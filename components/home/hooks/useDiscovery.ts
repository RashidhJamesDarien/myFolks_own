"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabase";

import { API, DISCOVERY_ROUNDS } from "../constants";
import { apiRequest } from "../utils";

import {
  buildDiscoveryPairs,
  describeEmptyDiscovery,
  getDiscoveryEligibleProfiles,
  logDiscovery,
  normalizeDiscoverProfiles,
} from "../lib/discovery";

import type {
  DiscoverProfilesResponse,
  DiscoverState,
  Profile,
  StatusValue,
} from "../types";

type UseDiscoveryOptions = {
  authenticated: boolean;
  backendConnected: boolean;
  currentProfileId?: string;
  blockedProfiles: Set<string>;
};

/**
 * Owns the six-round discovery session: loading profiles, building
 * the pair queue, advancing rounds, and restarting.
 */
export function useDiscovery({
  authenticated,
  backendConnected,
  currentProfileId,
  blockedProfiles,
}: UseDiscoveryOptions) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pairQueue, setPairQueue] = useState<Profile[][]>([]);
  const [pairIndex, setPairIndex] = useState(0);

  const [discoverState, setDiscoverState] =
    useState<DiscoverState>("loading");

  const [notice, setNotice] = useState<StatusValue>(null);

  const [positiveSelections, setPositiveSelections] = useState<
    Profile[]
  >([]);

  const [completionProfile, setCompletionProfile] =
    useState<Profile | null>(null);

  const [refreshToken, setRefreshToken] = useState(0);

  /** Guards against a stale response overwriting a newer session. */
  const requestIdRef = useRef(0);

  const currentPair = pairQueue[pairIndex] ?? [];

  const availableProfiles = useMemo(
    () =>
      getDiscoveryEligibleProfiles(profiles, {
        currentProfileId,
        blockedProfiles,
      }),
    [profiles, currentProfileId, blockedProfiles],
  );

  const clearQueue = () => {
    setPairQueue([]);
    setPairIndex(0);
  };

  const loadRemoteProfiles = async (): Promise<boolean> => {
    const requestId = ++requestIdRef.current;
    const isStale = () => requestId !== requestIdRef.current;

    setDiscoverState("loading");
    setNotice(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Your authentication session could not be verified. Please sign in again.",
        );
      }

      const data = (await apiRequest(
        API.discover,
      )) as DiscoverProfilesResponse;

      if (isStale()) return false;

      const rawProfiles = Array.isArray(data?.profiles)
        ? data.profiles
        : [];

      const uniqueProfiles = normalizeDiscoverProfiles(
        rawProfiles,
        { authUserId: user.id, currentProfileId },
      );

      setProfiles(uniqueProfiles);

      const eligible = getDiscoveryEligibleProfiles(
        uniqueProfiles,
        { currentProfileId, blockedProfiles },
      );

      logDiscovery("loaded", {
        apiProfiles: rawProfiles.length,
        uniqueProfiles: uniqueProfiles.length,
        eligible: eligible.length,
      });

      if (eligible.length < 2) {
        clearQueue();
        setDiscoverState("empty");
        setNotice(
          describeEmptyDiscovery(
            rawProfiles.length,
            eligible.length,
          ),
        );

        return false;
      }

      const pairs = buildDiscoveryPairs(eligible);

      if (isStale()) return false;

      if (!pairs.length) {
        setDiscoverState("error");
        setNotice({
          text: "Profiles were loaded, but myFolks could not create the discovery pairs.",
          type: "error",
        });

        return false;
      }

      logDiscovery("queue built", {
        rounds: pairs.length,
        firstPair: pairs[0]?.map((p) => p.profile_id),
      });

      setPairQueue(pairs);
      setPairIndex(0);
      setDiscoverState("ready");
      setNotice(null);

      return true;
    } catch (error) {
      if (isStale()) return false;

      console.error("Failed to load remote profiles:", error);

      setProfiles([]);
      clearQueue();
      setDiscoverState("error");

      setNotice({
        text:
          error instanceof Error && error.message
            ? error.message
            : "Profiles could not be loaded. Please try again.",
        type: "error",
      });

      return false;
    }
  };

  useEffect(() => {
    if (!authenticated || !backendConnected) return;

    void loadRemoteProfiles();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authenticated,
    backendConnected,
    currentProfileId,
    refreshToken,
  ]);

  /** Ask the effect above for a fresh load. */
  const refresh = () =>
    setRefreshToken((value) => value + 1);

  /** Abandon the current session and start a brand new one. */
  const restartDiscovery = () => {
    requestIdRef.current += 1;

    setCompletionProfile(null);
    setPositiveSelections([]);
    clearQueue();
    setNotice(null);
    setDiscoverState("loading");

    refresh();
  };

  const advance = (fallback: Profile | null) => {
    if (pairIndex >= DISCOVERY_ROUNDS - 1) {
      setCompletionProfile(fallback);
      return;
    }

    setPairIndex((current) =>
      Math.min(current + 1, DISCOVERY_ROUNDS - 1),
    );
  };

  const chooseInterest = (index: number) => {
    const chosen = currentPair[index];

    if (!chosen) {
      logDiscovery("no profile at selected index", {
        index,
        pairIndex,
      });

      return;
    }

    setPositiveSelections((previous) => [...previous, chosen]);
    advance(chosen);
  };

  const skipPair = () =>
    advance(
      positiveSelections[positiveSelections.length - 1] ||
        currentPair[0] ||
        null,
    );

  const reset = () => {
    requestIdRef.current += 1;

    setProfiles([]);
    clearQueue();
    setPositiveSelections([]);
    setCompletionProfile(null);
    setDiscoverState("loading");
    setNotice(null);
  };

  const progressCurrent = completionProfile
    ? DISCOVERY_ROUNDS
    : pairQueue.length > 0
      ? Math.min(pairIndex + 1, DISCOVERY_ROUNDS)
      : 0;

  return {
    profiles,
    currentPair,
    discoverState,
    notice,
    setNotice,
    positiveSelections,
    completionProfile,
    setCompletionProfile,
    chooseInterest,
    skipPair,
    restartDiscovery,
    refresh,
    reset,
    progressCurrent,
    progressTotal: DISCOVERY_ROUNDS,
    progressPercent: completionProfile
      ? 100
      : progressCurrent > 0
        ? (progressCurrent / DISCOVERY_ROUNDS) * 100
        : 0,
    /*
     * Kept consistent with a live pair so the view never decides
     * the pool is "insufficient" while a valid pair is on screen.
     */
    visibleProfilesCount: Math.max(
      availableProfiles.length,
      currentPair.length,
    ),
  };
}
