export type View =
  | "discover"
  | "friends"
  | "messages"
  | "create"
  | "profile"
  | "settings";

export type LastSeenVisibility =
  | "everyone"
  | "friends"
  | "nobody";

export type Profile = {
  profile_id: string;
  username?: string;
  display_name: string;
  featured_interest: string;
  bio?: string;
  location?: string;
  visibility?: string;
  allows_messages?: boolean;
  photo_url?: string;

  /**
   * Presence information.
   *
   * These fields are supplied by the server only when
   * the viewer is allowed to see them.
   */
  last_seen_at?: string | null;
  last_seen_visibility?: LastSeenVisibility;
};

export type Settings = {
  visibility: string;
  lastSeenVisibility: LastSeenVisibility;
  interestDisplay: boolean;
  messagePermission: string;
  friendNotifications: boolean;
  messageNotifications: boolean;
};

export type MessageAsset = {
  url: string;
  name?: string;
  type?: string;
  size?: number;
};

export type Message = {
  id?: string;
  text?: string;
  sender_profile_id?: string;
  created_at?: string;
  message_asset_url?: string;
  message_asset_name?: string;
  message_asset_type?: string;
  message_asset_size?: number;
};

export type UploadedProfilePhoto = {
  url: string;
  path: string;
  name: string;
  type: string;
  size: number;
};

export type StatusValue = {
  text: string;
  type: "info" | "success" | "error";
} | null;

/**
 * Confirmation dialog state.
 */
export type ConfirmDialogState = {
  title: string;
  message: string;
  action: () => Promise<void>;
} | null;

/**
 * Friend-request states exposed to the UI.
 *
 * pending  = current user sent the request
 * incoming = other user sent the request
 * accepted = both users are friends
 */
export type FriendRequestStatus =
  | "pending"
  | "accepted"
  | "incoming";

/**
 * Raw friend-request record returned by the API.
 */
export type FriendRequestRecord = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
};

/**
 * One normalized relationship state per profile.
 */
export type FriendRequestState = {
  status: FriendRequestStatus;
  requestId: string;
};

export type FriendRequestStates = Record<
  string,
  FriendRequestState
>;

/**
 * Friend-request collection response.
 */
export type FriendRequestsResponse = {
  requests?: FriendRequestRecord[];
};

/**
 * Response returned after creating or updating a
 * friend request.
 */
export type FriendRequestResponse = {
  id?: string;
  request?: FriendRequestRecord;
  error?: string;
};

/**
 * Friends endpoint response.
 */
export type FriendsResponse = {
  friends?: Profile[];
};

/**
 * Discovery endpoint response.
 */
export type DiscoverProfilesResponse = {
  profiles?: Profile[];
};

/**
 * Discovery session states.
 */
export type DiscoverState =
  | "loading"
  | "ready"
  | "empty"
  | "error";

/**
 * Legacy profile API response.
 */
export type LegacyProfileResponse = {
  profile?: Profile;
  profile_id?: string;
  username?: string;
  display_name?: string;
  featured_interest?: string;
  bio?: string;
  location?: string;
  visibility?: string;
  allows_messages?: boolean;
  photo_url?: string;
  last_seen_at?: string | null;
  last_seen_visibility?: LastSeenVisibility;
};