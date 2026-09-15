import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabasePublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
}

if (!supabaseSecretKey) {
  throw new Error("Missing SUPABASE_SECRET_KEY");
}

const SUPABASE_URL = supabaseUrl;

const SUPABASE_PUBLISHABLE_KEY =
  supabasePublishableKey;

const SUPABASE_SECRET_KEY =
  supabaseSecretKey;

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

function createAuthClient(accessToken: string) {
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

function createAdminClient() {
  return createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

async function authenticate(request: Request) {
  const authorization =
    request.headers.get("Authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return {
      user: null,
      authSupabase: null,
      response: NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 },
      ),
    };
  }

  const accessToken = authorization
    .slice("Bearer ".length)
    .trim();

  if (!accessToken) {
    return {
      user: null,
      authSupabase: null,
      response: NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 },
      ),
    };
  }

  const authSupabase =
    createAuthClient(accessToken);

  const {
    data: { user },
    error,
  } = await authSupabase.auth.getUser();

  if (error || !user) {
    console.error(
      "[friend-requests] Authentication error:",
      error,
    );

    return {
      user: null,
      authSupabase: null,
      response: NextResponse.json(
        {
          error:
            "Invalid authentication session.",
        },
        { status: 401 },
      ),
    };
  }

  return {
    user,
    authSupabase,
    response: null,
  };
}

function toApiProfile(
  profile: ProfileRow | null,
) {
  if (!profile) {
    return null;
  }

  return {
    profile_id: profile.id,
    username:
      profile.username ?? undefined,
    display_name:
      profile.full_name?.trim() ||
      profile.username?.trim() ||
      "myFolks user",
    featured_interest:
      profile.featured_interest?.trim() || "",
    bio: profile.bio?.trim() || "",
    location:
      profile.location?.trim() || "",
    photo_url:
      profile.profile_image_url?.trim() ||
      undefined,
    visibility: "published",
    allows_messages: true,
  };
}

export async function GET(request: Request) {
  try {
    const {
      user,
      response,
    } = await authenticate(request);

    if (response) {
      return response;
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 },
      );
    }

    const adminSupabase =
      createAdminClient();

    const {
      data,
      error,
    } = await adminSupabase
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
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "[friend-requests] Supabase error:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load friend requests.",
          details:
            process.env.NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        },
        { status: 500 },
      );
    }

    const requestRows =
      (data ?? []) as FriendRequestRow[];

    const statusByProfile: Record<
      string,
      {
        status: string;
        direction:
          | "incoming"
          | "outgoing";
        request_id: string;
      }
    > = {};

    const profileIds =
      new Set<string>();

    for (const row of requestRows) {
      const incoming =
        row.recipient_id === user.id;

      const otherProfileId =
        incoming
          ? row.sender_id
          : row.recipient_id;

      if (!otherProfileId) {
        continue;
      }

      statusByProfile[
        otherProfileId
      ] = {
        status: row.status,
        direction: incoming
          ? "incoming"
          : "outgoing",
        request_id: row.id,
      };

      profileIds.add(
        row.sender_id,
      );

      profileIds.add(
        row.recipient_id,
      );
    }

    const profiles =
      new Map<
        string,
        ProfileRow
      >();

    if (profileIds.size > 0) {
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
            location,
            profile_image_url
          `,
        )
        .in(
          "id",
          Array.from(profileIds),
        );

      if (profilesError) {
        console.error(
          "[friend-requests] Profile loading error:",
          profilesError,
        );

        return NextResponse.json(
          {
            error:
              "Unable to load friend request profiles.",
          },
          { status: 500 },
        );
      }

      for (const profile of
        (profileRows ??
          []) as ProfileRow[]) {
        profiles.set(
          profile.id,
          profile,
        );
      }
    }

    const requests =
      requestRows.map((row) => {
        const incoming =
          row.recipient_id === user.id;

        const sender =
          profiles.get(
            row.sender_id,
          ) ?? null;

        const recipient =
          profiles.get(
            row.recipient_id,
          ) ?? null;

        return {
          ...row,
          direction: incoming
            ? "incoming"
            : "outgoing",
          sender,
          recipient,
          profile: incoming
            ? sender
            : recipient,
          profile_data: incoming
            ? toApiProfile(sender)
            : toApiProfile(recipient),
        };
      });

    return NextResponse.json({
      requests,
      statusByProfile,
    });
  } catch (error) {
    console.error(
      "[friend-requests] GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load friend requests.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const {
      user,
      response,
    } = await authenticate(request);

    if (response) {
      return response;
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 },
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
          error: "Invalid request body.",
        },
        { status: 400 },
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
        { status: 400 },
      );
    }

    if (recipientId === user.id) {
      return NextResponse.json(
        {
          error:
            "You cannot send a friend request to yourself.",
        },
        { status: 400 },
      );
    }

    const adminSupabase =
      createAdminClient();

    const {
      data: recipient,
      error: recipientError,
    } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("id", recipientId)
      .maybeSingle();

    if (recipientError) {
      console.error(
        "[friend-requests] Recipient lookup error:",
        recipientError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to find that profile.",
        },
        { status: 500 },
      );
    }

    if (!recipient) {
      return NextResponse.json(
        {
          error:
            "That profile no longer exists.",
        },
        { status: 404 },
      );
    }

    const {
      data: existingRequests,
      error: existingError,
    } = await adminSupabase
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
      .order("created_at", {
        ascending: false,
      });

    if (existingError) {
      console.error(
        "[friend-requests] Existing request lookup error:",
        existingError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to check the existing friendship request.",
        },
        { status: 500 },
      );
    }

    const rows =
      (existingRequests ??
        []) as FriendRequestRow[];

    const pending =
      rows.find(
        (row) =>
          row.status === "pending",
      );

    if (pending) {
      if (
        pending.sender_id ===
        user.id
      ) {
        return NextResponse.json(
          {
            error:
              "A friend request is already pending.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error:
            "This person has already sent you a friend request.",
        },
        { status: 409 },
      );
    }

    const accepted =
      rows.find(
        (row) =>
          row.status === "accepted",
      );

    if (accepted) {
      return NextResponse.json(
        {
          error:
            "You are already friends with this person.",
        },
        { status: 409 },
      );
    }

    const {
      data: createdRequest,
      error: createError,
    } = await adminSupabase
      .from("friend_requests")
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
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
        "[friend-requests] Create error:",
        createError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to send friend request.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        request: createdRequest,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "[friend-requests] POST error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to send friend request.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const {
      user,
      authSupabase,
      response,
    } = await authenticate(request);

    if (response) {
      return response;
    }

    if (!user || !authSupabase) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 },
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
          error: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    const requestId =
      body.request_id?.trim();

    const action = body.action;

    if (!requestId) {
      return NextResponse.json(
        {
          error:
            "Friend request ID is required.",
        },
        { status: 400 },
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
        { status: 400 },
      );
    }

    const adminSupabase =
      createAdminClient();

    const {
      data: friendRequest,
      error: requestError,
    } = await adminSupabase
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
        "[friend-requests] Request lookup error:",
        requestError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load friend request.",
        },
        { status: 500 },
      );
    }

    if (!friendRequest) {
      return NextResponse.json(
        {
          error:
            "Friend request not found.",
        },
        { status: 404 },
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
        { status: 403 },
      );
    }

    if (
      requestRow.status !== "pending"
    ) {
      return NextResponse.json(
        {
          error:
            "This friend request is no longer pending.",
        },
        { status: 409 },
      );
    }

    if (action === "decline") {
      const {
        data: declined,
        error: declineError,
      } = await adminSupabase
        .from("friend_requests")
        .update({
          status: "declined",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq(
          "recipient_id",
          user.id,
        )
        .eq("status", "pending")
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
          "[friend-requests] Decline error:",
          declineError,
        );

        return NextResponse.json(
          {
            error:
              "Unable to decline friend request.",
          },
          { status: 500 },
        );
      }

      if (!declined) {
        return NextResponse.json(
          {
            error:
              "Friend request could not be declined.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        request: declined,
        status: "declined",
      });
    }

    /*
     * Use the authenticated Supabase client for the
     * acceptance RPC so auth.uid() represents the
     * actual recipient.
     */
    const {
      error: acceptError,
    } = await authSupabase.rpc(
      "accept_friend_request",
      {
        p_request_id: requestId,
      },
    );

    if (acceptError) {
      console.error(
        "[friend-requests] Accept error:",
        acceptError,
      );

      return NextResponse.json(
        {
          error:
            acceptError.message ||
            "Unable to accept friend request.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: "accepted",
      request_id: requestId,
      friend_profile_id:
        requestRow.sender_id,
    });
  } catch (error) {
    console.error(
      "[friend-requests] PATCH error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to update friend request.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const {
      user,
      response,
    } = await authenticate(request);

    if (response) {
      return response;
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 },
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
          error: "Invalid request body.",
        },
        { status: 400 },
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
        { status: 400 },
      );
    }

    const adminSupabase =
      createAdminClient();

    const {
      data: deletedRequest,
      error,
    } = await adminSupabase
      .from("friend_requests")
      .delete()
      .eq("id", requestId)
      .eq("sender_id", user.id)
      .eq("status", "pending")
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
        "[friend-requests] Delete error:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "Unable to cancel friend request.",
        },
        { status: 500 },
      );
    }

    if (!deletedRequest) {
      return NextResponse.json(
        {
          error:
            "Friend request not found or cannot be cancelled.",
        },
        { status: 404 },
      );
    }

    const row =
      deletedRequest as FriendRequestRow;

    return NextResponse.json({
      success: true,
      status: "cancelled",
      request_id: requestId,
      friend_profile_id:
        row.recipient_id,
    });
  } catch (error) {
    console.error(
      "[friend-requests] DELETE error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to cancel friend request.",
      },
      { status: 500 },
    );
  }
}