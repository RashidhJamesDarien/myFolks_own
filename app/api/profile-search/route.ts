import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL",
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
}

const SUPABASE_URL = supabaseUrl;
const SUPABASE_PUBLISHABLE_KEY =
  supabasePublishableKey;

type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  featured_interest: string | null;
  bio: string | null;
  location: string | null;
  profile_image_url: string | null;
};

type FriendRequestRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type RelationshipStatus =
  | "friends"
  | "pending_outgoing"
  | "pending_incoming"
  | "none";

function createSupabaseClient(
  accessToken: string,
) {
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

async function getAuthenticatedClient(
  request: Request,
) {
  const authorization =
    request.headers.get("Authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return {
      supabase: null,
      user: null,
      response: NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        },
      ),
    };
  }

  const accessToken = authorization
    .slice("Bearer ".length)
    .trim();

  if (!accessToken) {
    return {
      supabase: null,
      user: null,
      response: NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        },
      ),
    };
  }

  const supabase =
    createSupabaseClient(
      accessToken,
    );

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "Profile search authentication error:",
      userError,
    );

    return {
      supabase: null,
      user: null,
      response: NextResponse.json(
        {
          error:
            "Invalid authentication session.",
        },
        {
          status: 401,
        },
      ),
    };
  }

  return {
    supabase,
    user,
    response: null,
  };
}

function escapeSearchTerm(
  value: string,
) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

function profileToApiProfile(
  profile: ProfileRow,
) {
  return {
    profile_id: profile.id,

    username:
      profile.username ??
      undefined,

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

    visibility: "published",

    allows_messages: true,
  };
}

export async function GET(
  request: Request,
) {
  try {
    const {
      supabase,
      user,
      response,
    } =
      await getAuthenticatedClient(
        request,
      );

    if (response) {
      return response;
    }

    if (!supabase || !user) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        },
      );
    }

    const url =
      new URL(request.url);

    const rawQuery =
      url.searchParams
        .get("q")
        ?.trim() ?? "";

    if (!rawQuery) {
      return NextResponse.json({
        profiles: [],
      });
    }

    const query =
      escapeSearchTerm(
        rawQuery,
      );

    /*
     * Search the three public profile fields separately.
     *
     * Keeping these as separate queries avoids constructing
     * a user-controlled PostgREST OR expression.
     */
    const [
      usernameResult,
      nameResult,
      interestResult,
    ] = await Promise.all([
      supabase
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
        .ilike(
          "username",
          `%${query}%`,
        )
        .neq("id", user.id)
        .limit(30),

      supabase
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
        .ilike(
          "full_name",
          `%${query}%`,
        )
        .neq("id", user.id)
        .limit(30),

      supabase
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
        .ilike(
          "featured_interest",
          `%${query}%`,
        )
        .neq("id", user.id)
        .limit(30),
    ]);

    const profileErrors = [
      usernameResult.error,
      nameResult.error,
      interestResult.error,
    ].filter(Boolean);

    if (profileErrors.length) {
      console.error(
        "Failed to search profiles:",
        profileErrors,
      );

      return NextResponse.json(
        {
          error:
            "Unable to search myFolks users.",
        },
        {
          status: 500,
        },
      );
    }

    const profilesById =
      new Map<
        string,
        ProfileRow
      >();

    for (const profile of [
      ...(usernameResult.data ?? []),
      ...(nameResult.data ?? []),
      ...(interestResult.data ?? []),
    ] as ProfileRow[]) {
      profilesById.set(
        profile.id,
        profile,
      );
    }

    const profiles =
      Array.from(
        profilesById.values(),
      );

    if (!profiles.length) {
      return NextResponse.json({
        profiles: [],
      });
    }

    /*
     * Load every relationship involving the current user.
     * Only the current user's requests are requested, so the
     * client never needs unrestricted access to friend-request data.
     */
    const {
      data: relationshipRows,
      error: relationshipError,
    } = await supabase
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
      .or(
        `sender_id.eq.${user.id},recipient_id.eq.${user.id}`,
      );

    if (relationshipError) {
      console.error(
        "Failed to load profile relationships:",
        relationshipError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to determine user relationships.",
        },
        {
          status: 500,
        },
      );
    }

    const relationships =
      (relationshipRows ??
        []) as FriendRequestRow[];

    const relationshipByProfile =
      new Map<
        string,
        RelationshipStatus
      >();

    /*
     * Only the latest meaningful relationship is used.
     *
     * Accepted takes priority over pending.
     * Pending takes priority over historical declined requests.
     */
    for (const profile of profiles) {
      const relatedRequests =
        relationships
          .filter(
            (relationship) =>
              relationship.sender_id ===
                profile.id ||
              relationship.recipient_id ===
                profile.id,
          )
          .sort(
            (a, b) =>
              new Date(
                b.updated_at,
              ).getTime() -
              new Date(
                a.updated_at,
              ).getTime(),
          );

      const accepted =
        relatedRequests.find(
          (relationship) =>
            relationship.status ===
            "accepted",
        );

      if (accepted) {
        relationshipByProfile.set(
          profile.id,
          "friends",
        );
        continue;
      }

      const pending =
        relatedRequests.find(
          (relationship) =>
            relationship.status ===
            "pending",
        );

      if (pending) {
        relationshipByProfile.set(
          profile.id,
          pending.sender_id ===
            user.id
            ? "pending_outgoing"
            : "pending_incoming",
        );

        continue;
      }

      relationshipByProfile.set(
        profile.id,
        "none",
      );
    }

    /*
     * Put exact-ish name/username matches first, followed by
     * the remaining matches alphabetically.
     */
    const normalizedQuery =
      rawQuery.toLowerCase();

    profiles.sort(
      (a, b) => {
        function score(
          profile: ProfileRow,
        ) {
          const username =
            profile.username
              ?.toLowerCase() ?? "";

          const name =
            profile.full_name
              ?.toLowerCase() ?? "";

          const interest =
            profile.featured_interest
              ?.toLowerCase() ?? "";

          let value = 0;

          if (
            username ===
            normalizedQuery
          ) {
            value -= 100;
          } else if (
            username.startsWith(
              normalizedQuery,
            )
          ) {
            value -= 50;
          }

          if (
            name ===
            normalizedQuery
          ) {
            value -= 90;
          } else if (
            name.startsWith(
              normalizedQuery,
            )
          ) {
            value -= 45;
          }

          if (
            interest ===
            normalizedQuery
          ) {
            value -= 20;
          }

          return value;
        }

        const scoreDifference =
          score(a) - score(b);

        if (
          scoreDifference !== 0
        ) {
          return scoreDifference;
        }

        const aName =
          a.full_name ||
          a.username ||
          "";

        const bName =
          b.full_name ||
          b.username ||
          "";

        return aName.localeCompare(
          bName,
        );
      },
    );

    const results =
      profiles.map(
        (profile) => ({
          ...profileToApiProfile(
            profile,
          ),
          relationship:
            relationshipByProfile.get(
              profile.id,
            ) ?? "none",
        }),
      );

    return NextResponse.json({
      profiles: results,
    });
  } catch (error) {
    console.error(
      "Profile search GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to search myFolks users.",
      },
      {
        status: 500,
      },
    );
  }
}