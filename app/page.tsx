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
import { shuffle, apiRequest } from "@/components/home/utils";

import type {
  View,
  Profile,
  Settings,
  MessageAsset,
  UploadedProfilePhoto,
} from "@/components/home/types";

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

  const [editingProfile, setEditingProfile] = useState(false);

  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editCustomInterest, setEditCustomInterest] = useState("");
  const [editProfilePhoto, setEditProfilePhoto] =
    useState<File | null>(null);
  const [editProfilePhotoUrl, setEditProfilePhotoUrl] =
    useState<string | null>(null);

  const [editProfileStatus, setEditProfileStatus] = useState<{
    text: string;
    type: "info" | "success" | "error";
  } | null>(null);

  const [editProfileSaving, setEditProfileSaving] = useState(false);

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

          featured_interest:
            typeof profile.featured_interest === "string"
              ? profile.featured_interest
              : "",

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

  useEffect(() => {
    return () => {
      if (editProfilePhotoUrl) {
        URL.revokeObjectURL(editProfilePhotoUrl);
      }
    };
  }, [editProfilePhotoUrl]);

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

  const chooseEditProfilePhoto = (file?: File) => {
    if (!file) return;

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type);

    if (!allowed || file.size > MAX_PROFILE_PHOTO_SIZE) {
      setEditProfileStatus({
        text: "Choose a JPG, PNG, or WebP image no larger than 10 MB.",
        type: "error",
      });

      return;
    }

    if (editProfilePhotoUrl) {
      URL.revokeObjectURL(editProfilePhotoUrl);
    }

    const url = URL.createObjectURL(file);

    setEditProfilePhoto(file);
    setEditProfilePhotoUrl(url);

    setEditProfileStatus({
      text: "New profile photo selected.",
      type: "info",
    });
  };

  useEffect(() => {
    return () => {
      if (profilePhotoUrl) {
        URL.revokeObjectURL(profilePhotoUrl);
      }
    };
  }, [profilePhotoUrl]);

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

      let uploadedPhoto: UploadedProfilePhoto | null = null;

      if (profilePhoto) {
        uploadedPhoto = await uploadProfileImage(profilePhoto);
      }

      const savedProfile = await createSupabaseProfile({
        username: metadataUsername,
        fullName: nameInput.value.trim(),
        featuredInterest: interestInput.value.trim(),
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

        featured_interest:
          typeof savedProfile.featured_interest === "string"
            ? savedProfile.featured_interest
            : interestInput.value.trim(),

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

  const beginProfileEdit = () => {
    if (!currentProfile) return;

    setEditFullName(currentProfile.display_name || "");
    setEditUsername(currentProfile.username || "");
    setEditBio(currentProfile.bio || "");
    setEditLocation(currentProfile.location || "");

    const existingInterests = currentProfile.featured_interest
      ? currentProfile.featured_interest
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    const knownInterests = existingInterests.filter((interest) =>
      FEATURED_INTERESTS.includes(interest),
    );

    const customInterests = existingInterests.filter(
      (interest) => !FEATURED_INTERESTS.includes(interest),
    );

    setEditInterests(knownInterests);
    setEditCustomInterest(customInterests.join(", "));

    setEditProfilePhoto(null);

    if (editProfilePhotoUrl) {
      URL.revokeObjectURL(editProfilePhotoUrl);
    }

    setEditProfilePhotoUrl(null);
    setEditProfileStatus(null);
    setEditingProfile(true);
  };

  const saveEditedProfile = async () => {
    if (!currentProfile) return;

    const fullName = editFullName.trim();
    const username = editUsername.trim();
    const bio = editBio.trim();
    const location = editLocation.trim();

    const combinedInterests = [
      ...editInterests,
      ...(editCustomInterest.trim()
        ? editCustomInterest
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : []),
    ];

    const uniqueInterests = Array.from(
      new Set(combinedInterests),
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

    if (!uniqueInterests.length) {
      setEditProfileStatus({
        text: "Choose at least one featured interest.",
        type: "error",
      });

      return;
    }

    setEditProfileSaving(true);
    setEditProfileStatus({
      text: "Saving your profile...",
      type: "info",
    });

    try {
      let uploadedPhoto: UploadedProfilePhoto | null = null;

      if (editProfilePhoto) {
        uploadedPhoto =
          await uploadProfileImage(editProfilePhoto);
      }

      const savedProfile =
        await updateSupabaseProfile({
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
        });

      const featuredInterest =
        uniqueInterests.join(", ");

      const updatedProfile: Profile = {
        ...currentProfile,

        profile_id: savedProfile.id,

        username:
          typeof savedProfile.username === "string"
            ? savedProfile.username
            : username,

        display_name:
          typeof savedProfile.full_name === "string"
            ? savedProfile.full_name
            : fullName,

        featured_interest: featuredInterest,

        bio:
          typeof savedProfile.bio === "string"
            ? savedProfile.bio
            : bio,

        location:
          typeof savedProfile.location === "string"
            ? savedProfile.location
            : location,

        photo_url:
          typeof savedProfile.profile_image_url === "string"
            ? savedProfile.profile_image_url
            : uploadedPhoto?.url ||
              currentProfile.photo_url,

        visibility:
          currentProfile.visibility || "published",

        allows_messages:
          currentProfile.allows_messages ?? true,
      };

      try {
        const legacySaved = await apiRequest(API.profile, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profile_id: updatedProfile.profile_id,
            display_name: updatedProfile.display_name,
            featured_interest:
              updatedProfile.featured_interest,
            bio: updatedProfile.bio || "",
            location: updatedProfile.location || "",
            visibility:
              updatedProfile.visibility || "published",
            ...(updatedProfile.photo_url
              ? {
                  photo_url:
                    updatedProfile.photo_url,
                }
              : {}),
          }),
        });

        const remoteProfile =
          legacySaved?.profile || legacySaved;

        if (remoteProfile?.profile_id) {
          Object.assign(updatedProfile, {
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
          });
        }
      } catch (legacyError) {
        console.warn(
          "Legacy profile endpoint was unavailable while saving edited profile:",
          legacyError,
        );
      }

      setCurrentProfile(updatedProfile);

      setEditProfileStatus({
        text: "Profile updated successfully.",
        type: "success",
      });

      setEditingProfile(false);
      setEditProfilePhoto(null);

      if (editProfilePhotoUrl) {
        URL.revokeObjectURL(editProfilePhotoUrl);
        setEditProfilePhotoUrl(null);
      }

      await loadRemoteProfiles();
    } catch (error) {
      console.error(
        "Failed to update profile:",
        error,
      );

      setEditProfileStatus({
        text:
          error instanceof Error &&
          error.message !== "backend_unavailable"
            ? error.message
            : "Your profile could not be updated. Please try again.",
        type: "error",
      });
    } finally {
      setEditProfileSaving(false);
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
      setEditingProfile(false);
      setView("discover");
    } catch {
      setSettingsStatus({
        text: "Sign out could not be completed.",
        type: "error",
      });
    }
  };

  const deleteAccount = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Your session has expired.");
      }

      const response = await fetch(
        "/api/account/delete",
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (!response.ok) {
        let message =
          "Your account could not be deleted.";

        try {
          const data = await response.json();

          if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // Ignore invalid JSON error responses.
        }

        throw new Error(message);
      }

      await supabase.auth.signOut();

      setCurrentProfile(null);
      setProfileConfirmed(false);
      setPositiveSelections([]);
      setPairQueue([]);
      setPairIndex(0);
      setCompletionProfile(null);
      setActiveMessageProfile(null);
      setMessageOpen(false);
      setEditingProfile(false);
      setProfiles([]);
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
              editing={editingProfile}
              editFullName={editFullName}
              editUsername={editUsername}
              editBio={editBio}
              editLocation={editLocation}
              editInterests={editInterests}
              editCustomInterest={editCustomInterest}
              editProfilePhotoUrl={editProfilePhotoUrl}
              editProfileStatus={editProfileStatus}
              editProfileSaving={editProfileSaving}
              onStartEdit={beginProfileEdit}
              onCancelEdit={() => {
                setEditingProfile(false);
                setEditProfileStatus(null);
                setEditProfilePhoto(null);

                if (editProfilePhotoUrl) {
                  URL.revokeObjectURL(
                    editProfilePhotoUrl,
                  );
                }

                setEditProfilePhotoUrl(null);
              }}
              onFullNameChange={setEditFullName}
              onUsernameChange={setEditUsername}
              onBioChange={setEditBio}
              onLocationChange={setEditLocation}
              onToggleInterest={(interest) => {
                setEditInterests((previous) =>
                  previous.includes(interest)
                    ? previous.filter(
                        (item) => item !== interest,
                      )
                    : [...previous, interest],
                );
              }}
              onCustomInterestChange={
                setEditCustomInterest
              }
              onPhoto={chooseEditProfilePhoto}
              onRemovePhoto={() => {
                if (editProfilePhotoUrl) {
                  URL.revokeObjectURL(
                    editProfilePhotoUrl,
                  );
                }

                setEditProfilePhoto(null);
                setEditProfilePhotoUrl(null);

                setEditProfileStatus({
                  text: "New profile photo removed.",
                  type: "info",
                });
              }}
              onSave={saveEditedProfile}
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
          © 2026 All rights reserved by Darien Corporation
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