"use client";

import { useEffect, useState } from "react";
import { getCurrentUserProfile } from "@/src/lib/profile";
import type { Profile } from "../types";

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

/**
 * Loads the signed-in user's own profile.
 *
 * `profileConfirmed` gates the nav: without a profile the user is
 * pushed toward the create-profile view.
 */
export function useCurrentProfile(authenticated: boolean) {
  const [currentProfile, setCurrentProfile] =
    useState<Profile | null>(null);

  const [profileConfirmed, setProfileConfirmed] = useState(false);

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

        setCurrentProfile({
          profile_id: profile.id,
          username: asString(profile.username),
          display_name:
            asString(profile.full_name) ||
            asString(profile.username) ||
            "myFolks user",
          featured_interest:
            asString(profile.featured_interest) || "",
          bio: asString(profile.bio) || "",
          location: asString(profile.location) || "",
          visibility: "published",
          allows_messages: true,
          photo_url: asString(profile.profile_image_url),
        });

        setProfileConfirmed(true);
      } catch (error) {
        console.error("Failed to load profile:", error);

        setCurrentProfile(null);
        setProfileConfirmed(false);
      }
    };

    void loadProfile();
  }, [authenticated]);

  const resetProfile = () => {
    setCurrentProfile(null);
    setProfileConfirmed(false);
  };

  return {
    currentProfile,
    setCurrentProfile,
    profileConfirmed,
    setProfileConfirmed,
    resetProfile,
  };
}
