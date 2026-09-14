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

function getSupabase(request: Request) {
  const authorization =
    request.headers.get("Authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return null;
  }

  const accessToken = authorization
    .slice("Bearer ".length)
    .trim();

  if (!accessToken) {
    return null;
  }

  return createClient(
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
}

export async function GET(
  request: Request,
) {
  try {
    const supabase =
      getSupabase(request);

    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        { status: 401 },
      );
    }

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Invalid authentication session.",
        },
        { status: 401 },
      );
    }

    const {
      data: acceptedRequests,
      error: requestsError,
    } =
      await supabase
        .from("friend_requests")
        .select(
          `
            id,
            sender_id,
            recipient_id,
            status,
            created_at,
            updated_at
          `,
        )
        .eq("status", "accepted")
        .or(
          `sender_id.eq.${user.id},recipient_id.eq.${user.id}`,
        )
        .order("updated_at", {
          ascending: false,
        });

    if (requestsError) {
      console.error(
        "Failed to load accepted friend requests:",
        requestsError,
      );

      return NextResponse.json(
        {
          error:
            "Failed to load friends.",
        },
        { status: 500 },
      );
    }

    const friendIds =
      Array.from(
        new Set(
          (acceptedRequests ?? [])
            .map(
              (friendRequest) => {
                if (
                  friendRequest.sender_id ===
                  user.id
                ) {
                  return friendRequest.recipient_id;
                }

                if (
                  friendRequest.recipient_id ===
                  user.id
                ) {
                  return friendRequest.sender_id;
                }

                return null;
              },
            )
            .filter(
              (
                profileId,
              ): profileId is string =>
                Boolean(profileId),
            ),
        ),
      );

    if (!friendIds.length) {
      return NextResponse.json({
        friends: [],
      });
    }

    const {
      data: profiles,
      error: profilesError,
    } =
      await supabase
        .from("profiles")
        .select(
          `
            id,
            username,
            full_name,
            featured_interest,
            bio,
            location,
            profile_image_url
          `,
        )
        .in("id", friendIds);

    if (profilesError) {
      console.error(
        "Failed to load friend profiles:",
        profilesError,
      );

      return NextResponse.json(
        {
          error:
            "Failed to load friend profiles.",
        },
        { status: 500 },
      );
    }

    const friends =
      (profiles ?? []).map(
        (profile) => ({
          profile_id:
            profile.id,

          username:
            profile.username,

          display_name:
            profile.full_name ||
            profile.username ||
            "myFolks user",

          featured_interest:
            profile.featured_interest ||
            "",

          bio:
            profile.bio || "",

          location:
            profile.location || "",

          photo_url:
            profile.profile_image_url ||
            undefined,

          visibility:
            "published",

          allows_messages:
            true,
        }),
      );

    const friendOrder =
      new Map(
        friendIds.map(
          (id, index) => [
            id,
            index,
          ],
        ),
      );

    friends.sort(
      (a, b) => {
        const aIndex =
          friendOrder.get(
            a.profile_id,
          ) ??
          Number.MAX_SAFE_INTEGER;

        const bIndex =
          friendOrder.get(
            b.profile_id,
          ) ??
          Number.MAX_SAFE_INTEGER;

        return aIndex - bIndex;
      },
    );

    return NextResponse.json({
      friends,
    });
  } catch (error) {
    console.error(
      "Friends GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load friends.",
      },
      { status: 500 },
    );
  }
}