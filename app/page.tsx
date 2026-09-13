"use client";

import { supabase } from "@/src/lib/supabase";
import AuthScreen from "@/components/auth/AuthScreen";

import {
  createProfile as createSupabaseProfile,
  getCurrentUserProfile,
} from "@/src/lib/profile";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { flushSync } from "react-dom";

type View =
  | "discover"
  | "friends"
  | "messages"
  | "create"
  | "profile"
  | "settings";

type Profile = {
  profile_id: string;
  username?: string;
  display_name: string;
  featured_interest: string;
  bio?: string;
  location?: string;
  visibility?: string;
  allows_messages?: boolean;
  photo_url?: string;
};

type Settings = {
  visibility: string;
  lastSeenVisibility: string;
  interestDisplay: boolean;
  messagePermission: string;
  friendNotifications: boolean;
  messageNotifications: boolean;
};

type MessageAsset = {
  url: string;
  name?: string;
  type?: string;
  size?: number;
};

type Message = {
  id?: string;
  text?: string;
  sender_profile_id?: string;
  created_at?: string;
  message_asset_url?: string;
  message_asset_name?: string;
};

const API = {
  health: "/api/health",
  discover: "/api/discover/profiles",
  friendRequests: "/api/friend-requests",
  messages: "/api/messages",
  reports: "/api/reports",
  blocks: "/api/blocks",
  settings: "/api/settings/me",
  profile: "/api/profiles/me",
  signOut: "/api/auth/signout",
};

const MAX_PROFILE_PHOTO_SIZE = 10 * 1024 * 1024;
const MAX_MESSAGE_ASSET_SIZE = 10 * 1024 * 1024;

const FEATURED_INTERESTS = [
  "Music",
  "Science",
  "Technology",
  "Art",
  "Gaming",
  "Travel",
  "Reading",
  "Photography",
  "Movies",
  "Cooking",
  "Nature",
  "Fitness",
  "Design",
  "Writing",
  "History",
  "Space",
];

const INITIAL_FEATURED_INTERESTS = 6;

function initials(name: string) {
  return String(name || "myFolks")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

async function apiRequest(
  path: string,
  options: RequestInit = {},
): Promise<any> {
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error("request_failed");
  }

  const type = response.headers.get("content-type") || "";

  return type.includes("application/json")
    ? response.json()
    : {};
}

function Icon({
  name,
  size = 20,
  strokeWidth = 2,
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<string, React.ReactNode> = {
    menu: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
      </>
    ),

    x: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </>
    ),

    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),

    loader: (
      <>
        <path d="M21 12a9 9 0 1 1-6.7-8.7" />
      </>
    ),

    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),

    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </>
    ),

    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),

    heart: (
      <path d="M20.8 8.9c0 5.1-8.8 10.1-8.8 10.1S3.2 14 3.2 8.9A4.9 4.9 0 0 1 12 6.2a4.9 4.9 0 0 1 8.8 2.7Z" />
    ),

    messages: (
      <>
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.6 9.6 0 0 1-4-.9L3 21l1.9-4.1A8.2 8.2 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" />
        <path d="M8 11h.01" />
        <path d="M12 11h.01" />
        <path d="M16 11h.01" />
      </>
    ),

    arrowLeft: (
      <>
        <path d="m15 18-6-6 6-6" />
        <path d="M9 12h12" />
      </>
    ),

    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),

    sparkle: (
      <>
        <path d="m12 3-1.2 5.8L5 10l5.8 1.2L12 17l1.2-5.8L19 10l-5.8-1.2L12 3Z" />
        <path d="m19 16-.6 2.4L16 19l2.4.6L19 16Z" />
      </>
    ),

    close: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6 6 18" />
      </>
    ),

    plusImage: (
      <>
        <rect x="3" y="3" width="15" height="15" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m18 14 3 3" />
        <path d="M19.5 10v6" />
        <path d="M16.5 13h6" />
      </>
    ),

    handshake: (
      <>
        <path d="m11 5 2 2 2-2 5 5-3 3-2-2-3 3-4-4" />
        <path d="m5 10-3 3 4 4 3-3" />
        <path d="m14 15 3 3" />
        <path d="m17 12 3 3" />
      </>
    ),

    sun: (
      <>
        <circle
          cx="12"
          cy="12"
          r="4.25"
          fill="currentColor"
          stroke="none"
        />

        <path d="M12 2.5v2" />
        <path d="M12 19.5v2" />

        <path d="m4.93 4.93 1.42 1.42" />
        <path d="m17.65 17.65 1.42 1.42" />

        <path d="M2.5 12h2" />
        <path d="M19.5 12h2" />

        <path d="m4.93 19.07 1.42-1.42" />
        <path d="m17.65 6.35 1.42-1.42" />
      </>
    ),

    moon: (
      <>
        <path
          d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8a8.6 8.6 0 1 0 11.3 11.3Z"
          fill="currentColor"
          stroke="none"
        />

        <path
          d="M16.9 5.9a6.8 6.8 0 0 1 1.2 1.1"
          opacity="0.45"
        />
      </>
    ),
  };

  return <svg {...common}>{paths[name] ?? paths.sparkle}</svg>;
}

function Avatar({
  profile,
  large = false,
}: {
  profile?: Profile | null;
  large?: boolean;
}) {
  if (profile?.photo_url) {
    return (
      <img
        src={profile.photo_url}
        alt={profile.display_name}
        className={`avatar-image ${large ? "avatar-large" : ""}`}
      />
    );
  }

  return (
    <div className={`avatar ${large ? "avatar-large" : ""}`}>
      {initials(profile?.display_name || "myFolks")}
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("discover");
  const [darkMode, setDarkMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [themeAnimating, setThemeAnimating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [discoverState, setDiscoverState] = useState<
    "loading" | "ready" | "empty" | "error"
  >("loading");

  const [pairQueue, setPairQueue] = useState<Profile[][]>([]);
  const [pairIndex, setPairIndex] = useState(0);

  const [positiveSelections, setPositiveSelections] = useState<Profile[]>(
    [],
  );

  const [blockedProfiles, setBlockedProfiles] = useState<Set<string>>(
    new Set(),
  );

  const [completionProfile, setCompletionProfile] =
    useState<Profile | null>(null);

  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    action: (() => Promise<void>) | null;
  } | null>(null);

  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  const [profileConfirmed, setProfileConfirmed] = useState(false);

  const [activeMessageProfile, setActiveMessageProfile] =
    useState<Profile | null>(null);

  const [messageOpen, setMessageOpen] = useState(false);

  const [settings, setSettings] = useState<Settings>({
    visibility: "published",
    lastSeenVisibility: "connections",
    interestDisplay: true,
    messagePermission: "friends_only",
    friendNotifications: true,
    messageNotifications: true,
  });

  const [friendSearch, setFriendSearch] = useState("");

  const [messageText, setMessageText] = useState("");

  const [messageAsset, setMessageAsset] = useState<File | null>(null);

  const [messageStatus, setMessageStatus] = useState<{
    text: string;
    type: "info" | "success" | "error";
  } | null>(null);

  const [messageSending, setMessageSending] = useState(false);

  const messageFileInput = useRef<HTMLInputElement>(null);

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const [profileStatus, setProfileStatus] = useState<{
    text: string;
    type: "info" | "success" | "error";
  } | null>(null);

  const [formStatus, setFormStatus] = useState<{
    text: string;
    type: "info" | "success" | "error";
  } | null>(null);

  const [settingsStatus, setSettingsStatus] = useState<{
    text: string;
    type: "info" | "success" | "error";
  } | null>(null);

  const [discoverNotice, setDiscoverNotice] = useState<{
    text: string;
    type: "info" | "success" | "error";
  } | null>(null);

  const [messageCount, setMessageCount] = useState(0);

  const currentPair = pairQueue[pairIndex] || [];

  const availableProfiles = useMemo(
    () =>
      profiles.filter(
        (profile) => !blockedProfiles.has(profile.profile_id),
      ),
    [profiles, blockedProfiles],
  );

  const friends = useMemo(() => {
    const unique = new Map<string, Profile>();

    positiveSelections.forEach((profile) => {
      if (!blockedProfiles.has(profile.profile_id)) {
        unique.set(profile.profile_id, profile);
      }
    });

    return Array.from(unique.values()).filter((friend) =>
      friend.display_name
        .toLocaleLowerCase()
        .includes(friendSearch.toLocaleLowerCase().trim()),
    );
  }, [positiveSelections, blockedProfiles, friendSearch]);

  const showView = (nextView: View) => {
    setView(nextView);
    setMobileMenuOpen(false);
  };

  const getThemeRadius = (x: number, y: number) => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    return Math.max(
      Math.hypot(x, y),
      Math.hypot(width - x, y),
      Math.hypot(x, height - y),
      Math.hypot(width - x, height - y),
    );
  };

  const toggleTheme = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (themeAnimating) return;

    const rect = event.currentTarget.getBoundingClientRect();

    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const nextDarkMode = !darkMode;
    const radius = getThemeRadius(x, y);

    document.documentElement.style.setProperty("--theme-x", `${x}px`);
    document.documentElement.style.setProperty("--theme-y", `${y}px`);
    document.documentElement.style.setProperty(
      "--theme-radius",
      `${radius}px`,
    );

    setThemeAnimating(true);

    const applyTheme = () => {
      document.documentElement.dataset.theme = nextDarkMode
        ? "dark"
        : "light";

      flushSync(() => {
        setDarkMode(nextDarkMode);
      });

      window.localStorage.setItem(
        "myfolks-theme",
        nextDarkMode ? "dark" : "light",
      );
    };

    const doc = document as Document & {
      startViewTransition?: (
        callback: () => void | Promise<void>,
      ) => {
        finished: Promise<void>;
      };
    };

    if (doc.startViewTransition) {
      const transition = doc.startViewTransition(applyTheme);

      void transition.finished.then(
        () => setThemeAnimating(false),
        () => setThemeAnimating(false),
      );
    } else {
      applyTheme();

      window.setTimeout(() => {
        setThemeAnimating(false);
      }, 700);
    }
  };

  const setStatus = (
    type: "info" | "success" | "error",
    text: string,
    target: "discover" | "profile" | "settings" | "message",
  ) => {
    const value = { text, type };

    if (target === "discover") {
      setDiscoverNotice(value);
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

  const buildPairQueue = (sourceProfiles = profiles) => {
    const available = sourceProfiles.filter(
      (profile) => !blockedProfiles.has(profile.profile_id),
    );

    const pairs: Profile[][] = [];

    for (let i = 0; i < available.length; i += 1) {
      for (let j = i + 1; j < available.length; j += 1) {
        pairs.push([available[i], available[j]]);
      }
    }

    const shuffled = shuffle(pairs);

    setPairQueue(shuffled);
    setPairIndex(0);
  };

  const loadRemoteProfiles = async () => {
    setDiscoverState("loading");

    try {
      const data = await apiRequest(API.discover);

      const loadedProfiles: Profile[] = (
        data.profiles || data || []
      ).filter((item: Profile) => item?.profile_id);

      setProfiles(loadedProfiles);

      setDiscoverState(
        loadedProfiles.length ? "ready" : "empty",
      );

      buildPairQueue(loadedProfiles);
    } catch {
      setProfiles([]);
      setPairQueue([]);
      setPairIndex(0);
      setDiscoverState("error");
    }
  };

  useLayoutEffect(() => {
    const savedTheme = window.localStorage.getItem("myfolks-theme");

    const isDark = savedTheme === "dark";

    document.documentElement.dataset.theme = isDark
      ? "dark"
      : "light";

    document.documentElement.classList.toggle(
      "supports-view-transition",
      "startViewTransition" in document,
    );

    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setAuthenticated(Boolean(session));
      setBackendConnected(Boolean(session));
      setAuthLoading(false);
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        setAuthenticated(Boolean(session));
        setBackendConnected(Boolean(session));
        setAuthLoading(false);
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    const loadProfile = async () => {
      try {
        const profile = await getCurrentUserProfile();

        if (!profile) {
          setCurrentProfile(null);
          setProfileConfirmed(false);
          return;
        }

        const loadedProfile: Profile = {
          profile_id: profile.id,

          username:
            typeof profile.username === "string"
              ? profile.username
              : undefined,

          display_name:
            typeof profile.full_name === "string"
              ? profile.full_name
              : typeof profile.username === "string"
                ? profile.username
                : "myFolks user",

          /*
           * These fields belong to the UI/legacy model,
           * not the current Supabase profiles table.
           */
          featured_interest: "",

          bio:
            typeof profile.bio === "string"
              ? profile.bio
              : "",

          location:
            typeof profile.location === "string"
              ? profile.location
              : "",

          visibility: "published",

          allows_messages: true,

          /*
           * Supabase calls this profile_image_url.
           * The UI uses photo_url.
           */
          photo_url:
            typeof profile.profile_image_url === "string"
              ? profile.profile_image_url
              : undefined,
        };

        setCurrentProfile(loadedProfile);
        setProfileConfirmed(true);
      } catch (error) {
        console.error("Failed to load profile:", error);

        setCurrentProfile(null);
        setProfileConfirmed(false);
      }
    };

    void loadProfile();
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;

    void loadRemoteProfiles();
  }, [authenticated]);

  const chooseInterest = (index: number) => {
    const chosen = currentPair[index];

    if (!chosen) return;

    setPositiveSelections((previous) => [
      ...previous,
      chosen,
    ]);

    const nextIndex = pairIndex + 1;

    if (nextIndex >= pairQueue.length) {
      setCompletionProfile(chosen);
      return;
    }

    setPairIndex(nextIndex);
  };

  const skipPair = () => {
    const nextIndex = pairIndex + 1;

    if (nextIndex >= pairQueue.length) {
      setCompletionProfile(
        positiveSelections[positiveSelections.length - 1] || null,
      );
      return;
    }

    setPairIndex(nextIndex);
  };

  const reportProfile = async (profile: Profile) => {
    try {
      if (!backendConnected) {
        throw new Error("backend_unavailable");
      }

      await apiRequest(API.reports, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reported_profile_id: profile.profile_id,
        }),
      });

      setStatus(
        "success",
        "Report submitted for review.",
        "discover",
      );
    } catch {
      setStatus(
        "error",
        "The report could not be saved remotely.",
        "discover",
      );
    }
  };

  const blockProfile = async (profile: Profile) => {
    try {
      if (!backendConnected) {
        throw new Error("backend_unavailable");
      }

      await apiRequest(API.blocks, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blocked_profile_id: profile.profile_id,
        }),
      });

      const nextBlocked = new Set(blockedProfiles);

      nextBlocked.add(profile.profile_id);

      setBlockedProfiles(nextBlocked);

      setStatus(
        "success",
        "Profile blocked.",
        "discover",
      );

      buildPairQueue(
        profiles.filter(
          (item) => item.profile_id !== profile.profile_id,
        ),
      );
    } catch {
      setStatus(
        "error",
        "The block could not be saved remotely.",
        "discover",
      );
    }
  };

  const sendFriendRequest = async () => {
    if (!completionProfile) return;

    try {
      if (!backendConnected) {
        throw new Error("backend_unavailable");
      }

      await apiRequest(API.friendRequests, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile_id: completionProfile.profile_id,
        }),
      });

      setStatus(
        "success",
        "Request sent. It stays pending until they choose to accept.",
        "discover",
      );

      setCompletionProfile(null);
    } catch {
      setStatus(
        "error",
        "The request could not be saved. No remote request was created.",
        "discover",
      );
    }
  };

  const openSelectedMessage = (profile: Profile) => {
    if (!profile.allows_messages) {
      setStatus(
        "info",
        "A friend request must be accepted before you can message this person.",
        "discover",
      );

      return;
    }

    setActiveMessageProfile(profile);
    setMessageOpen(true);
    setCompletionProfile(null);
    setView("messages");
  };

  const chooseProfilePhoto = (file?: File) => {
    if (!file) return;

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type);

    if (!allowed || file.size > MAX_PROFILE_PHOTO_SIZE) {
      setProfileStatus({
        text: "Choose a JPG, PNG, or WebP image no larger than 10 MB.",
        type: "error",
      });

      return;
    }

    if (profilePhotoUrl) {
      URL.revokeObjectURL(profilePhotoUrl);
    }

    const url = URL.createObjectURL(file);

    setProfilePhoto(file);
    setProfilePhotoUrl(url);

    setProfileStatus({
      text: "Photo ready to upload when you create your profile.",
      type: "success",
    });
  };

  useEffect(() => {
    return () => {
      if (profilePhotoUrl) {
        URL.revokeObjectURL(profilePhotoUrl);
      }
    };
  }, [profilePhotoUrl]);

  const uploadProfilePhoto = async (file: File) => {
    return new Promise<any>((resolve, reject) => {
      const request = new XMLHttpRequest();

      request.open("POST", "/api/profile-assets");
      request.withCredentials = true;

      request.setRequestHeader(
        "Accept",
        "application/json",
      );

      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProfileStatus({
            text: `Uploading profile photo — ${Math.round(
              (event.loaded / event.total) * 100,
            )}%`,
            type: "info",
          });
        }
      };

      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          try {
            resolve(
              JSON.parse(request.responseText || "{}"),
            );
          } catch {
            resolve({});
          }
        } else {
          reject(new Error("upload_failed"));
        }
      };

      request.onerror = () =>
        reject(new Error("upload_failed"));

      const body = new FormData();

      body.append("file", file);

      request.send(body);
    });
  };

  const createProfile = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const nameInput = document.getElementById(
      "profile-name",
    ) as HTMLInputElement | null;

    const interestInput = document.getElementById(
      "profile-interest",
    ) as HTMLInputElement | null;

    const bioInput = document.getElementById(
      "profile-bio",
    ) as HTMLTextAreaElement | null;

    if (!nameInput || !interestInput || !bioInput) {
      setFormStatus({
        text: "The profile form could not be read. Please refresh and try again.",
        type: "error",
      });

      return;
    }

    try {
      if (!backendConnected) {
        throw new Error("backend_unavailable");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be signed in.");
      }

      const metadataUsername =
        typeof user.user_metadata?.username === "string"
          ? user.user_metadata.username.trim()
          : "";

      if (!metadataUsername) {
        throw new Error(
          "Your account does not have a username. Please sign out and create your account again with a username.",
        );
      }

      let uploadedPhoto: any = null;

      if (profilePhoto) {
        uploadedPhoto = await uploadProfilePhoto(profilePhoto);
      }

      const savedProfile = await createSupabaseProfile({
        username: metadataUsername,
        fullName: nameInput.value.trim(),
        bio: bioInput.value.trim(),
        location: "",
        profileImageUrl: uploadedPhoto?.url || null,
      });

      const normalizedProfile: Profile = {
        profile_id: savedProfile.id,

        username:
          typeof savedProfile.username === "string"
            ? savedProfile.username
            : metadataUsername,

        display_name:
          typeof savedProfile.full_name === "string"
            ? savedProfile.full_name
            : nameInput.value.trim(),

        featured_interest: interestInput.value.trim(),

        bio:
          typeof savedProfile.bio === "string"
            ? savedProfile.bio
            : bioInput.value.trim(),

        location:
          typeof savedProfile.location === "string"
            ? savedProfile.location
            : "",

        visibility: "published",

        allows_messages: true,

        photo_url:
          typeof savedProfile.profile_image_url === "string"
            ? savedProfile.profile_image_url
            : uploadedPhoto?.url,
      };

      /*
       * The existing API still owns the legacy profile metadata
       * such as featured interest/photo metadata.
       */
      try {
        const legacyProfile: Record<string, unknown> = {
          profile_id: normalizedProfile.profile_id,
          display_name: normalizedProfile.display_name,
          featured_interest:
            normalizedProfile.featured_interest,
          bio: normalizedProfile.bio || "",
          visibility: "published",
        };

        if (uploadedPhoto) {
          legacyProfile.photo_url = uploadedPhoto.url;
          legacyProfile.photo_name =
            uploadedPhoto.name || profilePhoto?.name;
          legacyProfile.photo_type =
            uploadedPhoto.type || profilePhoto?.type;
          legacyProfile.photo_size =
            uploadedPhoto.size || profilePhoto?.size;
          legacyProfile.photo_count = 1;
        }

        const legacySaved = await apiRequest(API.profile, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(legacyProfile),
        });

        const remoteProfile =
          legacySaved?.profile || legacySaved;

        if (remoteProfile?.profile_id) {
          Object.assign(normalizedProfile, {
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
          });
        }
      } catch (legacyError) {
        console.warn(
          "Legacy profile endpoint was unavailable:",
          legacyError,
        );
      }

      setCurrentProfile(normalizedProfile);
      setProfileConfirmed(true);

      setFormStatus({
        text: "Profile created successfully.",
        type: "success",
      });

      await loadRemoteProfiles();

      showView("profile");
    } catch (error) {
      console.error("Failed to create profile:", error);

      const message =
        error instanceof Error &&
        error.message !== "backend_unavailable"
          ? error.message
          : "Your profile could not be saved. Please try again.";

      setFormStatus({
        text: message,
        type: "error",
      });
    }
  };

  const sendMessage = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      (!messageText.trim() && !messageAsset) ||
      !activeMessageProfile
    ) {
      setStatus(
        "error",
        "Write a message or choose an attachment before sending.",
        "message",
      );

      return;
    }

    setMessageSending(true);

    try {
      if (!backendConnected) {
        throw new Error("offline");
      }

      let asset: MessageAsset | null = null;

      if (messageAsset) {
        asset = await new Promise<MessageAsset>(
          (resolve, reject) => {
            const request = new XMLHttpRequest();

            request.open(
              "POST",
              "/api/message-assets",
            );

            request.withCredentials = true;

            request.setRequestHeader(
              "Accept",
              "application/json",
            );

            request.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                setMessageStatus({
                  text: `Uploading ${Math.round(
                    (event.loaded / event.total) * 100,
                  )}%`,
                  type: "info",
                });
              }
            };

            request.onload = () => {
              if (
                request.status >= 200 &&
                request.status < 300
              ) {
                try {
                  resolve(
                    JSON.parse(
                      request.responseText || "{}",
                    ),
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

            request.onerror = () =>
              reject(
                new Error(
                  "upload_failed",
                ),
              );

            const body = new FormData();

            body.append(
              "file",
              messageAsset,
            );

            body.append(
              "profile_id",
              activeMessageProfile.profile_id,
            );

            request.send(body);
          },
        );
      }

      await apiRequest(API.messages, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile_id:
            activeMessageProfile.profile_id,
          text: messageText.trim(),
          message_asset_url: asset?.url,
          message_asset_name: asset?.name,
          message_asset_type: asset?.type,
          message_asset_size: asset?.size,
        }),
      });

      setMessageText("");
      setMessageAsset(null);
      setMessageCount(0);

      if (messageFileInput.current) {
        messageFileInput.current.value = "";
      }

      setMessageStatus({
        text: "Message sent.",
        type: "success",
      });
    } catch {
      setMessageStatus({
        text: "Your message or attachment could not be sent. Nothing was shared.",
        type: "error",
      });
    } finally {
      setMessageSending(false);
    }
  };

  const saveSettings = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    try {
      if (!backendConnected) {
        throw new Error("backend_unavailable");
      }

      await apiRequest(API.settings, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visibility: settings.visibility,
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
      });

      setSettingsStatus({
        text: "Settings saved.",
        type: "success",
      });
    } catch {
      setSettingsStatus({
        text: "Settings could not be saved remotely. Your current choices remain on this device.",
        type: "error",
      });
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setCurrentProfile(null);
      setProfileConfirmed(false);
      setPositiveSelections([]);
      setPairQueue([]);
      setPairIndex(0);
      setCompletionProfile(null);
      setActiveMessageProfile(null);
      setMessageOpen(false);
      setView("discover");
    } catch {
      setSettingsStatus({
        text: "Sign out could not be completed.",
        type: "error",
      });
    }
  };

  const deleteProfile = async () => {
    try {
      if (!backendConnected) {
        throw new Error("backend_unavailable");
      }

      await apiRequest(API.profile, {
        method: "DELETE",
      });

      setCurrentProfile(null);
      setProfileConfirmed(false);

      setSettingsStatus({
        text: "Your profile was deleted.",
        type: "success",
      });

      showView("discover");
    } catch {
      setSettingsStatus({
        text: "Your profile could not be deleted remotely.",
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

  const progressTotal = pairQueue.length;

  const progressCurrent =
    progressTotal > 0
      ? Math.min(pairIndex + 1, progressTotal)
      : 0;

  const progressPercent =
    progressTotal > 0
      ? (Math.min(pairIndex, progressTotal) /
          progressTotal) *
        100
      : 0;

  const visibleProfilesCount = availableProfiles.length;

  if (authLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-brand">
            <div className="auth-brand-mark">m</div>

            <div>
              <strong>myFolks</strong>
              <span>Find common ground</span>
            </div>
          </div>

          <div className="auth-heading">
            <p className="eyebrow">myFolks</p>

            <h1>Getting things ready.</h1>

            <p>Just a moment.</p>
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
              onClick={() => showView("discover")}
            >
              <div className="brand-mark">m</div>

              <span>
                <span className="wordmark">myFolks</span>

                <span className="tagline">
                  Find common ground
                </span>
              </span>
            </button>

            <button
              type="button"
              className="mobile-menu-toggle focus-ring"
              onClick={() =>
                setMobileMenuOpen((value) => !value)
              }
              aria-expanded={mobileMenuOpen}
              aria-label={
                mobileMenuOpen
                  ? "Close navigation"
                  : "Open navigation"
              }
            >
              <Icon
                name={mobileMenuOpen ? "x" : "menu"}
                size={22}
              />
            </button>

            <nav
              className={`primary-nav ${
                mobileMenuOpen ? "is-open" : ""
              }`}
            >
              <NavButton
                active={view === "discover"}
                onClick={() => showView("discover")}
              >
                Discover
              </NavButton>

              <NavButton
                active={view === "friends"}
                onClick={() => showView("friends")}
              >
                Friends
              </NavButton>

              {profileConfirmed && (
                <NavButton
                  active={view === "messages"}
                  onClick={() => showView("messages")}
                >
                  Messages
                </NavButton>
              )}

              {!profileConfirmed && (
                <NavButton
                  active={view === "create"}
                  onClick={() => showView("create")}
                >
                  Create profile
                </NavButton>
              )}

              {profileConfirmed && (
                <>
                  <NavButton
                    active={view === "profile"}
                    onClick={() => showView("profile")}
                  >
                    My profile
                  </NavButton>

                  <NavButton
                    active={view === "settings"}
                    onClick={() => showView("settings")}
                  >
                    Settings
                  </NavButton>
                </>
              )}

              <button
                type="button"
                className="theme-toggle focus-ring"
                onClick={toggleTheme}
                disabled={themeAnimating}
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
                  name={darkMode ? "sun" : "moon"}
                  size={18}
                  strokeWidth={2}
                />
              </button>
            </nav>
          </div>
        </header>

        <main className="main-content">
          {view === "discover" && (
            <DiscoverView
              profiles={profiles}
              currentPair={currentPair}
              discoverState={discoverState}
              progressCurrent={progressCurrent}
              progressTotal={progressTotal}
              progressPercent={progressPercent}
              positiveSelections={positiveSelections}
              visibleProfilesCount={visibleProfilesCount}
              notice={discoverNotice}
              onChoose={chooseInterest}
              onSkip={skipPair}
              onReport={reportProfile}
              onBlock={(profile) =>
                openConfirmation(
                  "Block this person?",
                  "They will no longer appear in your discovery session.",
                  () => blockProfile(profile),
                )
              }
              onRetry={loadRemoteProfiles}
            />
          )}

          {view === "friends" && (
            <FriendsView
              friends={friends}
              search={friendSearch}
              onSearch={setFriendSearch}
              onOpenMessage={openSelectedMessage}
            />
          )}

          {view === "messages" && (
            <MessagesView
              friends={friends}
              activeProfile={activeMessageProfile}
              mobileOpen={messageOpen}
              messageText={messageText}
              messageAsset={messageAsset}
              messageStatus={messageStatus}
              messageSending={messageSending}
              messageCount={messageCount}
              fileInputRef={messageFileInput}
              onSelect={(profile) => {
                setActiveMessageProfile(profile);
                setMessageOpen(true);
              }}
              onBack={() => setMessageOpen(false)}
              onTextChange={(value) => {
                setMessageText(value);
                setMessageCount(value.length);
              }}
              onFile={(file) => {
                if (!file) return;

                const allowed =
                  file.type.startsWith("image/") ||
                  [
                    "application/pdf",
                    "text/plain",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  ].includes(file.type);

                if (
                  !allowed ||
                  file.size > MAX_MESSAGE_ASSET_SIZE
                ) {
                  setMessageStatus({
                    text: "Choose an image or document up to 10 MB.",
                    type: "error",
                  });

                  return;
                }

                setMessageAsset(file);
                setMessageStatus(null);
              }}
              onRemoveAsset={() => {
                setMessageAsset(null);

                if (messageFileInput.current) {
                  messageFileInput.current.value = "";
                }
              }}
              onSend={sendMessage}
            />
          )}

          {view === "create" && (
            <CreateProfileView
              profilePhoto={profilePhoto}
              profilePhotoUrl={profilePhotoUrl}
              status={profileStatus}
              formStatus={formStatus}
              onPhoto={chooseProfilePhoto}
              onRemovePhoto={() => {
                if (profilePhotoUrl) {
                  URL.revokeObjectURL(profilePhotoUrl);
                }

                setProfilePhoto(null);
                setProfilePhotoUrl(null);

                setProfileStatus({
                  text: "Profile photo removed. Choose another photo when ready.",
                  type: "info",
                });
              }}
              onSubmit={createProfile}
            />
          )}

          {view === "profile" && (
            <ProfileView
              profile={currentProfile}
              onSignOut={() =>
                openConfirmation(
                  "Sign out of myFolks?",
                  "You will be signed out on this device.",
                  signOut,
                )
              }
            />
          )}

          {view === "settings" && (
            <SettingsView
              settings={settings}
              status={settingsStatus}
              blockedCount={blockedProfiles.size}
              onChange={setSettings}
              onSave={saveSettings}
              onDelete={() =>
                openConfirmation(
                  "Delete your profile?",
                  "This is a destructive action and cannot be undone.",
                  deleteProfile,
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
          © All rights reserved by myFolks
        </footer>

        {completionProfile && (
          <div className="modal-backdrop">
            <div className="completion-modal">
              <div className="completion-icon">
                <Icon name="sparkle" size={28} />
              </div>

              <h2>Perfect match found!</h2>

              <p>
                You completed every available pair and found a
                person whose interest resonated with yours. You
                can take a gentle next step, or simply return to
                Discover.
              </p>

              <div className="completion-actions">
                <button
                  type="button"
                  className="button primary"
                  onClick={sendFriendRequest}
                >
                  Add to friends
                </button>

                <button
                  type="button"
                  className="button lavender"
                  onClick={() =>
                    openSelectedMessage(completionProfile)
                  }
                >
                  Send a message
                </button>
              </div>

              <button
                type="button"
                className="text-button"
                onClick={() => setCompletionProfile(null)}
              >
                Return to Discover
              </button>
            </div>
          </div>
        )}

        {dialog && (
          <div className="modal-backdrop">
            <div className="confirm-modal">
              <h2>{dialog.title}</h2>

              <p>{dialog.message}</p>

              <div className="dialog-actions">
                <button
                  type="button"
                  className="button lavender"
                  onClick={() => setDialog(null)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="button primary"
                  onClick={async () => {
                    const action = dialog.action;

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

function NavButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`nav-link ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function DiscoverView({
  profiles,
  currentPair,
  discoverState,
  progressCurrent,
  progressTotal,
  progressPercent,
  positiveSelections,
  visibleProfilesCount,
  notice,
  onChoose,
  onSkip,
  onReport,
  onBlock,
  onRetry,
}: {
  profiles: Profile[];
  currentPair: Profile[];
  discoverState: string;
  progressCurrent: number;
  progressTotal: number;
  progressPercent: number;
  positiveSelections: Profile[];
  visibleProfilesCount: number;
  notice: {
    text: string;
    type: "info" | "success" | "error";
  } | null;
  onChoose: (index: number) => void;
  onSkip: () => void;
  onReport: (profile: Profile) => void;
  onBlock: (profile: Profile) => void;
  onRetry: () => void;
}) {
  const loading = discoverState === "loading";
  const empty = discoverState === "empty";
  const error = discoverState === "error";

  const insufficient =
    profiles.length > 0 &&
    visibleProfilesCount < 2;

  return (
    <section className="view-panel">
      <div className="section-heading-row">
        <div>
          <Eyebrow>
            Shared-interest discovery
          </Eyebrow>

          <h1>
            Which interest feels familiar?
          </h1>

          <p>
            Choose the featured interest you connect with
            most. It&apos;s about finding common ground,
            never judging people.
          </p>
        </div>

        <div className="progress-card">
          <div className="progress-header">
            <span>Your session</span>

            <span>
              {progressTotal
                ? `Pair ${progressCurrent} of ${progressTotal}`
                : "No pairs"}
            </span>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="state-card">
          <Icon name="loader" size={32} />

          <p>
            Loading profiles to discover…
          </p>
        </div>
      )}

      {empty && (
        <div className="state-card">
          <p>No profiles to discover yet.</p>
        </div>
      )}

      {error && (
        <div className="state-card error-state">
          <p>
            Profiles could not be loaded right now. Please
            try again.
          </p>

          <button
            type="button"
            className="button primary"
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      )}

      {notice && (
        <StatusMessage
          text={notice.text}
          type={notice.type}
        />
      )}

      {insufficient && (
        <div className="insufficient-card">
          <Icon name="users" size={40} />

          <h2>More profiles are needed</h2>

          <p>
            There are not enough available profiles to
            create a discovery pair right now. Check back
            after more people choose to be visible in
            Discover.
          </p>
        </div>
      )}

      {!loading &&
        !empty &&
        !error &&
        !insufficient &&
        currentPair.length === 2 && (
          <>
            <div className="pair-grid">
              <ProfileCard
                profile={currentPair[0]}
                variant="coral"
                onChoose={() => onChoose(0)}
                onReport={() => onReport(currentPair[0])}
                onBlock={() => onBlock(currentPair[0])}
              />

              <div className="or-badge">OR</div>

              <ProfileCard
                profile={currentPair[1]}
                variant="lavender"
                onChoose={() => onChoose(1)}
                onReport={() => onReport(currentPair[1])}
                onBlock={() => onBlock(currentPair[1])}
              />
            </div>

            <div className="discovery-controls">
              <button
                type="button"
                className="button lavender"
                onClick={onSkip}
              >
                Skip this pair
              </button>

              <span className="selection-count">
                {positiveSelections.length} selections
              </span>
            </div>
          </>
        )}
    </section>
  );
}

function ProfileCard({
  profile,
  variant,
  onChoose,
  onReport,
  onBlock,
}: {
  profile: Profile;
  variant: "coral" | "lavender";
  onChoose: () => void;
  onReport: () => void;
  onBlock: () => void;
}) {
  return (
    <article className="profile-card">
      <div className="profile-header">
        <Avatar profile={profile} />

        <div className="profile-heading">
          <span>A myFolks profile</span>

          <h2>{profile.display_name}</h2>
        </div>
      </div>

      <div className={`interest-box ${variant}`}>
        <span>Featured interest</span>

        <strong>{profile.featured_interest}</strong>
      </div>

      {profile.bio && (
        <p className="profile-bio">
          {profile.bio}
        </p>
      )}

      <button
        type="button"
        className="button primary full-width"
        onClick={onChoose}
      >
        I relate to this
      </button>

      <div className="profile-actions">
        <button
          type="button"
          onClick={onReport}
        >
          Report
        </button>

        <button
          type="button"
          onClick={onBlock}
        >
          Block
        </button>
      </div>
    </article>
  );
}

function FriendsView({
  friends,
  search,
  onSearch,
  onOpenMessage,
}: {
  friends: Profile[];
  search: string;
  onSearch: (value: string) => void;
  onOpenMessage: (profile: Profile) => void;
}) {
  return (
    <section className="view-panel">
      <Eyebrow>Your connections</Eyebrow>

      <h1>Friends</h1>

      <p className="section-copy">
        Keep your connections intentional. Friendship begins
        only when both people choose it.
      </p>

      <div className="search-field">
        <label htmlFor="friend-search">
          Search friends
        </label>

        <div className="search-input-wrap">
          <Icon name="search" size={20} />

          <input
            id="friend-search"
            type="search"
            value={search}
            onChange={(event) =>
              onSearch(event.target.value)
            }
            placeholder="Search friends"
          />

          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label="Clear friend search"
            >
              <Icon name="x" size={18} />
            </button>
          )}
        </div>
      </div>

      {!friends.length ? (
        <div className="empty-banner">
          <Icon name="heart" size={30} />

          <p>
            {search
              ? "No friends match that name."
              : "No accepted friends yet. A connection begins only when both people choose it."}
          </p>
        </div>
      ) : (
        <div className="friends-grid">
          {friends.map((friend) => (
            <article
              className="friend-card"
              key={friend.profile_id}
            >
              <Avatar profile={friend} />

              <div>
                <h2>{friend.display_name}</h2>

                <p>{friend.featured_interest}</p>
              </div>

              <button
                type="button"
                className="button lavender"
                onClick={() =>
                  onOpenMessage(friend)
                }
              >
                Message
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MessagesView({
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
  messageStatus: {
    text: string;
    type: "info" | "success" | "error";
  } | null;
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
      <Eyebrow>Private conversations</Eyebrow>

      <h1>Messages</h1>

      <p className="section-copy">
        Messages are available only after friendship is
        accepted or a person explicitly allows message
        requests.
      </p>

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

                <div className="message-meta">
                  <span>{messageCount} / 280</span>

                  <span>
                    Enter to send · Shift+Enter for a new
                    line
                  </span>
                </div>

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

function CreateProfileView({
  profilePhoto,
  profilePhotoUrl,
  status,
  formStatus,
  onPhoto,
  onRemovePhoto,
  onSubmit,
}: {
  profilePhoto: File | null;
  profilePhotoUrl: string | null;
  status: {
    text: string;
    type: "info" | "success" | "error";
  } | null;
  formStatus: {
    text: string;
    type: "info" | "success" | "error";
  } | null;
  onPhoto: (file?: File) => void;
  onRemovePhoto: () => void;
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>,
  ) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const interestInputRef =
    useRef<HTMLInputElement>(null);

  const [
    selectedInterests,
    setSelectedInterests,
  ] = useState<string[]>([]);

  const [
    customInterest,
    setCustomInterest,
  ] = useState("");

  const [
    showMoreInterests,
    setShowMoreInterests,
  ] = useState(false);

  const visibleInterests = showMoreInterests
    ? FEATURED_INTERESTS
    : FEATURED_INTERESTS.slice(
        0,
        INITIAL_FEATURED_INTERESTS,
      );

  const combinedInterests = [
    ...selectedInterests,
    ...(customInterest.trim()
      ? [customInterest.trim()]
      : []),
  ];

  const featuredInterestValue =
    combinedInterests.join(", ");

  const handleInterestSelect = (
    interest: string,
  ) => {
    setSelectedInterests((previous) => {
      if (previous.includes(interest)) {
        return previous.filter(
          (item) => item !== interest,
        );
      }

      return [...previous, interest];
    });
  };

  const handleInterestInput = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setCustomInterest(event.target.value);
  };

  const handleCreateProfileSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    if (
      selectedInterests.length === 0 &&
      !customInterest.trim()
    ) {
      event.preventDefault();

      const input = interestInputRef.current;

      if (input) {
        input.setCustomValidity(
          "Choose at least one interest or enter your own.",
        );

        input.reportValidity();

        window.setTimeout(() => {
          input.setCustomValidity("");
        }, 100);
      }

      return;
    }

    onSubmit(event);
  };

  return (
    <section className="view-panel">
      <Eyebrow>Consent-first profile</Eyebrow>

      <h1>Create your myFolks profile</h1>

      <p className="section-copy">
        Keep it simple, kind, and recognisably you. You
        choose what becomes public and can unpublish or
        delete your profile at any time.
      </p>

      <form
        className="profile-form"
        onSubmit={handleCreateProfileSubmit}
      >
        <div className="form-grid">
          <div className="profile-identity-section full">
            <input
              ref={inputRef}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                onPhoto(event.target.files?.[0])
              }
            />

            <button
              type="button"
              className="profile-photo-button"
              onClick={() =>
                inputRef.current?.click()
              }
              aria-label="Choose profile photo"
            >
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt="Selected profile photo"
                  className="profile-photo-circle"
                />
              ) : (
                <div className="profile-photo-circle profile-photo-placeholder">
                  <Icon name="user" size={30} />
                </div>
              )}
            </button>

            {profilePhoto && (
              <button
                type="button"
                className="remove-profile-photo"
                onClick={onRemovePhoto}
              >
                Remove photo
              </button>
            )}

            <p className="profile-photo-hint">
              Add a profile photo
            </p>

            {status && (
              <StatusMessage
                text={status.text}
                type={status.type}
              />
            )}
          </div>

          <div className="field full">
            <label htmlFor="profile-name">
              Display name
            </label>

            <input
              id="profile-name"
              required
              maxLength={80}
              placeholder="Your display name"
            />
          </div>

          <div className="field full interest-field">
            <div className="interest-label-row">
              <label htmlFor="profile-interest-custom">
                Featured interests
              </label>

              <span className="interest-label-hint">
                Choose as many as you like
              </span>
            </div>

            <div className="interest-picker">
              <div
                className="interest-bubbles"
                aria-label="Featured interests"
              >
                {visibleInterests.map(
                  (interest, index) => {
                    const isSelected =
                      selectedInterests.includes(
                        interest,
                      );

                    const isNewlyRevealed =
                      showMoreInterests &&
                      index >=
                        INITIAL_FEATURED_INTERESTS;

                    return (
                      <button
                        key={interest}
                        type="button"
                        className={`interest-bubble ${
                          isSelected
                            ? "is-selected"
                            : ""
                        } ${
                          isNewlyRevealed
                            ? "interest-bubble-reveal"
                            : ""
                        }`}
                        style={
                          {
                            "--interest-delay":
                              isNewlyRevealed
                                ? `${
                                    (index -
                                      INITIAL_FEATURED_INTERESTS) *
                                    55
                                  }ms`
                                : "0ms",
                          } as React.CSSProperties
                        }
                        onClick={() =>
                          handleInterestSelect(
                            interest,
                          )
                        }
                        aria-pressed={isSelected}
                      >
                        <span>{interest}</span>

                        {isSelected && (
                          <span
                            className="interest-bubble-check"
                            aria-hidden="true"
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  },
                )}
              </div>

              {!showMoreInterests &&
                visibleInterests.length <
                  FEATURED_INTERESTS.length && (
                  <button
                    type="button"
                    className="interest-more-button"
                    onClick={() =>
                      setShowMoreInterests(true)
                    }
                    aria-expanded={false}
                  >
                    more +
                  </button>
                )}
            </div>

            <div className="interest-custom-input">
              <input
                id="profile-interest-custom"
                type="text"
                maxLength={120}
                value={customInterest}
                onChange={handleInterestInput}
                placeholder="Or type your own interest..."
              />
            </div>

            <input
              ref={interestInputRef}
              id="profile-interest"
              type="text"
              tabIndex={-1}
              aria-hidden="true"
              value={featuredInterestValue}
              readOnly
              onChange={() => {}}
              style={{
                position: "absolute",
                width: "1px",
                height: "1px",
                padding: 0,
                margin: "-1px",
                overflow: "hidden",
                clip: "rect(0, 0, 0, 0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
            />

            <p className="interest-helper">
              Select multiple interests that feel like you.
              You can also add your own.
            </p>
          </div>

          <div className="field full">
            <label htmlFor="profile-bio">
              Short bio (optional)
            </label>

            <textarea
              id="profile-bio"
              rows={4}
              maxLength={280}
            />
          </div>
        </div>

        {formStatus && (
          <StatusMessage
            text={formStatus.text}
            type={formStatus.type}
          />
        )}

        <button
          type="submit"
          className="button primary"
        >
          Create profile
        </button>
      </form>
    </section>
  );
}

function ProfileView({
  profile,
  onSignOut,
}: {
  profile: Profile | null;
  onSignOut: () => void;
}) {
  return (
    <section className="view-panel">
      <Eyebrow>Your controls</Eyebrow>

      <h1>My profile</h1>

      <p className="section-copy">
        Review exactly what you share, update your featured
        interest, or take your profile out of Discover
        whenever you want.
      </p>

      {profile && (
        <div className="current-profile-card">
          <Avatar profile={profile} large />

          <h2>{profile.display_name}</h2>

          <strong>
            {profile.featured_interest}
          </strong>

          <p>
            {profile.bio || "No bio added yet."}
          </p>

          <div className="visibility-pill">
            Visibility:{" "}
            {profile.visibility || "published"} · Profile
            active
          </div>
        </div>
      )}

      <button
        type="button"
        className="button outline"
        onClick={onSignOut}
      >
        Sign out
      </button>
    </section>
  );
}

function SettingsView({
  settings,
  status,
  blockedCount,
  onChange,
  onSave,
  onDelete,
  onSignOut,
}: {
  settings: Settings;
  status: {
    text: string;
    type: "info" | "success" | "error";
  } | null;
  blockedCount: number;
  onChange: (settings: Settings) => void;
  onSave: (
    event: React.FormEvent<HTMLFormElement>,
  ) => void;
  onDelete: () => void;
  onSignOut: () => void;
}) {
  return (
    <section className="view-panel">
      <div className="settings-heading">
        <Eyebrow>Your controls</Eyebrow>

        <h1>Settings</h1>

        <p className="section-copy">
          Choose how you appear, who can contact you, and
          how myFolks communicates with you.
        </p>
      </div>

      <form
        className="settings-form"
        onSubmit={onSave}
      >
        <SettingsSection title="Profile visibility">
          <RadioGrid
            name="visibility"
            value={settings.visibility}
            options={[
              [
                "published",
                "Published — show my profile in Discover",
              ],
              [
                "unpublished",
                "Unpublished — hide my profile from Discover",
              ],
            ]}
            onChange={(value) =>
              onChange({
                ...settings,
                visibility: value,
              })
            }
          />
        </SettingsSection>

        <SettingsSection title="Last seen visibility">
          <RadioGrid
            name="lastSeenVisibility"
            value={settings.lastSeenVisibility}
            options={[
              ["everyone", "Everyone"],
              ["connections", "Connections"],
              ["nobody", "Nobody"],
            ]}
            onChange={(value) =>
              onChange({
                ...settings,
                lastSeenVisibility: value,
              })
            }
          />
        </SettingsSection>

        <SettingsSection title="Featured interest display">
          <ToggleRow
            label="Show my featured interest in Discover"
            checked={settings.interestDisplay}
            onChange={(checked) =>
              onChange({
                ...settings,
                interestDisplay: checked,
              })
            }
          />
        </SettingsSection>

        <SettingsSection title="Message permissions">
          <RadioGrid
            name="messagePermission"
            value={settings.messagePermission}
            options={[
              ["friends_only", "Friends only"],
              ["requests", "Allow message requests"],
            ]}
            onChange={(value) =>
              onChange({
                ...settings,
                messagePermission: value,
              })
            }
          />
        </SettingsSection>

        <SettingsSection title="Notifications">
          <div className="toggle-stack">
            <ToggleRow
              label="Friend requests"
              checked={settings.friendNotifications}
              onChange={(checked) =>
                onChange({
                  ...settings,
                  friendNotifications: checked,
                })
              }
            />

            <ToggleRow
              label="Messages"
              checked={settings.messageNotifications}
              onChange={(checked) =>
                onChange({
                  ...settings,
                  messageNotifications: checked,
                })
              }
            />
          </div>
        </SettingsSection>

        <button
          type="submit"
          className="button primary"
        >
          Save settings
        </button>

        {status && (
          <StatusMessage
            text={status.text}
            type={status.type}
          />
        )}
      </form>

      <div className="safety-card">
        <h2>Privacy and safety</h2>

        <div className="safety-grid">
          <button
            type="button"
            className="safety-button lavender-bg"
          >
            Blocked profiles ({blockedCount})
          </button>

          <button
            type="button"
            className="safety-button danger-bg"
          >
            Report an issue
          </button>

          <button
            type="button"
            className="safety-button danger-outline"
            onClick={onDelete}
          >
            Delete profile
          </button>

          <button
            type="button"
            className="safety-button outline-bg"
            onClick={onSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </section>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-section">
      <h2>{title}</h2>

      {children}
    </section>
  );
}

function RadioGrid({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div className="radio-grid">
      {options.map(
        ([optionValue, label]) => (
          <label key={optionValue}>
            <input
              type="radio"
              name={name}
              value={optionValue}
              checked={value === optionValue}
              onChange={() =>
                onChange(optionValue)
              }
            />

            <span>{label}</span>
          </label>
        ),
      )}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <span>{label}</span>

      <label className="switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            onChange(event.target.checked)
          }
        />

        <span />
      </label>
    </div>
  );
}

function Eyebrow({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="eyebrow">
      {children}
    </p>
  );
}

function StatusMessage({
  text,
  type,
}: {
  text: string;
  type: "info" | "success" | "error";
}) {
  return (
    <div
      className={`status-message ${type}`}
    >
      {text}
    </div>
  );
}