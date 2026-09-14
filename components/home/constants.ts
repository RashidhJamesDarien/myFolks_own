export const API = {
  health: "/api/health",
  discover: "/api/discover/profiles",
  friendRequests: "/api/friend-requests",
  profileSearch: "/api/profile-search",
  messages: "/api/messages",
  reports: "/api/reports",
  blocks: "/api/blocks",
  settings: "/api/settings/me",
  profile: "/api/profiles/me",
  signOut: "/api/auth/signout",
};

export const MAX_PROFILE_PHOTO_SIZE =
  10 * 1024 * 1024;

export const MAX_MESSAGE_ASSET_SIZE =
  10 * 1024 * 1024;

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