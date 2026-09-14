import { supabase } from "@/src/lib/supabase";

const PROFILE_IMAGE_BUCKET = "profile-images";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_PROFILE_IMAGE_SIZE = 10 * 1024 * 1024;

function getSafeExtension(file: File): string {
  switch (file.type) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      throw new Error(
        "Only JPG, PNG, and WebP images are supported.",
      );
  }
}

function sanitizeFileName(name: string): string {
  const withoutExtension = name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return withoutExtension || "profile-image";
}

export async function uploadProfileImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      "Choose a JPG, PNG, or WebP image.",
    );
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    throw new Error(
      "Profile images must be 10 MB or smaller.",
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error(
      "You must be signed in to upload a profile image.",
    );
  }

  const extension = getSafeExtension(file);
  const baseName = sanitizeFileName(file.name);

  const filePath =
    `${user.id}/` +
    `${crypto.randomUUID()}-${baseName}.${extension}`;

  const { error: uploadError } =
    await supabase.storage
      .from(PROFILE_IMAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .getPublicUrl(filePath);

  if (!publicUrl) {
    throw new Error(
      "The profile image was uploaded, but its URL could not be created.",
    );
  }

  return {
    url: publicUrl,
    path: filePath,
    name: file.name,
    type: file.type,
    size: file.size,
  };
}