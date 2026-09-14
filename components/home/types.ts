export type View =
  | "discover"
  | "friends"
  | "messages"
  | "create"
  | "profile"
  | "settings";

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
};

export type Settings = {
  visibility: string;
  lastSeenVisibility: string;
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
