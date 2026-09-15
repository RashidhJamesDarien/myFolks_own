"use client";

import React, { useEffect, useState } from "react";

import {
  createProfile as createSupabaseProfile,
  updateProfile as updateSupabaseProfile,
} from "@/src/lib/profile";

import { uploadProfileImage } from "@/src/lib/profile-storage";
import { supabase } from "@/src/lib/supabase";

import {
  ALLOWED_PROFILE_PHOTO_TYPES,
  API,
  FEATURED_INTERESTS,
  MAX_PROFILE_PHOTO_SIZE,
} from "../constants";

import { apiRequest } from "../utils";

import type {
  LegacyProfileResponse,
  Profile,
  StatusValue,
  UploadedProfilePhoto,
} from "../types";

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

const PHOTO_ERROR =
  "Choose a JPG, PNG, or WebP image no larger than 10 MB.";

function isValidPhoto(file: File) {
  return (
    ALLOWED_PROFILE_PHOTO_TYPES.includes(file.type) &&
    file.size <= MAX_PROFILE_PHOTO_SIZE
  );
}

/**
 * Mirror the profile to the legacy REST endpoint.
 *
 * Supabase is the source of truth; this keeps the older backend in
 * sync and merges anything it returns. Failure is non-fatal.
 */
async function mirrorToLegacyEndpoint(
  payload: Record<string, unknown>,
  target: Profile,
) {
  try {
    const legacySaved = (await apiRequest(API.profile, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })) as LegacyProfileResponse;

    const remote = legacySaved.profile || legacySaved;

    if (!remote?.profile_id) return;

    Object.assign(target, {
      ...remote,
      profile_id: remote.profile_id || target.profile_id,
      username: remote.username || target.username,
      display_name: remote.display_name || target.display_name,
      featured_interest:
        remote.featured_interest || target.featured_interest,
      bio: remote.bio ?? target.bio,
      location: remote.location ?? target.location,
      visibility: remote.visibility || target.visibility,
      photo_url: remote.photo_url || target.photo_url,
    });
  } catch (legacyError) {
    console.warn(
      "Legacy profile endpoint was unavailable:",
      legacyError,
    );
  }
}

/** Object URL that revokes itself when replaced or unmounted. */
function usePreviewPhoto() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const choose = (nextFile: File) => {
    if (url) URL.revokeObjectURL(url);

    setFile(nextFile);
    setUrl(URL.createObjectURL(nextFile));
  };

  const clear = () => {
    if (url) URL.revokeObjectURL(url);

    setFile(null);
    setUrl(null);
  };

  return { file, url, choose, clear };
}

type UseProfileCreatorOptions = {
  backendConnected: boolean;
  onCreated: (profile: Profile) => void;
};

/** Create-profile form state and submission. */
export function useProfileCreator({
  backendConnected,
  onCreated,
}: UseProfileCreatorOptions) {
  const photo = usePreviewPhoto();

  const [photoStatus, setPhotoStatus] =
    useState<StatusValue>(null);

  const [formStatus, setFormStatus] = useState<StatusValue>(null);

  const choosePhoto = (file?: File) => {
    if (!file) return;

    if (!isValidPhoto(file)) {
      setPhotoStatus({ text: PHOTO_ERROR, type: "error" });
      return;
    }

    photo.choose(file);

    setPhotoStatus({
      text: "Photo ready to upload when you create your profile.",
      type: "success",
    });
  };

  const removePhoto = () => {
    photo.clear();

    setPhotoStatus({
      text: "Profile photo removed. Choose another photo when ready.",
      type: "info",
    });
  };

  const submit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    /*
     * The create form is uncontrolled, so values are read from the
     * DOM by id rather than from React state.
     */
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

      if (photo.file) {
        uploadedPhoto = await uploadProfileImage(photo.file);
      }

      const fullName = nameInput.value.trim();
      const featuredInterest = interestInput.value.trim();
      const bio = bioInput.value.trim();

      const savedProfile = await createSupabaseProfile({
        username: metadataUsername,
        fullName,
        featuredInterest,
        bio,
        location: "",
        profileImageUrl: uploadedPhoto?.url || null,
      });

      const normalizedProfile: Profile = {
        profile_id: savedProfile.id,
        username:
          asString(savedProfile.username) || metadataUsername,
        display_name:
          asString(savedProfile.full_name) || fullName,
        featured_interest:
          asString(savedProfile.featured_interest) ||
          featuredInterest,
        bio: asString(savedProfile.bio) ?? bio,
        location: asString(savedProfile.location) || "",
        visibility: "published",
        allows_messages: true,
        photo_url:
          asString(savedProfile.profile_image_url) ||
          uploadedPhoto?.url,
      };

      const legacyPayload: Record<string, unknown> = {
        profile_id: normalizedProfile.profile_id,
        display_name: normalizedProfile.display_name,
        featured_interest: normalizedProfile.featured_interest,
        bio: normalizedProfile.bio || "",
        visibility: "published",
      };

      if (uploadedPhoto) {
        Object.assign(legacyPayload, {
          photo_url: uploadedPhoto.url,
          photo_name: uploadedPhoto.name || photo.file?.name,
          photo_type: uploadedPhoto.type || photo.file?.type,
          photo_size: uploadedPhoto.size || photo.file?.size,
          photo_count: 1,
        });
      }

      await mirrorToLegacyEndpoint(
        legacyPayload,
        normalizedProfile,
      );

      setFormStatus({
        text: "Profile created successfully.",
        type: "success",
      });

      onCreated(normalizedProfile);
    } catch (error) {
      console.error("Failed to create profile:", error);

      setFormStatus({
        text:
          error instanceof Error &&
          error.message !== "backend_unavailable"
            ? error.message
            : "Your profile could not be saved. Please try again.",
        type: "error",
      });
    }
  };

  return {
    photoFile: photo.file,
    photoUrl: photo.url,
    photoStatus,
    formStatus,
    choosePhoto,
    removePhoto,
    submit,
  };
}

type UseProfileEditorOptions = {
  currentProfile: Profile | null;
  onSaved: (profile: Profile) => void;
};

/** Edit-profile form state and submission. */
export function useProfileEditor({
  currentProfile,
  onSaved,
}: UseProfileEditorOptions) {
  const photo = usePreviewPhoto();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState("");
  const [status, setStatus] = useState<StatusValue>(null);
  const [saving, setSaving] = useState(false);

  const begin = () => {
    if (!currentProfile) return;

    setFullName(currentProfile.display_name || "");
    setUsername(currentProfile.username || "");
    setBio(currentProfile.bio || "");
    setLocation(currentProfile.location || "");

    const existing = currentProfile.featured_interest
      ? currentProfile.featured_interest
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    setInterests(
      existing.filter((item) =>
        FEATURED_INTERESTS.includes(item),
      ),
    );

    setCustomInterest(
      existing
        .filter((item) => !FEATURED_INTERESTS.includes(item))
        .join(", "),
    );

    photo.clear();
    setStatus(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setStatus(null);
    photo.clear();
  };

  const toggleInterest = (interest: string) => {
    setInterests((previous) =>
      previous.includes(interest)
        ? previous.filter((item) => item !== interest)
        : [...previous, interest],
    );
  };

  const choosePhoto = (file?: File) => {
    if (!file) return;

    if (!isValidPhoto(file)) {
      setStatus({ text: PHOTO_ERROR, type: "error" });
      return;
    }

    photo.choose(file);

    setStatus({
      text: "New profile photo selected.",
      type: "info",
    });
  };

  const removePhoto = () => {
    photo.clear();

    setStatus({
      text: "New profile photo removed.",
      type: "info",
    });
  };

  const save = async () => {
    if (!currentProfile) return;

    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();
    const trimmedBio = bio.trim();
    const trimmedLocation = location.trim();

    const uniqueInterests = Array.from(
      new Set([
        ...interests,
        ...(customInterest.trim()
          ? customInterest
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : []),
      ]),
    );

    if (!trimmedName) {
      setStatus({
        text: "Please enter your display name.",
        type: "error",
      });

      return;
    }

    if (!trimmedUsername) {
      setStatus({
        text: "Please enter your username.",
        type: "error",
      });

      return;
    }

    if (!uniqueInterests.length) {
      setStatus({
        text: "Choose at least one featured interest.",
        type: "error",
      });

      return;
    }

    setSaving(true);
    setStatus({
      text: "Saving your profile...",
      type: "info",
    });

    try {
      let uploadedPhoto: UploadedProfilePhoto | null = null;

      if (photo.file) {
        uploadedPhoto = await uploadProfileImage(photo.file);
      }

      const savedProfile = await updateSupabaseProfile({
        username: trimmedUsername,
        fullName: trimmedName,
        bio: trimmedBio,
        location: trimmedLocation,
        ...(uploadedPhoto?.url
          ? { profileImageUrl: uploadedPhoto.url }
          : {}),
      });

      const updatedProfile: Profile = {
        ...currentProfile,
        profile_id: savedProfile.id,
        username:
          asString(savedProfile.username) || trimmedUsername,
        display_name:
          asString(savedProfile.full_name) || trimmedName,
        featured_interest: uniqueInterests.join(", "),
        bio: asString(savedProfile.bio) ?? trimmedBio,
        location:
          asString(savedProfile.location) ?? trimmedLocation,
        photo_url:
          asString(savedProfile.profile_image_url) ||
          uploadedPhoto?.url ||
          currentProfile.photo_url,
        visibility: currentProfile.visibility || "published",
        allows_messages: currentProfile.allows_messages ?? true,
      };

      await mirrorToLegacyEndpoint(
        {
          profile_id: updatedProfile.profile_id,
          display_name: updatedProfile.display_name,
          featured_interest: updatedProfile.featured_interest,
          bio: updatedProfile.bio || "",
          location: updatedProfile.location || "",
          visibility: updatedProfile.visibility || "published",
          ...(updatedProfile.photo_url
            ? { photo_url: updatedProfile.photo_url }
            : {}),
        },
        updatedProfile,
      );

      setStatus({
        text: "Profile updated successfully.",
        type: "success",
      });

      setEditing(false);
      photo.clear();

      onSaved(updatedProfile);
    } catch (error) {
      console.error("Failed to update profile:", error);

      setStatus({
        text:
          error instanceof Error &&
          error.message !== "backend_unavailable"
            ? error.message
            : "Your profile could not be updated. Please try again.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    editing,
    setEditing,
    fullName,
    setFullName,
    username,
    setUsername,
    bio,
    setBio,
    location,
    setLocation,
    interests,
    toggleInterest,
    customInterest,
    setCustomInterest,
    photoUrl: photo.url,
    status,
    saving,
    begin,
    cancel,
    choosePhoto,
    removePhoto,
    save,
  };
}
