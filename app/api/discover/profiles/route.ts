import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabasePublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY",
  );
}

const SUPABASE_URL = supabaseUrl;
const SUPABASE_PUBLISHABLE_KEY =
  supabasePublishableKey;
const SUPABASE_SERVICE_ROLE_KEY =
  supabaseServiceRoleKey;

function createAuthClient(accessToken: string) {
  return createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  );
}

function createAdminClient() {
  return createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export async function GET(request: Request) {
  try {
    /*
     * --------------------------------------------------
     * 1. Authenticate the current user.
     * --------------------------------------------------
     */

    const authorization =
      request.headers.get("Authorization");

    if (
      !authorization ||
      !authorization
        .toLowerCase()
        .startsWith("bearer ")
    ) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 },
      );
    }

    const accessToken = authorization
      .slice("Bearer ".length)
      .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 },
      );
    }

    const authSupabase =
      createAuthClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await authSupabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "[discover/profiles] Authentication error:",
        userError,
      );

      return NextResponse.json(
        {
          error:
            "Invalid authentication session.",
        },
        { status: 401 },
      );
    }

    /*
     * --------------------------------------------------
     * 2. Create an admin client.
     *
     * This is SERVER ONLY.
     * The service role key must never be exposed
     * to the browser.
     * --------------------------------------------------
     */

    const adminSupabase =
      createAdminClient();

    /*
     * --------------------------------------------------
     * 3. Load friend requests involving the user.
     *
     * friend_requests uses:
     *
     *   sender_id
     *   recipient_id
     *   status
     *
     * We only need pending requests here.
     * --------------------------------------------------
     */

    const {
      data: friendRequests,
      error: friendRequestsError,
    } = await adminSupabase
      .from("friend_requests")
      .select(
        `
          sender_id,
          recipient_id,
          status
        `,
      )
      .or(
        `sender_id.eq.${user.id},recipient_id.eq.${user.id}`,
      );

    if (friendRequestsError) {
      console.error(
        "[discover/profiles] Friend request error:",
        friendRequestsError,
      );

      return NextResponse.json(
        {
          error:
            "Failed to load discover relationships.",
          details:
            process.env.NODE_ENV ===
            "development"
              ? friendRequestsError.message
              : undefined,
        },
        { status: 500 },
      );
    }

    /*
     * --------------------------------------------------
     * 4. Load existing friendships.
     * --------------------------------------------------
     */

    const {
      data: friendships,
      error: friendshipsError,
    } = await adminSupabase
      .from("friendships")
      .select(
        `
          user_id,
          friend_id
        `,
      )
      .or(
        `user_id.eq.${user.id},friend_id.eq.${user.id}`,
      );

    if (friendshipsError) {
      console.error(
        "[discover/profiles] Friendship error:",
        friendshipsError,
      );

      return NextResponse.json(
        {
          error:
            "Failed to load discover friendships.",
          details:
            process.env.NODE_ENV ===
            "development"
              ? friendshipsError.message
              : undefined,
        },
        { status: 500 },
      );
    }

    /*
     * --------------------------------------------------
     * 5. Build the exclusion set.
     *
     * We exclude:
     *
     * - current user
     * - pending friend requests
     * - existing friendships
     *
     * Declined requests are NOT excluded.
     * --------------------------------------------------
     */

    const excludedProfileIds =
      new Set<string>();

    excludedProfileIds.add(user.id);

    for (const requestRow of
      friendRequests ?? []) {
      if (
        requestRow.status !==
        "pending"
      ) {
        continue;
      }

      const otherUserId =
        requestRow.sender_id ===
        user.id
          ? requestRow.recipient_id
          : requestRow.sender_id;

      if (
        typeof otherUserId ===
        "string"
      ) {
        excludedProfileIds.add(
          otherUserId,
        );
      }
    }

    for (const friendship of
      friendships ?? []) {
      const otherUserId =
        friendship.user_id ===
        user.id
          ? friendship.friend_id
          : friendship.user_id;

      if (
        typeof otherUserId ===
        "string"
      ) {
        excludedProfileIds.add(
          otherUserId,
        );
      }
    }

    /*
     * --------------------------------------------------
     * 6. Load ALL profiles.
     *
     * The service-role client intentionally bypasses
     * normal RLS restrictions for this server-side
     * discovery operation.
     * --------------------------------------------------
     */

    const {
      data: profileRows,
      error: profilesError,
    } = await adminSupabase
      .from("profiles")
      .select(
        `
          id,
          username,
          full_name,
          featured_interest,
          bio,
          profile_image_url,
          location,
          created_at,
          updated_at
        `,
      )
      .order("created_at", {
        ascending: false,
      });

    if (profilesError) {
      console.error(
        "[discover/profiles] Profiles error:",
        profilesError,
      );

      return NextResponse.json(
        {
          error:
            "Failed to load profiles.",
          details:
            process.env.NODE_ENV ===
            "development"
              ? profilesError.message
              : undefined,
        },
        { status: 500 },
      );
    }

    /*
     * --------------------------------------------------
     * 7. Convert database rows into the exact shape
     * expected by the Discover/Home components.
     * --------------------------------------------------
     */

    const profiles = (
      profileRows ?? []
    )
      .filter(
        (profile) =>
          profile &&
          typeof profile.id ===
            "string",
      )
      .filter(
        (profile) =>
          !excludedProfileIds.has(
            profile.id,
          ),
      )
      .map((profile) => {
        const username =
          typeof profile.username ===
          "string"
            ? profile.username.trim()
            : "";

        const fullName =
          typeof profile.full_name ===
          "string"
            ? profile.full_name.trim()
            : "";

        const featuredInterest =
          typeof profile.featured_interest ===
          "string"
            ? profile.featured_interest.trim()
            : "";

        const bio =
          typeof profile.bio ===
          "string"
            ? profile.bio.trim()
            : "";

        const location =
          typeof profile.location ===
          "string"
            ? profile.location.trim()
            : "";

        const profileImageUrl =
          typeof profile.profile_image_url ===
          "string"
            ? profile.profile_image_url.trim()
            : "";

        return {
          profile_id: profile.id,

          username:
            username || undefined,

          display_name:
            fullName ||
            username ||
            "myFolks user",

          featured_interest:
            featuredInterest,

          bio,

          location,

          photo_url:
            profileImageUrl ||
            undefined,

          visibility: "published" as const,

          allows_messages: true,
        };
      });

    /*
     * --------------------------------------------------
     * 8. Helpful server-side diagnostics.
     * --------------------------------------------------
     */

    console.log(
      "[discover/profiles] Discovery result:",
      {
        currentUserId: user.id,

        totalProfiles:
          profileRows?.length ?? 0,

        excludedProfiles:
          excludedProfileIds.size,

        discoverableProfiles:
          profiles.length,

        discoverableProfileIds:
          profiles.map(
            (profile) =>
              profile.profile_id,
          ),
      },
    );

    /*
     * --------------------------------------------------
     * 9. Return the profiles.
     * --------------------------------------------------
     */

    return NextResponse.json(
      {
        profiles,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(
      "[discover/profiles] Unexpected error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load discover profiles.",
      },
      { status: 500 },
    );
  }
}