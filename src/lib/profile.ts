import { supabase } from "@/src/lib/supabase";

export type SupabaseProfile = {
  id: string;
  username: string;
  full_name: string;
  featured_interest: string | null;
  bio: string | null;
  profile_image_url: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
};

export async function getCurrentUserProfile(): Promise<
  SupabaseProfile | null
> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as SupabaseProfile | null;
}

export async function createProfile({
  username,
  fullName,
  featuredInterest,
  bio,
  location,
  profileImageUrl,
}: {
  username: string;
  fullName: string;
  featuredInterest?: string;
  bio?: string;
  location?: string;
  profileImageUrl?: string | null;
}): Promise<SupabaseProfile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error(
      "You must be signed in to create a profile.",
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username: username.trim(),
      full_name: fullName.trim(),
      featured_interest:
        featuredInterest?.trim() || null,
      bio: bio?.trim() || null,
      location: location?.trim() || null,
      profile_image_url:
        profileImageUrl || null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as SupabaseProfile;
}

export async function updateProfile({
  username,
  fullName,
  featuredInterest,
  bio,
  location,
  profileImageUrl,
}: {
  username?: string;
  fullName?: string;
  featuredInterest?: string;
  bio?: string;
  location?: string;
  profileImageUrl?: string | null;
}): Promise<SupabaseProfile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error(
      "You must be signed in to update your profile.",
    );
  }

  const updates: Record<
    string,
    unknown
  > = {
    updated_at:
      new Date().toISOString(),
  };

  if (username !== undefined) {
    updates.username =
      username.trim();
  }

  if (fullName !== undefined) {
    updates.full_name =
      fullName.trim();
  }

  if (
    featuredInterest !==
    undefined
  ) {
    updates.featured_interest =
      featuredInterest.trim() ||
      null;
  }

  if (bio !== undefined) {
    updates.bio =
      bio.trim() || null;
  }

  if (location !== undefined) {
    updates.location =
      location.trim() || null;
  }

  if (
    profileImageUrl !==
    undefined
  ) {
    updates.profile_image_url =
      profileImageUrl;
  }

  const { data, error } =
    await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data as SupabaseProfile;
}

export async function deleteCurrentProfile(): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error(
      "You must be signed in.",
    );
  }

  const { error } =
    await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

  if (error) {
    throw error;
  }
}