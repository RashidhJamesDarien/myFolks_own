import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabasePublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
}

const SUPABASE_URL = supabaseUrl as string;
const SUPABASE_PUBLISHABLE_KEY =
  supabasePublishableKey as string;

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get(
      "Authorization",
    );

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const accessToken = authorization
      .slice("Bearer ".length)
      .trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "Discover authentication error:",
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
     * Load every relationship involving the current
     * user so Discover can exclude people who are:
     *
     * - already friends
     * - involved in a pending request
     *
     * We intentionally do not exclude declined requests.
     * A declined connection can therefore appear again
     * in a future discovery session.
     */
    const [
      { data: friendRequests, error: friendRequestsError },
      { data: friendships, error: friendshipsError },
    ] = await Promise.all([
      supabase
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
        ),

      supabase
        .from("friendships")
        .select(
          `
            user_id,
            friend_id
          `,
        )
        .or(
          `user_id.eq.${user.id},friend_id.eq.${user.id}`,
        ),
    ]);

    if (friendRequestsError) {
      console.error(
        "Failed to load friend request relationships:",
        friendRequestsError,
      );

      return NextResponse.json(
        {
          error:
            "Failed to load discover relationships.",
        },
        { status: 500 },
      );
    }

    if (friendshipsError) {
      console.error(
        "Failed to load friendship relationships:",
        friendshipsError,
      );

      return NextResponse.json(
        {
          error:
            "Failed to load discover relationships.",
        },
        { status: 500 },
      );
    }

    /*
     * Build a set of profile IDs that should not appear
     * in Discover.
     */
    const excludedProfileIds = new Set<string>();

    for (const friendRequest of friendRequests ?? []) {
      if (friendRequest.status !== "pending") {
        continue;
      }

      const otherProfileId =
        friendRequest.sender_id === user.id
          ? friendRequest.recipient_id
          : friendRequest.sender_id;

      if (otherProfileId) {
        excludedProfileIds.add(otherProfileId);
      }
    }

    for (const friendship of friendships ?? []) {
      const otherProfileId =
        friendship.user_id === user.id
          ? friendship.friend_id
          : friendship.user_id;

      if (otherProfileId) {
        excludedProfileIds.add(otherProfileId);
      }
    }

    /*
     * Load profiles after relationship filtering.
     *
     * We still fetch the profile collection normally and
     * filter the relationship IDs in application code.
     * This keeps the query straightforward and avoids
     * depending on complex relational filters.
     */
    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        username,
        full_name,
        featured_interest,
        bio,
        profile_image_url,
        location,
        created_at,
        updated_at
      `)
      .neq("id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Failed to load discover profiles:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "Failed to load profiles.",
        },
        { status: 500 },
      );
    }

    const profiles = (data ?? [])
      .filter(
        (profile) =>
          !excludedProfileIds.has(profile.id),
      )
      .map((profile) => ({
        profile_id: profile.id,
        username: profile.username,
        display_name:
          profile.full_name ||
          profile.username ||
          "myFolks user",
        featured_interest:
          profile.featured_interest || "",
        bio: profile.bio || "",
        location:
          profile.location || "",
        photo_url:
          profile.profile_image_url ||
          undefined,
        visibility: "published",
        allows_messages: true,
      }));

    return NextResponse.json({
      profiles,
    });
  } catch (error) {
    console.error(
      "Discover profiles API error:",
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