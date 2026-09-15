export const API = {
  health: "/api/health",

  discover: "/api/discover/profiles",

  friendRequests: "/api/friend-requests",

  friends: "/api/friends",

  profileSearch: "/api/profile-search",

  messages: "/api/messages",

  messageAssets: "/api/messages/assets",

  reports: "/api/reports",

  blocks: "/api/blocks",

  settings: "/api/settings/me",

  profile: "/api/profiles/me",

  signOut: "/api/auth/signout",

  accountDelete: "/api/account/delete",
};

export const MAX_PROFILE_PHOTO_SIZE =
  10 * 1024 * 1024;

export const MAX_MESSAGE_ASSET_SIZE =
  10 * 1024 * 1024;

/**
 * Allowed profile-image MIME types.
 */
export const ALLOWED_PROFILE_PHOTO_TYPES: string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/**
 * Allowed non-image message attachments.
 *
 * Images are handled separately because the messaging
 * composer allows image MIME types directly.
 */
export const ALLOWED_MESSAGE_ASSET_TYPES: string[] = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export const FEATURED_INTERESTS = [
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

export const INITIAL_FEATURED_INTERESTS = 6;

/**
 * Number of A-vs-B discovery rounds in one session.
 */
export const DISCOVERY_ROUNDS = 6;

/**
 * Default privacy and notification settings.
 */
export const DEFAULT_SETTINGS = {
  visibility: "published",
  lastSeenVisibility: "friends",
  interestDisplay: true,
  messagePermission: "friends",
  friendNotifications: true,
  messageNotifications: true,
};