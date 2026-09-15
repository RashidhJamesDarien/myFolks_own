"use client";

import { supabase } from "@/src/lib/supabase";
import AuthScreen from "@/components/auth/AuthScreen";

import {
  createProfile as createSupabaseProfile,
  getCurrentUserProfile,
  updateProfile as updateSupabaseProfile,
} from "@/src/lib/profile";

import { uploadProfileImage } from "@/src/lib/profile-storage";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Image from "next/image";
import { flushSync } from "react-dom";

import { Icon } from "@/components/home/Icon";
import { NavButton } from "@/components/home/NavButton";
import { DiscoverView } from "@/components/home/discover";
import { FriendsView } from "@/components/home/friends";
import { MessagesView } from "@/components/home/messages";
import { CreateProfileView } from "@/components/home/create-profile";
import { ProfileView } from "@/components/home/profile";
import { SettingsView } from "@/components/home/settings";

import {
  API,
  MAX_PROFILE_PHOTO_SIZE,
  MAX_MESSAGE_ASSET_SIZE,
  FEATURED_INTERESTS,
} from "@/components/home/constants";

import {
  shuffle,
  apiRequest,
} from "@/components/home/utils";

import type {
  View,
  Profile,
  Settings,
  MessageAsset,
  UploadedProfilePhoto,
} from "@/components/home/types";

const DISCOVERY_ROUNDS = 6;

type FriendRequestStatus =
  | "pending"
  | "accepted"
  | "incoming";

type FriendRequestState = {
  status: FriendRequestStatus;
  requestId: string;
};

type FriendRequestRecord = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status:
    | "pending"
    | "accepted"
    | "declined";
  created_at?: string;
  updated_at?: string;
  sender?: Profile | null;
  recipient?: Profile | null;
  profile?: Profile | null;
  direction?:
    | "outgoing"
    | "incoming";
};

type FriendRequestsResponse = {
  requests: FriendRequestRecord[];
};

type FriendRequestResponse = {
  request?: FriendRequestRecord | null;
  id?: string;
  error?: string;
};

type DiscoverProfilesResponse = {
  profiles: Profile[];
};

type FriendsResponse = {
  friends?: Profile[];
};

type LegacyProfileResponse = {
  profile?: Profile | null;
  profile_id?: string;
  username?: string;
  display_name?: string;
  featured_interest?: string;
  bio?: string;
  location?: string;
  visibility?: string;
  photo_url?: string;
};

export default function Home() {
  const [view, setView] =
    useState<View>("discover");

  const [darkMode, setDarkMode] =
    useState(false);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [authenticated, setAuthenticated] =
    useState(false);

  const [themeAnimating, setThemeAnimating] =
    useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [backendConnected, setBackendConnected] =
    useState(false);

  const [profiles, setProfiles] =
    useState<Profile[]>([]);

  const [friends, setFriends] =
    useState<Profile[]>([]);

  const [discoverState, setDiscoverState] =
    useState<
      "loading" | "ready" | "empty" | "error"
    >("loading");

  const [pairQueue, setPairQueue] =
    useState<Profile[][]>([]);

  const [pairIndex, setPairIndex] =
    useState(0);

  const [positiveSelections, setPositiveSelections] =
    useState<Profile[]>([]);

  const [blockedProfiles, setBlockedProfiles] =
    useState<Set<string>>(new Set());

  const [completionProfile, setCompletionProfile] =
    useState<Profile | null>(null);

  const [friendRequestStates, setFriendRequestStates] =
    useState<
      Record<string, FriendRequestState>
    >({});

  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    action: (() => Promise<void>) | null;
  } | null>(null);

  const [currentProfile, setCurrentProfile] =
    useState<Profile | null>(null);

  const [profileConfirmed, setProfileConfirmed] =
    useState(false);

  const [activeMessageProfile, setActiveMessageProfile] =
    useState<Profile | null>(null);

  const [messageOpen, setMessageOpen] =
    useState(false);

  const [editingProfile, setEditingProfile] =
    useState(false);

  const [editFullName, setEditFullName] =
    useState("");

  const [editUsername, setEditUsername] =
    useState("");

  const [editBio, setEditBio] =
    useState("");

  const [editLocation, setEditLocation] =
    useState("");

  const [editInterests, setEditInterests] =
    useState<string[]>([]);

  const [editCustomInterest, setEditCustomInterest] =
    useState("");

  const [editProfilePhoto, setEditProfilePhoto] =
    useState<File | null>(null);

  const [editProfilePhotoUrl, setEditProfilePhotoUrl] =
    useState<string | null>(null);

  const [editProfileStatus, setEditProfileStatus] =
    useState<{
      text: string;
      type: "info" | "success" | "error";
    } | null>(null);

  const [editProfileSaving, setEditProfileSaving] =
    useState(false);

  const [settings, setSettings] =
    useState<Settings>({
      visibility: "published",
      lastSeenVisibility: "connections",
      interestDisplay: true,
      messagePermission: "friends_only",
      friendNotifications: true,
      messageNotifications: true,
    });

  const [friendSearch, setFriendSearch] =
    useState("");

  const [messageText, setMessageText] =
    useState("");

  const [messageAsset, setMessageAsset] =
    useState<File | null>(null);

  const [messageStatus, setMessageStatus] =
    useState<{
      text: string;
      type: "info" | "success" | "error";
    } | null>(null);

  const [messageSending, setMessageSending] =
    useState(false);

  const messageFileInput =
    useRef<HTMLInputElement>(null);

  const [profilePhoto, setProfilePhoto] =
    useState<File | null>(null);

  const [profilePhotoUrl, setProfilePhotoUrl] =
    useState<string | null>(null);

  const [profileStatus, setProfileStatus] =
    useState<{
      text: string;
      type: "info" | "success" | "error";
    } | null>(null);

  const [formStatus, setFormStatus] =
    useState<{
      text: string;
      type: "info" | "success" | "error";
    } | null>(null);

  const [settingsStatus, setSettingsStatus] =
    useState<{
      text: string;
      type: "info" | "success" | "error";
    } | null>(null);

  const [discoverNotice, setDiscoverNotice] =
    useState<{
      text: string;
      type: "info" | "success" | "error";
    } | null>(null);

  const [messageCount, setMessageCount] =
    useState(0);

  const [discoveryRefreshToken, setDiscoveryRefreshToken] =
    useState(0);

  const discoveryRequestIdRef =
    useRef(0);

  /*
   * The currently displayed pair.
   *
   * Keeping this derived directly from the queue means
   * the UI always receives the exact pair belonging to
   * the current discovery round.
   */
  const currentPair =
    pairQueue[pairIndex] ?? [];

  const availableProfiles =
    useMemo(
      () =>
        profiles.filter(
          (profile) =>
            Boolean(profile?.profile_id) &&
            profile.profile_id !==
              currentProfile?.profile_id &&
            !blockedProfiles.has(
              profile.profile_id,
            ),
        ),
      [
        profiles,
        currentProfile?.profile_id,
        blockedProfiles,
      ],
    );

  const showView = (
    nextView: View,
  ) => {
    setView(nextView);
    setMobileMenuOpen(false);
  };

  const getThemeRadius = (
    x: number,
    y: number,
  ) => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    return Math.max(
      Math.hypot(x, y),
      Math.hypot(
        width - x,
        y,
      ),
      Math.hypot(
        x,
        height - y,
      ),
      Math.hypot(
        width - x,
        height - y,
      ),
    );
  };

  const toggleTheme = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (themeAnimating) return;

    const rect =
      event.currentTarget.getBoundingClientRect();

    const x =
      rect.left +
      rect.width / 2;

    const y =
      rect.top +
      rect.height / 2;

    const nextDarkMode =
      !darkMode;

    const radius =
      getThemeRadius(x, y);

    document.documentElement.style.setProperty(
      "--theme-x",
      `${x}px`,
    );

    document.documentElement.style.setProperty(
      "--theme-y",
      `${y}px`,
    );

    document.documentElement.style.setProperty(
      "--theme-radius",
      `${radius}px`,
    );

    setThemeAnimating(true);

    const applyTheme = () => {
      document.documentElement.dataset.theme =
        nextDarkMode
          ? "dark"
          : "light";

      flushSync(() => {
        setDarkMode(
          nextDarkMode,
        );
      });

      window.localStorage.setItem(
        "myfolks-theme",
        nextDarkMode
          ? "dark"
          : "light",
      );
    };

    const doc =
      document as Document & {
        startViewTransition?: (
          callback:
            | (() => void)
            | (() => Promise<void>),
        ) => {
          finished: Promise<void>;
        };
      };

    if (doc.startViewTransition) {
      const transition =
        doc.startViewTransition(
          applyTheme,
        );

      void transition.finished.then(
        () =>
          setThemeAnimating(
            false,
          ),
        () =>
          setThemeAnimating(
            false,
          ),
      );
    } else {
      applyTheme();

      window.setTimeout(
        () => {
          setThemeAnimating(
            false,
          );
        },
        700,
      );
    }
  };

  const setStatus = (
    type:
      | "info"
      | "success"
      | "error",
    text: string,
    target:
      | "discover"
      | "profile"
      | "settings"
      | "message",
  ) => {
    const value = {
      text,
      type,
    };

    if (target === "discover") {
      setDiscoverNotice(
        value,
      );
    }

    if (target === "profile") {
      setFormStatus(value);
    }

    if (target === "settings") {
      setSettingsStatus(value);
    }

    if (target === "message") {
      setMessageStatus(value);
    }
  };

  /*
   * Get profiles that are actually usable by discovery.
   *
   * The discovery API already removes relationships such
   * as existing friendships and pending requests. This
   * client-side filter is an additional safety layer.
   */
  const getDiscoveryEligibleProfiles = (
    sourceProfiles: Profile[],
    excludedIds: Set<string> = new Set(),
  ) => {
    return sourceProfiles.filter(
      (profile) => {
        if (
          !profile ||
          typeof profile.profile_id !==
            "string" ||
          !profile.profile_id.trim()
        ) {
          return false;
        }

        if (
          currentProfile?.profile_id &&
          profile.profile_id ===
            currentProfile.profile_id
        ) {
          return false;
        }

        if (
          blockedProfiles.has(
            profile.profile_id,
          )
        ) {
          return false;
        }

        if (
          excludedIds.has(
            profile.profile_id,
          )
        ) {
          return false;
        }

        return true;
      },
    );
  };

  /*
   * Build the six-round discovery queue.
   *
   * IMPORTANT:
   * We do not require 12 unique profiles.
   *
   * Two profiles are enough to create six A-vs-B
   * rounds. With more profiles, we prefer unique
   * people before reusing anyone.
   */
  const buildPairQueue = (
    sourceProfiles: Profile[] = profiles,
    excludedIds: Set<string> = new Set(),
  ) => {
    const eligible =
      getDiscoveryEligibleProfiles(
        sourceProfiles,
        excludedIds,
      );

    console.log(
      "[myFolks discovery queue]",
      {
        sourceProfiles:
          sourceProfiles.length,
        eligibleProfiles:
          eligible.length,
        discoveryRounds:
          DISCOVERY_ROUNDS,
      },
    );

    if (
      eligible.length <
      2
    ) {
      setPairQueue([]);
      setPairIndex(0);

      return false;
    }

    const shuffled =
      shuffle([
        ...eligible,
      ]);

    const pairs: Profile[][] = [];

    /*
     * First pass:
     * prefer unique profiles.
     */
    const firstPassProfiles =
      shuffle([
        ...shuffled,
      ]);

    let cursor = 0;

    while (
      pairs.length <
        DISCOVERY_ROUNDS &&
      cursor + 1 <
        firstPassProfiles.length
    ) {
      const first =
        firstPassProfiles[
          cursor
        ];

      const second =
        firstPassProfiles[
          cursor + 1
        ];

      if (
        first &&
        second &&
        first.profile_id !==
          second.profile_id
      ) {
        pairs.push([
          first,
          second,
        ]);
      }

      cursor += 2;
    }

    /*
     * Second pass:
     * reuse profiles to guarantee six rounds.
     */
    let fallbackIndex = 0;

    while (
      pairs.length <
      DISCOVERY_ROUNDS
    ) {
      const first =
        shuffled[
          fallbackIndex %
            shuffled.length
        ];

      const second =
        shuffled[
          (fallbackIndex + 1) %
            shuffled.length
        ];

      if (
        first &&
        second &&
        first.profile_id !==
          second.profile_id
      ) {
        pairs.push([
          first,
          second,
        ]);
      }

      fallbackIndex += 1;

      if (
        fallbackIndex >
        Math.max(
          shuffled.length * 6,
          12,
        )
      ) {
        break;
      }
    }

    const finalQueue =
      pairs.slice(
        0,
        DISCOVERY_ROUNDS,
      );

    console.log(
      "[myFolks discovery queue result]",
      {
        pairsBuilt:
          finalQueue.length,
        required:
          DISCOVERY_ROUNDS,
        profileIds:
          finalQueue.map(
            (pair) =>
              pair.map(
                (profile) =>
                  profile.profile_id,
              ),
          ),
      },
    );

    if (
      finalQueue.length ===
      0
    ) {
      setPairQueue([]);
      setPairIndex(0);

      return false;
    }

    setPairQueue(
      finalQueue,
    );

    setPairIndex(0);

    console.log(
      "[myFolks discovery] FIRST PAIR",
      finalQueue[0]?.map(
        (profile) => ({
          id:
            profile.profile_id,
          name:
            profile.display_name,
          username:
            profile.username,
          interest:
            profile.featured_interest,
          photo:
            profile.photo_url,
        }),
      ),
    );

    return true;
  };

  const loadFriendRequestStatuses =
    async (): Promise<
      Record<
        string,
        FriendRequestState
      > | null
    > => {
      try {
        if (!backendConnected) {
          return null;
        }

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          return null;
        }

        const data =
          (await apiRequest(
            API.friendRequests,
          )) as FriendRequestsResponse;

        const requests =
          Array.isArray(
            data.requests,
          )
            ? data.requests
            : [];

        const states: Record<
          string,
          FriendRequestState
        > = {};

        for (
          const request of requests
        ) {
          if (
            !request ||
            typeof request.id !==
              "string" ||
            typeof request.sender_id !==
              "string" ||
            typeof request.recipient_id !==
              "string" ||
            typeof request.status !==
              "string"
          ) {
            continue;
          }

          const otherProfileId =
            request.sender_id ===
            user.id
              ? request.recipient_id
              : request.sender_id;

          if (!otherProfileId) {
            continue;
          }

          if (
            request.status ===
            "accepted"
          ) {
            states[
              otherProfileId
            ] = {
              status:
                "accepted",
              requestId:
                request.id,
            };

            continue;
          }

          if (
            request.status ===
              "pending" &&
            !states[
              otherProfileId
            ]
          ) {
            states[
              otherProfileId
            ] = {
              status:
                request.sender_id ===
                user.id
                  ? "pending"
                  : "incoming",
              requestId:
                request.id,
            };
          }
        }

        setFriendRequestStates(
          states,
        );

        return states;
      } catch (error) {
        console.error(
          "Failed to load friend request statuses:",
          error,
        );

        return null;
      }
    };

  const loadFriends =
    async () => {
      try {
        if (!backendConnected) {
          return;
        }

        const data =
          (await apiRequest(
            API.friendRequests.replace(
              "/friend-requests",
              "/friends",
            ),
          )) as FriendsResponse;

        setFriends(
          Array.isArray(
            data.friends,
          )
            ? data.friends
            : [],
        );
      } catch (error) {
        console.error(
          "Failed to load friends:",
          error,
        );
      }
    };

  const refreshRelationshipData =
    async (): Promise<void> => {
      await loadFriendRequestStatuses();
      await loadFriends();

      setDiscoveryRefreshToken(
        (value) => value + 1,
      );
    };

  /*
   * Load discovery profiles from the API.
   *
   * The API uses the authenticated Supabase token.
   * We additionally resolve the current auth user here
   * so the client never accidentally displays the current
   * account as another discovery profile.
   */
  const loadRemoteProfiles =
    async (): Promise<boolean> => {
      const requestId =
        ++discoveryRequestIdRef.current;

      setDiscoverState(
        "loading",
      );

      setDiscoverNotice(
        null,
      );

      try {
        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          throw new Error(
            "Your authentication session could not be verified. Please sign in again.",
          );
        }

        console.log(
          "[myFolks discovery] requesting profiles",
          {
            endpoint:
              API.discover,
            requestId,
            currentUserId:
              user.id,
          },
        );

        const data =
          (await apiRequest(
            API.discover,
          )) as DiscoverProfilesResponse;

        if (
          requestId !==
          discoveryRequestIdRef.current
        ) {
          return false;
        }

        const rawProfiles =
          Array.isArray(
            data?.profiles,
          )
            ? data.profiles
            : [];

        /*
         * Normalize and deduplicate the API response.
         */
        const uniqueMap =
          new Map<
            string,
            Profile
          >();

        for (
          const item of rawProfiles
        ) {
          if (
            !item ||
            typeof item.profile_id !==
              "string" ||
            !item.profile_id.trim()
          ) {
            continue;
          }

          /*
           * Always remove the authenticated user,
           * even if the API accidentally returns them.
           */
          if (
            item.profile_id ===
            user.id
          ) {
            continue;
          }

          if (
            currentProfile?.profile_id &&
            item.profile_id ===
              currentProfile.profile_id
          ) {
            continue;
          }

          if (
            !uniqueMap.has(
              item.profile_id,
            )
          ) {
            uniqueMap.set(
              item.profile_id,
              item,
            );
          }
        }

        const uniqueProfiles =
          Array.from(
            uniqueMap.values(),
          );

        /*
         * Store the raw usable profile list first.
         */
        setProfiles(
          uniqueProfiles,
        );

        const discoverableProfiles =
          getDiscoveryEligibleProfiles(
            uniqueProfiles,
          );

        console.log(
          "[myFolks discovery]",
          {
            apiProfiles:
              rawProfiles.length,
            uniqueProfiles:
              uniqueProfiles.length,
            currentAuthUser:
              user.id,
            currentProfileId:
              currentProfile?.profile_id,
            blockedProfiles:
              blockedProfiles.size,
            discoverableProfiles:
              discoverableProfiles.length,
            profileIds:
              discoverableProfiles.map(
                (profile) =>
                  profile.profile_id,
              ),
          },
        );

        if (
          discoverableProfiles.length <
          2
        ) {
          setPairQueue([]);
          setPairIndex(0);

          setDiscoverState(
            "empty",
          );

          if (
            rawProfiles.length ===
            0
          ) {
            setDiscoverNotice({
              text: "The discovery API returned no profiles. Make sure at least two other users have created profiles.",
              type: "error",
            });
          } else if (
            discoverableProfiles.length ===
            1
          ) {
            setDiscoverNotice({
              text: "One profile is available, but myFolks needs at least two people to create an A-vs-B discovery round.",
              type: "info",
            });
          } else {
            setDiscoverNotice({
              text: "Profiles were returned, but none are currently available for discovery.",
              type: "info",
            });
          }

          return false;
        }

        /*
         * IMPORTANT:
         *
         * Build the queue from discoverableProfiles,
         * not the original API array.
         */
        const queueBuilt =
          buildPairQueue(
            discoverableProfiles,
          );

        if (
          requestId !==
          discoveryRequestIdRef.current
        ) {
          return false;
        }

        if (!queueBuilt) {
          setDiscoverState(
            "error",
          );

          setDiscoverNotice({
            text: "Profiles were loaded, but myFolks could not create the discovery pairs.",
            type: "error",
          });

          return false;
        }

        setDiscoverState(
          "ready",
        );

        setDiscoverNotice(
          null,
        );

        return true;
      } catch (error) {
        if (
          requestId !==
          discoveryRequestIdRef.current
        ) {
          return false;
        }

        console.error(
          "Failed to load remote profiles:",
          error,
        );

        setProfiles([]);
        setPairQueue([]);
        setPairIndex(0);

        setDiscoverState(
          "error",
        );

        setDiscoverNotice({
          text:
            error instanceof Error &&
            error.message
              ? error.message
              : "Profiles could not be loaded. Please try again.",
          type: "error",
        });

        return false;
      }
    };

  /*
   * Start a completely fresh six-round discovery session.
   */
  const restartDiscovery =
    () => {
      /*
       * Invalidate any previous request so an older
       * response cannot overwrite the fresh session.
       */
      discoveryRequestIdRef.current +=
        1;

      setCompletionProfile(
        null,
      );

      setPositiveSelections(
        [],
      );

      setPairQueue([]);
      setPairIndex(0);

      setDiscoverNotice(
        null,
      );

      setDiscoverState(
        "loading",
      );

      setView("discover");
      setMobileMenuOpen(false);

      setDiscoveryRefreshToken(
        (value) => value + 1,
      );
    };

  useLayoutEffect(() => {
    const savedTheme =
      window.localStorage.getItem(
        "myfolks-theme",
      );

    const isDark =
      savedTheme === "dark";

    document.documentElement.dataset.theme =
      isDark
        ? "dark"
        : "light";

    document.documentElement.classList.toggle(
      "supports-view-transition",
      "startViewTransition" in
        document,
    );

    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth =
      async () => {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!mounted) return;

        setAuthenticated(
          Boolean(session),
        );

        setBackendConnected(
          Boolean(session),
        );

        setAuthLoading(
          false,
        );
      };

    void initializeAuth();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) return;

          setAuthenticated(
            Boolean(session),
          );

          setBackendConnected(
            Boolean(session),
          );

          setAuthLoading(
            false,
          );
        },
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    const loadProfile =
      async () => {
        try {
          const profile =
            await getCurrentUserProfile();

          if (!profile) {
            setCurrentProfile(
              null,
            );

            setProfileConfirmed(
              false,
            );

            return;
          }

          const loadedProfile:
            Profile = {
            profile_id:
              profile.id,

            username:
              typeof profile.username ===
              "string"
                ? profile.username
                : undefined,

            display_name:
              typeof profile.full_name ===
              "string"
                ? profile.full_name
                : typeof profile.username ===
                    "string"
                  ? profile.username
                  : "myFolks user",

            featured_interest:
              typeof profile.featured_interest ===
              "string"
                ? profile.featured_interest
                : "",

            bio:
              typeof profile.bio ===
              "string"
                ? profile.bio
                : "",

            location:
              typeof profile.location ===
              "string"
                ? profile.location
                : "",

            visibility:
              "published",

            allows_messages:
              true,

            photo_url:
              typeof profile.profile_image_url ===
              "string"
                ? profile.profile_image_url
                : undefined,
          };

          setCurrentProfile(
            loadedProfile,
          );

          setProfileConfirmed(
            true,
          );
        } catch (error) {
          console.error(
            "Failed to load profile:",
            error,
          );

          setCurrentProfile(
            null,
          );

          setProfileConfirmed(
            false,
          );
        }
      };

    void loadProfile();
  }, [authenticated]);

  useEffect(() => {
    if (
      !authenticated ||
      !backendConnected
    ) {
      return;
    }

    const refreshRelationships =
      async () => {
        await loadFriendRequestStatuses();
        await loadFriends();
      };

    void refreshRelationships();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authenticated,
    backendConnected,
  ]);

  /*
   * Discovery loading effect.
   *
   * The current profile ID is included because the initial
   * discovery request may happen before the profile itself
   * has finished loading.
   */
  useEffect(() => {
    if (
      !authenticated ||
      !backendConnected
    ) {
      return;
    }

    let cancelled = false;

    const refreshDiscover =
      async () => {
        if (cancelled) {
          return;
        }

        await loadRemoteProfiles();
      };

    void refreshDiscover();

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authenticated,
    backendConnected,
    currentProfile?.profile_id,
    discoveryRefreshToken,
  ]);

  useEffect(() => {
    return () => {
      if (editProfilePhotoUrl) {
        URL.revokeObjectURL(
          editProfilePhotoUrl,
        );
      }
    };
  }, [
    editProfilePhotoUrl,
  ]);

  /*
   * Choose one of the two profiles in the current round.
   *
   * IMPORTANT:
   * Do NOT rebuild the entire remaining queue here.
   *
   * The six-round queue has already been constructed.
   * We simply advance to the next pair.
   */
  const chooseInterest = (
    index: number,
  ) => {
    const chosen =
      currentPair[index];

    if (!chosen) {
      console.warn(
        "[myFolks discovery] No profile exists at selected index.",
        {
          index,
          pairIndex,
          currentPair,
        },
      );

      return;
    }

    const nextSelections = [
      ...positiveSelections,
      chosen,
    ];

    setPositiveSelections(
      nextSelections,
    );

    if (
      pairIndex >=
      DISCOVERY_ROUNDS - 1
    ) {
      setCompletionProfile(
        chosen,
      );

      return;
    }

    setPairIndex(
      (current) =>
        Math.min(
          current + 1,
          DISCOVERY_ROUNDS - 1,
        ),
    );
  };

  const skipPair = () => {
    if (
      pairIndex >=
      DISCOVERY_ROUNDS - 1
    ) {
      const fallbackProfile =
        positiveSelections[
          positiveSelections.length -
            1
        ] ||
        currentPair[0] ||
        null;

      setCompletionProfile(
        fallbackProfile,
      );

      return;
    }

    setPairIndex(
      (current) =>
        Math.min(
          current + 1,
          DISCOVERY_ROUNDS - 1,
        ),
    );
  };

  const reportProfile = async (
    profile: Profile,
  ) => {
    try {
      if (!backendConnected) {
        throw new Error(
          "backend_unavailable",
        );
      }

      await apiRequest(
        API.reports,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            reported_profile_id:
              profile.profile_id,
          }),
        },
      );

      setStatus(
        "success",
        "Report submitted for review.",
        "discover",
      );
    } catch (error) {
      console.error(
        "Failed to report profile:",
        error,
      );

      setStatus(
        "error",
        error instanceof Error
          ? error.message
          : "The report could not be saved remotely.",
        "discover",
      );
    }
  };

  const blockProfile = async (
    profile: Profile,
  ) => {
    try {
      if (!backendConnected) {
        throw new Error(
          "backend_unavailable",
        );
      }

      await apiRequest(
        API.blocks,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            blocked_profile_id:
              profile.profile_id,
          }),
        },
      );

      const nextBlocked =
        new Set(
          blockedProfiles,
        );

      nextBlocked.add(
        profile.profile_id,
      );

      setBlockedProfiles(
        nextBlocked,
      );

      setStatus(
        "success",
        "Profile blocked.",
        "discover",
      );

      restartDiscovery();
    } catch (error) {
      console.error(
        "Failed to block profile:",
        error,
      );

      setStatus(
        "error",
        error instanceof Error
          ? error.message
          : "The block could not be saved remotely.",
        "discover",
      );
    }
  };

  const sendFriendRequest =
    async () => {
      if (!completionProfile) {
        return;
      }

      const profileId =
        completionProfile.profile_id;

      const existingState =
        friendRequestStates[
          profileId
        ];

      const existingStatus =
        existingState?.status;

      if (
        existingStatus ===
          "pending" ||
        existingStatus ===
          "accepted" ||
        existingStatus ===
          "incoming"
      ) {
        restartDiscovery();
        return;
      }

      try {
        if (!backendConnected) {
          throw new Error(
            "Your session is not connected to the backend. Please refresh and try again.",
          );
        }

        const data =
          (await apiRequest(
            API.friendRequests,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                recipient_id:
                  profileId,
              }),
            },
          )) as FriendRequestResponse;

        const createdRequestId =
          typeof data.request?.id ===
          "string"
            ? data.request.id
            : typeof data.id ===
                "string"
              ? data.id
              : "";

        setFriendRequestStates(
          (current) => ({
            ...current,
            [profileId]: {
              status:
                "pending",
              requestId:
                createdRequestId ||
                current[
                  profileId
                ]?.requestId ||
                "",
            },
          }),
        );

        restartDiscovery();
      } catch (error) {
        console.error(
          "Failed to send friend request:",
          error,
        );

        const errorMessage =
          error instanceof Error &&
          error.message.trim()
            ? error.message.trim()
            : "Unable to send the friend request.";

        if (
          errorMessage ===
          "A friend request is already pending."
        ) {
          setFriendRequestStates(
            (current) => ({
              ...current,
              [profileId]: {
                status:
                  "pending",
                requestId:
                  current[
                    profileId
                  ]?.requestId ||
                  "",
              },
            }),
          );

          restartDiscovery();
          return;
        }

        if (
          errorMessage ===
          "You are already friends with this person."
        ) {
          setFriendRequestStates(
            (current) => ({
              ...current,
              [profileId]: {
                status:
                  "accepted",
                requestId:
                  current[
                    profileId
                  ]?.requestId ||
                  "",
              },
            }),
          );

          await loadFriends();
          restartDiscovery();
          return;
        }

        if (
          errorMessage.includes(
            "already sent you a friend request",
          )
        ) {
          setFriendRequestStates(
            (current) => ({
              ...current,
              [profileId]: {
                status:
                  "incoming",
                requestId:
                  current[
                    profileId
                  ]?.requestId ||
                  "",
              },
            }),
          );

          restartDiscovery();
          return;
        }

        setStatus(
          "error",
          errorMessage,
          "discover",
        );
      }
    };

  const openSelectedMessage = (
    profile: Profile,
  ) => {
    const relationship =
      friendRequestStates[
        profile.profile_id
      ];

    if (
      relationship?.status !==
      "accepted"
    ) {
      setStatus(
        "info",
        "You can message this person after they accept your friend request.",
        "discover",
      );

      return;
    }

    if (
      profile.allows_messages ===
      false
    ) {
      setStatus(
        "info",
        "This person is not accepting messages right now.",
        "discover",
      );

      return;
    }

    setActiveMessageProfile(
      profile,
    );

    setMessageOpen(true);

    setCompletionProfile(
      null,
    );

    setView("messages");
  };

  const chooseProfilePhoto = (
    file?: File,
  ) => {
    if (!file) return;

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type);

    if (
      !allowed ||
      file.size >
        MAX_PROFILE_PHOTO_SIZE
    ) {
      setProfileStatus({
        text: "Choose a JPG, PNG, or WebP image no larger than 10 MB.",
        type: "error",
      });

      return;
    }

    if (profilePhotoUrl) {
      URL.revokeObjectURL(
        profilePhotoUrl,
      );
    }

    const url =
      URL.createObjectURL(
        file,
      );

    setProfilePhoto(file);
    setProfilePhotoUrl(url);

    setProfileStatus({
      text: "Photo ready to upload when you create your profile.",
      type: "success",
    });
  };

  const chooseEditProfilePhoto = (
    file?: File,
  ) => {
    if (!file) return;

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type);

    if (
      !allowed ||
      file.size >
        MAX_PROFILE_PHOTO_SIZE
    ) {
      setEditProfileStatus({
        text: "Choose a JPG, PNG, or WebP image no larger than 10 MB.",
        type: "error",
      });

      return;
    }

    if (editProfilePhotoUrl) {
      URL.revokeObjectURL(
        editProfilePhotoUrl,
      );
    }

    const url =
      URL.createObjectURL(
        file,
      );

    setEditProfilePhoto(file);
    setEditProfilePhotoUrl(
      url,
    );

    setEditProfileStatus({
      text: "New profile photo selected.",
      type: "info",
    });
  };

  useEffect(() => {
    return () => {
      if (profilePhotoUrl) {
        URL.revokeObjectURL(
          profilePhotoUrl,
        );
      }
    };
  }, [profilePhotoUrl]);

  const createProfile = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const form =
      event.currentTarget;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const nameInput =
      document.getElementById(
        "profile-name",
      ) as HTMLInputElement | null;

    const interestInput =
      document.getElementById(
        "profile-interest",
      ) as HTMLInputElement | null;

    const bioInput =
      document.getElementById(
        "profile-bio",
      ) as HTMLTextAreaElement | null;

    if (
      !nameInput ||
      !interestInput ||
      !bioInput
    ) {
      setFormStatus({
        text: "The profile form could not be read. Please refresh and try again.",
        type: "error",
      });

      return;
    }

    try {
      if (!backendConnected) {
        throw new Error(
          "backend_unavailable",
        );
      }

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        throw new Error(
          "You must be signed in.",
        );
      }

      const metadataUsername =
        typeof user.user_metadata
          ?.username ===
        "string"
          ? user.user_metadata.username.trim()
          : "";

      if (!metadataUsername) {
        throw new Error(
          "Your account does not have a username. Please sign out and create your account again with a username.",
        );
      }

      let uploadedPhoto:
        | UploadedProfilePhoto
        | null = null;

      if (profilePhoto) {
        uploadedPhoto =
          await uploadProfileImage(
            profilePhoto,
          );
      }

      const savedProfile =
        await createSupabaseProfile({
          username:
            metadataUsername,

          fullName:
            nameInput.value.trim(),

          featuredInterest:
            interestInput.value.trim(),

          bio:
            bioInput.value.trim(),

          location: "",

          profileImageUrl:
            uploadedPhoto?.url ||
            null,
        });

      const normalizedProfile:
        Profile = {
        profile_id:
          savedProfile.id,

        username:
          typeof savedProfile.username ===
          "string"
            ? savedProfile.username
            : metadataUsername,

        display_name:
          typeof savedProfile.full_name ===
          "string"
            ? savedProfile.full_name
            : nameInput.value.trim(),

        featured_interest:
          typeof savedProfile.featured_interest ===
          "string"
            ? savedProfile.featured_interest
            : interestInput.value.trim(),

        bio:
          typeof savedProfile.bio ===
          "string"
            ? savedProfile.bio
            : bioInput.value.trim(),

        location:
          typeof savedProfile.location ===
          "string"
            ? savedProfile.location
            : "",

        visibility:
          "published",

        allows_messages:
          true,

        photo_url:
          typeof savedProfile.profile_image_url ===
          "string"
            ? savedProfile.profile_image_url
            : uploadedPhoto?.url,
      };

      try {
        const legacyProfile:
          Record<string, unknown> =
          {
            profile_id:
              normalizedProfile.profile_id,

            display_name:
              normalizedProfile.display_name,

            featured_interest:
              normalizedProfile.featured_interest,

            bio:
              normalizedProfile.bio ||
              "",

            visibility:
              "published",
          };

        if (uploadedPhoto) {
          legacyProfile.photo_url =
            uploadedPhoto.url;

          legacyProfile.photo_name =
            uploadedPhoto.name ||
            profilePhoto?.name;

          legacyProfile.photo_type =
            uploadedPhoto.type ||
            profilePhoto?.type;

          legacyProfile.photo_size =
            uploadedPhoto.size ||
            profilePhoto?.size;

          legacyProfile.photo_count =
            1;
        }

        const legacySaved =
          (await apiRequest(
            API.profile,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                legacyProfile,
              ),
            },
          )) as LegacyProfileResponse;

        const remoteProfile =
          legacySaved.profile ||
          legacySaved;

        if (
          remoteProfile?.profile_id
        ) {
          Object.assign(
            normalizedProfile,
            {
              ...remoteProfile,

              username:
                remoteProfile.username ||
                normalizedProfile.username,

              display_name:
                remoteProfile.display_name ||
                normalizedProfile.display_name,

              featured_interest:
                remoteProfile.featured_interest ||
                normalizedProfile.featured_interest,

              bio:
                remoteProfile.bio ??
                normalizedProfile.bio,

              photo_url:
                remoteProfile.photo_url ||
                normalizedProfile.photo_url,
            },
          );
        }
      } catch (
        legacyError
      ) {
        console.warn(
          "Legacy profile endpoint was unavailable:",
          legacyError,
        );
      }

      setCurrentProfile(
        normalizedProfile,
      );

      setProfileConfirmed(
        true,
      );

      setFormStatus({
        text: "Profile created successfully.",
        type: "success",
      });

      setDiscoveryRefreshToken(
        (value) => value + 1,
      );

      showView("profile");
    } catch (error) {
      console.error(
        "Failed to create profile:",
        error,
      );

      const message =
        error instanceof Error &&
        error.message !==
          "backend_unavailable"
          ? error.message
          : "Your profile could not be saved. Please try again.";

      setFormStatus({
        text: message,
        type: "error",
      });
    }
  };

  const beginProfileEdit =
    () => {
      if (!currentProfile)
        return;

      setEditFullName(
        currentProfile.display_name ||
          "",
      );

      setEditUsername(
        currentProfile.username ||
          "",
      );

      setEditBio(
        currentProfile.bio ||
          "",
      );

      setEditLocation(
        currentProfile.location ||
          "",
      );

      const existingInterests =
        currentProfile.featured_interest
          ? currentProfile.featured_interest
              .split(",")
              .map((item) =>
                item.trim(),
              )
              .filter(Boolean)
          : [];

      const knownInterests =
        existingInterests.filter(
          (interest) =>
            FEATURED_INTERESTS.includes(
              interest,
            ),
        );

      const customInterests =
        existingInterests.filter(
          (interest) =>
            !FEATURED_INTERESTS.includes(
              interest,
            ),
        );

      setEditInterests(
        knownInterests,
      );

      setEditCustomInterest(
        customInterests.join(
          ", ",
        ),
      );

      setEditProfilePhoto(
        null,
      );

      if (editProfilePhotoUrl) {
        URL.revokeObjectURL(
          editProfilePhotoUrl,
        );
      }

      setEditProfilePhotoUrl(
        null,
      );

      setEditProfileStatus(
        null,
      );

      setEditingProfile(
        true,
      );
    };

  const saveEditedProfile =
    async () => {
      if (!currentProfile)
        return;

      const fullName =
        editFullName.trim();

      const username =
        editUsername.trim();

      const bio =
        editBio.trim();

      const location =
        editLocation.trim();

      const combinedInterests =
        [
          ...editInterests,

          ...(editCustomInterest.trim()
            ? editCustomInterest
                .split(",")
                .map((item) =>
                  item.trim(),
                )
                .filter(Boolean)
            : []),
        ];

      const uniqueInterests =
        Array.from(
          new Set(
            combinedInterests,
          ),
        );

      if (!fullName) {
        setEditProfileStatus({
          text: "Please enter your display name.",
          type: "error",
        });

        return;
      }

      if (!username) {
        setEditProfileStatus({
          text: "Please enter your username.",
          type: "error",
        });

        return;
      }

      if (
        !uniqueInterests.length
      ) {
        setEditProfileStatus({
          text: "Choose at least one featured interest.",
          type: "error",
        });

        return;
      }

      setEditProfileSaving(
        true,
      );

      setEditProfileStatus({
        text: "Saving your profile...",
        type: "info",
      });

      try {
        let uploadedPhoto:
          | UploadedProfilePhoto
          | null = null;

        if (
          editProfilePhoto
        ) {
          uploadedPhoto =
            await uploadProfileImage(
              editProfilePhoto,
            );
        }

        const savedProfile =
          await updateSupabaseProfile(
            {
              username,
              fullName,
              bio,
              location,

              ...(uploadedPhoto?.url
                ? {
                    profileImageUrl:
                      uploadedPhoto.url,
                  }
                : {}),
            },
          );

        const featuredInterest =
          uniqueInterests.join(
            ", ",
          );

        const updatedProfile:
          Profile = {
          ...currentProfile,

          profile_id:
            savedProfile.id,

          username:
            typeof savedProfile.username ===
            "string"
              ? savedProfile.username
              : username,

          display_name:
            typeof savedProfile.full_name ===
            "string"
              ? savedProfile.full_name
              : fullName,

          featured_interest:
            featuredInterest,

          bio:
            typeof savedProfile.bio ===
            "string"
              ? savedProfile.bio
              : bio,

          location:
            typeof savedProfile.location ===
            "string"
              ? savedProfile.location
              : location,

          photo_url:
            typeof savedProfile.profile_image_url ===
            "string"
              ? savedProfile.profile_image_url
              : uploadedPhoto?.url ||
                currentProfile.photo_url,

          visibility:
            currentProfile.visibility ||
            "published",

          allows_messages:
            currentProfile.allows_messages ??
            true,
        };

        try {
          const legacySaved =
            (await apiRequest(
              API.profile,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  profile_id:
                    updatedProfile.profile_id,

                  display_name:
                    updatedProfile.display_name,

                  featured_interest:
                    updatedProfile.featured_interest,

                  bio:
                    updatedProfile.bio ||
                    "",

                  location:
                    updatedProfile.location ||
                    "",

                  visibility:
                    updatedProfile.visibility ||
                    "published",

                  ...(updatedProfile.photo_url
                    ? {
                        photo_url:
                          updatedProfile.photo_url,
                      }
                    : {}),
                }),
              },
            )) as LegacyProfileResponse;

          const remoteProfile =
            legacySaved.profile ||
            legacySaved;

          if (
            remoteProfile?.profile_id
          ) {
            Object.assign(
              updatedProfile,
              {
                ...remoteProfile,

                profile_id:
                  remoteProfile.profile_id ||
                  updatedProfile.profile_id,

                username:
                  remoteProfile.username ||
                  updatedProfile.username,

                display_name:
                  remoteProfile.display_name ||
                  updatedProfile.display_name,

                featured_interest:
                  remoteProfile.featured_interest ||
                  updatedProfile.featured_interest,

                bio:
                  remoteProfile.bio ??
                  updatedProfile.bio,

                location:
                  remoteProfile.location ??
                  updatedProfile.location,

                visibility:
                  remoteProfile.visibility ||
                  updatedProfile.visibility,

                photo_url:
                  remoteProfile.photo_url ||
                  updatedProfile.photo_url,
              },
            );
          }
        } catch (
          legacyError
        ) {
          console.warn(
            "Legacy profile endpoint was unavailable while saving edited profile:",
            legacyError,
          );
        }

        setCurrentProfile(
          updatedProfile,
        );

        setEditProfileStatus({
          text: "Profile updated successfully.",
          type: "success",
        });

        setEditingProfile(
          false,
        );

        setEditProfilePhoto(
          null,
        );

        if (
          editProfilePhotoUrl
        ) {
          URL.revokeObjectURL(
            editProfilePhotoUrl,
          );

          setEditProfilePhotoUrl(
            null,
          );
        }

        setDiscoveryRefreshToken(
          (value) => value + 1,
        );
      } catch (error) {
        console.error(
          "Failed to update profile:",
          error,
        );

        setEditProfileStatus({
          text:
            error instanceof Error &&
            error.message !==
              "backend_unavailable"
              ? error.message
              : "Your profile could not be updated. Please try again.",
          type: "error",
        });
      } finally {
        setEditProfileSaving(
          false,
        );
      }
    };

  const sendMessage = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      (!messageText.trim() &&
        !messageAsset) ||
      !activeMessageProfile
    ) {
      setStatus(
        "error",
        "Write a message or choose an attachment before sending.",
        "message",
      );

      return;
    }

    const activeRelationship =
      friendRequestStates[
        activeMessageProfile.profile_id
      ];

    if (
      activeRelationship?.status !==
      "accepted"
    ) {
      setMessageStatus({
        text: "You can only message accepted friends.",
        type: "error",
      });

      return;
    }

    setMessageSending(
      true,
    );

    try {
      if (!backendConnected) {
        throw new Error(
          "Your session is not connected to the backend.",
        );
      }

      let asset:
        | MessageAsset
        | null = null;

      if (messageAsset) {
        asset =
          await new Promise<MessageAsset>(
            (
              resolve,
              reject,
            ) => {
              const request =
                new XMLHttpRequest();

              request.open(
                "POST",
                "/api/message-assets",
              );

              request.withCredentials =
                true;

              request.setRequestHeader(
                "Accept",
                "application/json",
              );

              request.upload.onprogress =
                (event) => {
                  if (
                    event.lengthComputable
                  ) {
                    setMessageStatus(
                      {
                        text: `Uploading ${Math.round(
                          (event.loaded /
                            event.total) *
                            100,
                        )}%`,
                        type: "info",
                      },
                    );
                  }
                };

              request.onload =
                () => {
                  if (
                    request.status >=
                      200 &&
                    request.status < 300
                  ) {
                    try {
                      resolve(
                        JSON.parse(
                          request.responseText ||
                            "{}",
                        ) as MessageAsset,
                      );
                    } catch {
                      reject(
                        new Error(
                          "upload_failed",
                        ),
                      );
                    }
                  } else {
                    reject(
                      new Error(
                        "upload_failed",
                      ),
                    );
                  }
                };

              request.onerror =
                () =>
                  reject(
                    new Error(
                      "upload_failed",
                    ),
                  );

              const body =
                new FormData();

              body.append(
                "file",
                messageAsset,
              );

              body.append(
                "profile_id",
                activeMessageProfile.profile_id,
              );

              request.send(
                body,
              );
            },
          );
      }

      await apiRequest(
        API.messages,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            profile_id:
              activeMessageProfile.profile_id,

            text:
              messageText.trim(),

            message_asset_url:
              asset?.url,

            message_asset_name:
              asset?.name,

            message_asset_type:
              asset?.type,

            message_asset_size:
              asset?.size,
          }),
        },
      );

      setMessageText("");
      setMessageAsset(
        null,
      );

      setMessageCount(0);

      if (
        messageFileInput.current
      ) {
        messageFileInput.current.value =
          "";
      }

      setMessageStatus({
        text: "Message sent.",
        type: "success",
      });
    } catch (error) {
      console.error(
        "Failed to send message:",
        error,
      );

      setMessageStatus({
        text:
          error instanceof Error
            ? error.message
            : "Your message or attachment could not be sent. Nothing was shared.",
        type: "error",
      });
    } finally {
      setMessageSending(
        false,
      );
    }
  };

  const saveSettings = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    try {
      if (!backendConnected) {
        throw new Error(
          "backend_unavailable",
        );
      }

      await apiRequest(
        API.settings,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            visibility:
              settings.visibility,

            profile_interest_display:
              settings.interestDisplay
                ? "shown"
                : "hidden",

            message_permission:
              settings.messagePermission,

            last_seen_visibility:
              settings.lastSeenVisibility,

            friend_request_notifications:
              settings.friendNotifications,

            message_notifications:
              settings.messageNotifications,
          }),
        },
      );

      setSettingsStatus({
        text: "Settings saved.",
        type: "success",
      });
    } catch (error) {
      console.error(
        "Failed to save settings:",
        error,
      );

      setSettingsStatus({
        text:
          error instanceof Error &&
          error.message !==
            "backend_unavailable"
            ? error.message
            : "Settings could not be saved remotely. Your current choices remain on this device.",
        type: "error",
      });
    }
  };

  const signOut =
    async () => {
      try {
        const { error } =
          await supabase.auth.signOut();

        if (error) {
          throw error;
        }

        discoveryRequestIdRef.current +=
          1;

        setCurrentProfile(
          null,
        );

        setProfileConfirmed(
          false,
        );

        setPositiveSelections(
          [],
        );

        setPairQueue([]);

        setPairIndex(0);

        setCompletionProfile(
          null,
        );

        setFriendRequestStates(
          {},
        );

        setFriends([]);

        setActiveMessageProfile(
          null,
        );

        setMessageOpen(
          false,
        );

        setEditingProfile(
          false,
        );

        setProfiles([]);

        setDiscoverState(
          "loading",
        );

        setDiscoverNotice(
          null,
        );

        setView("discover");
      } catch (error) {
        console.error(
          "Failed to sign out:",
          error,
        );

        setSettingsStatus({
          text:
            error instanceof Error
              ? error.message
              : "Sign out could not be completed.",
          type: "error",
        });
      }
    };

  const deleteAccount =
    async () => {
      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (
          !session?.access_token
        ) {
          throw new Error(
            "Your session has expired.",
          );
        }

        const response =
          await fetch(
            "/api/account/delete",
            {
              method: "DELETE",
              headers: {
                Accept:
                  "application/json",

                Authorization: `Bearer ${session.access_token}`,
              },
            },
          );

        if (!response.ok) {
          let message =
            "Your account could not be deleted.";

          try {
            const data =
              (await response.json()) as {
                error?: unknown;
              };

            if (
              typeof data.error ===
              "string"
            ) {
              message =
                data.error;
            }
          } catch {
            // Ignore invalid JSON error responses.
          }

          throw new Error(
            message,
          );
        }

        await supabase.auth.signOut();

        discoveryRequestIdRef.current +=
          1;

        setCurrentProfile(
          null,
        );

        setProfileConfirmed(
          false,
        );

        setPositiveSelections(
          [],
        );

        setPairQueue([]);

        setPairIndex(0);

        setCompletionProfile(
          null,
        );

        setFriendRequestStates(
          {},
        );

        setFriends([]);

        setActiveMessageProfile(
          null,
        );

        setMessageOpen(
          false,
        );

        setEditingProfile(
          false,
        );

        setProfiles([]);

        setDiscoverState(
          "loading",
        );

        setDiscoverNotice(
          null,
        );

        setView("discover");
      } catch (error) {
        console.error(
          "Failed to delete account:",
          error,
        );

        setSettingsStatus({
          text:
            error instanceof Error
              ? error.message
              : "Your account could not be deleted. Please try again.",
          type: "error",
        });
      }
    };

  const openConfirmation = (
    title: string,
    message: string,
    action: () => Promise<void>,
  ) => {
    setDialog({
      title,
      message,
      action,
    });
  };

  const progressTotal =
    DISCOVERY_ROUNDS;

  const progressCurrent =
    completionProfile
      ? DISCOVERY_ROUNDS
      : pairQueue.length > 0
        ? Math.min(
            pairIndex + 1,
            DISCOVERY_ROUNDS,
          )
        : 0;

  const progressPercent =
    completionProfile
      ? 100
      : progressCurrent > 0
        ? (progressCurrent /
            DISCOVERY_ROUNDS) *
          100
        : 0;

  /*
   * Keep the number passed to DiscoverView consistent
   * with an existing valid pair.
   *
   * This prevents the presentation layer from deciding
   * that the pair is "insufficient" while page.tsx has
   * already successfully built one.
   */
  const visibleProfilesCount =
    Math.max(
      availableProfiles.length,
      currentPair.length,
    );

  if (authLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-brand">
            <div className="auth-brand-mark">
              <Image
                src="/myFolks_logo.jpg"
                alt="myFolks"
                width={48}
                height={48}
                className="brand-logo-image"
              />
            </div>

            <div>
              <strong>
                myFolks
              </strong>

              <span>
                Find common ground
              </span>
            </div>
          </div>

          <div className="auth-heading">
            <p className="eyebrow">
              myFolks
            </p>

            <h1>
              Getting things ready.
            </h1>

            <p>
              Just a moment.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!authenticated) {
    return <AuthScreen />;
  }

  return (
    <>
      <div className="app-shell grain">
        <header className="site-header">
          <div className="header-inner">
            <button
              type="button"
              className="brand-button focus-ring"
              onClick={() =>
                showView(
                  "discover",
                )
              }
            >
              <div className="brand-mark">
                <Image
                  src="/myFolks_logo.jpg"
                  alt="myFolks"
                  width={48}
                  height={48}
                  className="brand-logo-image"
                />
              </div>

              <span>
                <span className="wordmark">
                  myFolks
                </span>

                <span className="tagline">
                  Find common ground
                </span>
              </span>
            </button>

            <button
              type="button"
              className="mobile-menu-toggle focus-ring"
              onClick={() =>
                setMobileMenuOpen(
                  (value) => !value,
                )
              }
              aria-expanded={
                mobileMenuOpen
              }
              aria-label={
                mobileMenuOpen
                  ? "Close navigation"
                  : "Open navigation"
              }
            >
              <Icon
                name={
                  mobileMenuOpen
                    ? "x"
                    : "menu"
                }
                size={22}
              />
            </button>

            <nav
              className={`primary-nav ${
                mobileMenuOpen
                  ? "is-open"
                  : ""
              }`}
            >
              <NavButton
                active={
                  view ===
                  "discover"
                }
                onClick={() =>
                  showView(
                    "discover",
                  )
                }
              >
                Discover
              </NavButton>

              <NavButton
                active={
                  view === "friends"
                }
                onClick={() =>
                  showView(
                    "friends",
                  )
                }
              >
                Friends
              </NavButton>

              {profileConfirmed && (
                <NavButton
                  active={
                    view ===
                    "messages"
                  }
                  onClick={() =>
                    showView(
                      "messages",
                    )
                  }
                >
                  Messages
                </NavButton>
              )}

              {!profileConfirmed && (
                <NavButton
                  active={
                    view ===
                    "create"
                  }
                  onClick={() =>
                    showView(
                      "create",
                    )
                  }
                >
                  Create profile
                </NavButton>
              )}

              {profileConfirmed && (
                <>
                  <NavButton
                    active={
                      view ===
                      "profile"
                    }
                    onClick={() =>
                      showView(
                        "profile",
                      )
                    }
                  >
                    My profile
                  </NavButton>

                  <NavButton
                    active={
                      view ===
                      "settings"
                    }
                    onClick={() =>
                      showView(
                        "settings",
                      )
                    }
                  >
                    Settings
                  </NavButton>
                </>
              )}

              <button
                type="button"
                className="theme-toggle focus-ring"
                onClick={
                  toggleTheme
                }
                disabled={
                  themeAnimating
                }
                aria-label={
                  darkMode
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                title={
                  darkMode
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                <Icon
                  name={
                    darkMode
                      ? "sun"
                      : "moon"
                  }
                  size={18}
                  strokeWidth={2}
                />
              </button>
            </nav>
          </div>
        </header>

        <main className="main-content">
          {view ===
            "discover" && (
            <DiscoverView
              profiles={
                profiles
              }
              currentPair={
                currentPair
              }
              discoverState={
                discoverState
              }
              progressCurrent={
                progressCurrent
              }
              progressTotal={
                progressTotal
              }
              progressPercent={
                progressPercent
              }
              positiveSelections={
                positiveSelections
              }
              visibleProfilesCount={
                visibleProfilesCount
              }
              notice={
                discoverNotice
              }
              onChoose={
                chooseInterest
              }
              onSkip={
                skipPair
              }
              onReport={
                reportProfile
              }
              onBlock={(
                profile,
              ) =>
                openConfirmation(
                  "Block this person?",
                  "They will no longer appear in your discovery session.",
                  () =>
                    blockProfile(
                      profile,
                    ),
                )
              }
              onRetry={() => {
                restartDiscovery();
              }}
            />
          )}

          {view ===
            "friends" && (
            <FriendsView
              friends={
                friends
              }
              search={
                friendSearch
              }
              onSearch={
                setFriendSearch
              }
              onOpenMessage={
                openSelectedMessage
              }
              onRequestsChanged={
                refreshRelationshipData
              }
            />
          )}

          {view ===
            "messages" && (
            <MessagesView
              friends={
                friends
              }
              activeProfile={
                activeMessageProfile
              }
              mobileOpen={
                messageOpen
              }
              messageText={
                messageText
              }
              messageAsset={
                messageAsset
              }
              messageStatus={
                messageStatus
              }
              messageSending={
                messageSending
              }
              messageCount={
                messageCount
              }
              fileInputRef={
                messageFileInput
              }
              onSelect={(
                profile,
              ) => {
                const relationship =
                  friendRequestStates[
                    profile.profile_id
                  ];

                if (
                  relationship?.status !==
                  "accepted"
                ) {
                  setMessageStatus({
                    text: "You can only message accepted friends.",
                    type: "error",
                  });

                  return;
                }

                setActiveMessageProfile(
                  profile,
                );

                setMessageOpen(
                  true,
                );
              }}
              onBack={() =>
                setMessageOpen(
                  false,
                )
              }
              onTextChange={(
                value,
              ) => {
                setMessageText(
                  value,
                );

                setMessageCount(
                  value.length,
                );
              }}
              onFile={(
                file,
              ) => {
                if (!file)
                  return;

                const allowed =
                  file.type.startsWith(
                    "image/",
                  ) ||
                  [
                    "application/pdf",
                    "text/plain",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  ].includes(
                    file.type,
                  );

                if (
                  !allowed ||
                  file.size >
                    MAX_MESSAGE_ASSET_SIZE
                ) {
                  setMessageStatus(
                    {
                      text: "Choose an image or document up to 10 MB.",
                      type: "error",
                    },
                  );

                  return;
                }

                setMessageAsset(
                  file,
                );

                setMessageStatus(
                  null,
                );
              }}
              onRemoveAsset={() => {
                setMessageAsset(
                  null,
                );

                if (
                  messageFileInput.current
                ) {
                  messageFileInput.current.value =
                    "";
                }
              }}
              onSend={
                sendMessage
              }
            />
          )}

          {view ===
            "create" && (
            <CreateProfileView
              profilePhoto={
                profilePhoto
              }
              profilePhotoUrl={
                profilePhotoUrl
              }
              status={
                profileStatus
              }
              formStatus={
                formStatus
              }
              onPhoto={
                chooseProfilePhoto
              }
              onRemovePhoto={() => {
                if (
                  profilePhotoUrl
                ) {
                  URL.revokeObjectURL(
                    profilePhotoUrl,
                  );
                }

                setProfilePhoto(
                  null,
                );

                setProfilePhotoUrl(
                  null,
                );

                setProfileStatus(
                  {
                    text: "Profile photo removed. Choose another photo when ready.",
                    type: "info",
                  },
                );
              }}
              onSubmit={
                createProfile
              }
            />
          )}

          {view ===
            "profile" && (
            <ProfileView
              profile={
                currentProfile
              }
              editing={
                editingProfile
              }
              editFullName={
                editFullName
              }
              editUsername={
                editUsername
              }
              editBio={
                editBio
              }
              editLocation={
                editLocation
              }
              editInterests={
                editInterests
              }
              editCustomInterest={
                editCustomInterest
              }
              editProfilePhotoUrl={
                editProfilePhotoUrl
              }
              editProfileStatus={
                editProfileStatus
              }
              editProfileSaving={
                editProfileSaving
              }
              onStartEdit={
                beginProfileEdit
              }
              onCancelEdit={() => {
                setEditingProfile(
                  false,
                );

                setEditProfileStatus(
                  null,
                );

                setEditProfilePhoto(
                  null,
                );

                if (
                  editProfilePhotoUrl
                ) {
                  URL.revokeObjectURL(
                    editProfilePhotoUrl,
                  );
                }

                setEditProfilePhotoUrl(
                  null,
                );
              }}
              onFullNameChange={
                setEditFullName
              }
              onUsernameChange={
                setEditUsername
              }
              onBioChange={
                setEditBio
              }
              onLocationChange={
                setEditLocation
              }
              onToggleInterest={(
                interest,
              ) => {
                setEditInterests(
                  (previous) =>
                    previous.includes(
                      interest,
                    )
                      ? previous.filter(
                          (
                            item,
                          ) =>
                            item !==
                            interest,
                        )
                      : [
                          ...previous,
                          interest,
                        ],
                );
              }}
              onCustomInterestChange={
                setEditCustomInterest
              }
              onPhoto={
                chooseEditProfilePhoto
              }
              onRemovePhoto={() => {
                if (
                  editProfilePhotoUrl
                ) {
                  URL.revokeObjectURL(
                    editProfilePhotoUrl,
                  );
                }

                setEditProfilePhoto(
                  null,
                );

                setEditProfilePhotoUrl(
                  null,
                );

                setEditProfileStatus(
                  {
                    text: "New profile photo removed.",
                    type: "info",
                  },
                );
              }}
              onSave={
                saveEditedProfile
              }
              onSignOut={() =>
                openConfirmation(
                  "Sign out of myFolks?",
                  "You will be signed out on this device.",
                  signOut,
                )
              }
            />
          )}

          {view ===
            "settings" && (
            <SettingsView
              settings={
                settings
              }
              status={
                settingsStatus
              }
              blockedCount={
                blockedProfiles.size
              }
              onChange={
                setSettings
              }
              onSave={
                saveSettings
              }
              onDelete={() =>
                openConfirmation(
                  "Delete your account?",
                  "This will permanently delete your myFolks account and associated profile data. This action cannot be undone.",
                  deleteAccount,
                )
              }
              onSignOut={() =>
                openConfirmation(
                  "Sign out of myFolks?",
                  "You will be signed out on this device.",
                  signOut,
                )
              }
            />
          )}
        </main>

        <footer className="site-footer">
          © 2026 All rights reserved by
          Darien Corporation
        </footer>

        {completionProfile && (
          <div className="modal-backdrop">
            <div className="completion-modal">
              <div className="completion-icon">
                <Icon
                  name="sparkle"
                  size={28}
                />
              </div>

              <p className="eyebrow">
                Six rounds complete
              </p>

              <h2>
                You found a match.
              </h2>

              <p className="completion-intro">
                You completed all six
                discovery rounds. This is the
                person you selected in your
                final round.
              </p>

              <div className="completion-profile">
                <div className="completion-profile-photo">
                  {completionProfile.photo_url ? (
                    <img
                      src={
                        completionProfile.photo_url
                      }
                      alt={
                        completionProfile.display_name
                      }
                      className="completion-profile-image"
                    />
                  ) : (
                    <div className="completion-profile-placeholder">
                      <Icon
                        name="user"
                        size={34}
                      />
                    </div>
                  )}
                </div>

                <div className="completion-profile-details">
                  <h3>
                    {
                      completionProfile.display_name
                    }
                  </h3>

                  {completionProfile.username && (
                    <p className="completion-username">
                      @
                      {
                        completionProfile.username
                      }
                    </p>
                  )}

                  {completionProfile.featured_interest && (
                    <p className="completion-interest">
                      {
                        completionProfile.featured_interest
                      }
                    </p>
                  )}

                  {completionProfile.bio && (
                    <p className="completion-bio">
                      {
                        completionProfile.bio
                      }
                    </p>
                  )}

                  {completionProfile.location && (
                    <p className="completion-location">
                      {
                        completionProfile.location
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="completion-actions">
                {(() => {
                  const requestState =
                    friendRequestStates[
                      completionProfile
                        .profile_id
                    ];

                  const requestStatus =
                    requestState?.status;

                  const isDisabled =
                    requestStatus ===
                      "pending" ||
                    requestStatus ===
                      "accepted" ||
                    requestStatus ===
                      "incoming";

                  let label =
                    "Add to friends";

                  if (
                    requestStatus ===
                    "pending"
                  ) {
                    label =
                      "Request pending";
                  }

                  if (
                    requestStatus ===
                    "accepted"
                  ) {
                    label =
                      "Friends";
                  }

                  if (
                    requestStatus ===
                    "incoming"
                  ) {
                    label =
                      "Request received";
                  }

                  return (
                    <button
                      type="button"
                      className="button primary"
                      onClick={
                        sendFriendRequest
                      }
                      disabled={
                        isDisabled
                      }
                    >
                      {label}
                    </button>
                  );
                })()}

                <button
                  type="button"
                  className="button lavender"
                  onClick={() =>
                    openSelectedMessage(
                      completionProfile,
                    )
                  }
                >
                  Send a message
                </button>
              </div>

              <button
                type="button"
                className="text-button"
                onClick={() =>
                  restartDiscovery()
                }
              >
                Continue discovering
              </button>
            </div>
          </div>
        )}

        {dialog && (
          <div className="modal-backdrop">
            <div className="confirm-modal">
              <h2>
                {dialog.title}
              </h2>

              <p>
                {dialog.message}
              </p>

              <div className="dialog-actions">
                <button
                  type="button"
                  className="button lavender"
                  onClick={() =>
                    setDialog(null)
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="button primary"
                  onClick={async () => {
                    const action =
                      dialog.action;

                    setDialog(null);

                    if (action) {
                      await action();
                    }
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}