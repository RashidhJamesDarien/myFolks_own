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

const SUPABASE_URL = supabaseUrl as string;

const SUPABASE_PUBLISHABLE_KEY =
  supabasePublishableKey as string;

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

type FriendRequestWithProfile =
  FriendRequestRow & {
    direction:
      | "incoming"
      | "outgoing";
    sender: ProfileRow | null;
    recipient: ProfileRow | null;
    profile: ProfileRow | null;
  };

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
    request.headers.get(
      "Authorization",
    );

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
    data: {
      user,
    },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "Friend request authentication error:",
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

function profileToApiProfile(
  profile: ProfileRow | null,
) {
  if (!profile) {
    return null;
  }

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
    bio: profile.bio || "",
    location:
      profile.location || "",
    photo_url:
      profile.profile_image_url ||
      undefined,
    visibility: "published",
    allows_messages: true,
  };
}

async function loadProfile(
  supabase: ReturnType<
    typeof createSupabaseClient
  >,
  profileId: string,
): Promise<ProfileRow | null> {
  const {
    data,
    error,
  } = await supabase
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
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    console.error(
      "Failed to load profile:",
      error,
    );

    return null;
  }

  return (data ??
    null) as ProfileRow | null;
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

    const {
      data,
      error,
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
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

    if (error) {
      console.error(
        "Failed to load friend requests:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load friend requests.",
        },
        {
          status: 500,
        },
      );
    }

    const requestRows =
      (data ?? []) as FriendRequestRow[];

    const profileIds =
      new Set<string>();

    for (const requestRow of requestRows) {
      profileIds.add(
        requestRow.sender_id,
      );

      profileIds.add(
        requestRow.recipient_id,
      );
    }

    const profiles =
      new Map<
        string,
        ProfileRow
      >();

    await Promise.all(
      Array.from(
        profileIds,
      ).map(async (profileId) => {
        const profile =
          await loadProfile(
            supabase,
            profileId,
          );

        if (profile) {
          profiles.set(
            profileId,
            profile,
          );
        }
      }),
    );

    const requests: FriendRequestWithProfile[] =
      requestRows.map(
        (requestRow) => {
          const incoming =
            requestRow.recipient_id ===
            user.id;

          const sender =
            profiles.get(
              requestRow.sender_id,
            ) ?? null;

          const recipient =
            profiles.get(
              requestRow.recipient_id,
            ) ?? null;

          return {
            ...requestRow,

            direction:
              incoming
                ? "incoming"
                : "outgoing",

            sender,

            recipient,

            profile:
              incoming
                ? sender
                : recipient,
          };
        },
      );

    return NextResponse.json({
      requests,
    });
  } catch (error) {
    console.error(
      "Friend requests GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load friend requests.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
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

    let body: {
      recipient_id?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        },
      );
    }

    const recipientId =
      body.recipient_id?.trim();

    if (!recipientId) {
      return NextResponse.json(
        {
          error:
            "Recipient profile is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      recipientId === user.id
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot send a friend request to yourself.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      data: recipient,
      error: recipientError,
    } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", recipientId)
      .maybeSingle();

    if (recipientError) {
      console.error(
        "Failed to find friend request recipient:",
        recipientError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to find that profile.",
        },
        {
          status: 500,
        },
      );
    }

    if (!recipient) {
      return NextResponse.json(
        {
          error:
            "That profile no longer exists.",
        },
        {
          status: 404,
        },
      );
    }

    const {
      data: existingRequests,
      error: existingRequestError,
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
        `and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

    if (existingRequestError) {
      console.error(
        "Failed to check existing friend request:",
        existingRequestError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to check the existing friendship request.",
        },
        {
          status: 500,
        },
      );
    }

    const existingRequest =
      (
        existingRequests ??
        []
      ) as FriendRequestRow[];

    const activeRequest =
      existingRequest.find(
        (item) =>
          item.status ===
          "pending",
      );

    if (activeRequest) {
      if (
        activeRequest.sender_id ===
        user.id
      ) {
        return NextResponse.json(
          {
            error:
              "A friend request is already pending.",
          },
          {
            status: 409,
          },
        );
      }

      return NextResponse.json(
        {
          error:
            "This person has already sent you a friend request.",
        },
        {
          status: 409,
        },
      );
    }

    const acceptedRequest =
      existingRequest.find(
        (item) =>
          item.status ===
          "accepted",
      );

    if (acceptedRequest) {
      return NextResponse.json(
        {
          error:
            "You are already friends with this person.",
        },
        {
          status: 409,
        },
      );
    }

    const {
      data: createdRequest,
      error: createError,
    } =
      await supabase
        .from("friend_requests")
        .insert({
          sender_id:
            user.id,
          recipient_id:
            recipientId,
          status: "pending",
        })
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
        .single();

    if (createError) {
      console.error(
        "Failed to create friend request:",
        createError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to send friend request.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        request:
          createdRequest,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Friend requests POST error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to send friend request.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
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

    let body: {
      request_id?: string;
      action?: "accept" | "decline";
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        },
      );
    }

    const requestId =
      body.request_id?.trim();

    const action =
      body.action;

    if (!requestId) {
      return NextResponse.json(
        {
          error:
            "Friend request ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      action !== "accept" &&
      action !== "decline"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid friend request action.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      data: friendRequest,
      error: requestError,
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
        .eq("id", requestId)
        .maybeSingle();

    if (requestError) {
      console.error(
        "Failed to load friend request:",
        requestError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load friend request.",
        },
        {
          status: 500,
        },
      );
    }

    if (!friendRequest) {
      return NextResponse.json(
        {
          error:
            "Friend request not found.",
        },
        {
          status: 404,
        },
      );
    }

    const requestRow =
      friendRequest as FriendRequestRow;

    if (
      requestRow.recipient_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          error:
            "Only the recipient can respond to this friend request.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      requestRow.status !==
      "pending"
    ) {
      return NextResponse.json(
        {
          error:
            "This friend request is no longer pending.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      action === "decline"
    ) {
      const {
        data: declinedRequest,
        error: declineError,
      } =
        await supabase
          .from("friend_requests")
          .update({
            status:
              "declined",
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            requestId,
          )
          .eq(
            "recipient_id",
            user.id,
          )
          .eq(
            "status",
            "pending",
          )
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
          .maybeSingle();

      if (declineError) {
        console.error(
          "Failed to decline friend request:",
          declineError,
        );

        return NextResponse.json(
          {
            error:
              "Unable to decline friend request.",
          },
          {
            status: 500,
          },
        );
      }

      return NextResponse.json({
        request:
          declinedRequest,
        status: "declined",
      });
    }

    /*
     * Acceptance is handled by the database RPC.
     *
     * The RPC:
     * 1. Verifies the current user is the recipient.
     * 2. Locks the pending request.
     * 3. Marks it as accepted.
     * 4. Creates both directions of the friendship.
     */
    const {
      error: acceptError,
    } =
      await supabase.rpc(
        "accept_friend_request",
        {
          p_request_id:
            requestId,
        },
      );

    if (acceptError) {
      console.error(
        "Failed to accept friend request:",
        acceptError,
      );

      return NextResponse.json(
        {
          error:
            acceptError.message ||
            "Unable to accept friend request.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      status: "accepted",
      request_id:
        requestId,
      friend_profile_id:
        requestRow.sender_id,
    });
  } catch (error) {
    console.error(
      "Friend requests PATCH error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to update friend request.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
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

    let body: {
      request_id?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        },
      );
    }

    const requestId =
      body.request_id?.trim();

    if (!requestId) {
      return NextResponse.json(
        {
          error:
            "Friend request ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      data: deletedRequest,
      error,
    } =
      await supabase
        .from("friend_requests")
        .delete()
        .eq(
          "id",
          requestId,
        )
        .eq(
          "sender_id",
          user.id,
        )
        .eq(
          "status",
          "pending",
        )
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
        .maybeSingle();

    if (error) {
      console.error(
        "Failed to cancel friend request:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "Unable to cancel friend request.",
        },
        {
          status: 500,
        },
      );
    }

    if (!deletedRequest) {
      return NextResponse.json(
        {
          error:
            "Friend request not found or cannot be cancelled.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      status: "cancelled",
      request_id:
        requestId,
      friend_profile_id:
        (
          deletedRequest as FriendRequestRow
        ).recipient_id,
    });
  } catch (error) {
    console.error(
      "Friend requests DELETE error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to cancel friend request.",
      },
      {
        status: 500,
      },
    );
  }
}