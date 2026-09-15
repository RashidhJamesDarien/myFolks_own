import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY;

const MAX_MESSAGE_LENGTH = 280;
const MAX_ASSET_SIZE = 10 * 1024 * 1024;

type LastSeenVisibility =
  | "everyone"
  | "friends"
  | "nobody";

function required(
  value: string | undefined,
  name: string,
) {
  if (!value) {
    throw new Error(
      `${name} is not configured.`,
    );
  }

  return value;
}

function createUserClient(
  accessToken: string,
) {
  return createClient(
    required(
      supabaseUrl,
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    required(
      supabasePublishableKey,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

function createAdminClient() {
  return createClient(
    required(
      supabaseUrl,
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    required(
      supabaseSecretKey,
      "SUPABASE_SECRET_KEY",
    ),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

async function authenticate(
  request: Request,
) {
  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    !authorization?.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }

  const accessToken =
    authorization
      .slice("Bearer ".length)
      .trim();

  if (!accessToken) {
    return null;
  }

  const client =
    createUserClient(accessToken);

  const {
    data: { user },
    error,
  } =
    await client.auth.getUser(
      accessToken,
    );

  if (error || !user) {
    return null;
  }

  return user;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeMessage(
  message: Record<string, unknown>,
) {
  return {
    id:
      typeof message.id === "string"
        ? message.id
        : undefined,
    sender_id:
      message.sender_id,
    recipient_id:
      message.recipient_id,
    text:
      typeof message.text === "string"
        ? message.text
        : "",
    message_asset_url:
      typeof message.message_asset_url ===
      "string"
        ? message.message_asset_url
        : undefined,
    message_asset_name:
      typeof message.message_asset_name ===
      "string"
        ? message.message_asset_name
        : undefined,
    message_asset_type:
      typeof message.message_asset_type ===
      "string"
        ? message.message_asset_type
        : undefined,
    message_asset_size:
      typeof message.message_asset_size ===
      "number"
        ? message.message_asset_size
        : undefined,
    created_at:
      typeof message.created_at === "string"
        ? message.created_at
        : undefined,
  };
}

async function areFriends(
  admin: ReturnType<
    typeof createAdminClient
  >,
  userId: string,
  otherUserId: string,
) {
  const { data, error } = await admin
    .from("friend_requests")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`,
    )
    .limit(1);

  if (error) {
    throw error;
  }

  return Boolean(data?.length);
}

async function canSeeLastSeen(
  admin: ReturnType<
    typeof createAdminClient
  >,
  viewerId: string,
  profileId: string,
  visibility: LastSeenVisibility,
) {
  if (viewerId === profileId) {
    return true;
  }

  if (visibility === "everyone") {
    return true;
  }

  if (visibility === "nobody") {
    return false;
  }

  return areFriends(
    admin,
    viewerId,
    profileId,
  );
}

export async function GET(
  request: Request,
) {
  try {
    const user =
      await authenticate(request);

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        { status: 401 },
      );
    }

    const url = new URL(
      request.url,
    );

    const profileId =
      url.searchParams.get(
        "profile_id",
      );

    if (
      !profileId ||
      !isUuid(profileId)
    ) {
      return NextResponse.json(
        {
          error:
            "A valid profile_id is required.",
        },
        { status: 400 },
      );
    }

    if (profileId === user.id) {
      return NextResponse.json(
        {
          error:
            "You cannot open a conversation with yourself.",
        },
        { status: 400 },
      );
    }

    const admin =
      createAdminClient();

    const { data: recipient, error: recipientError } =
      await admin
        .from("profiles")
        .select(
          "id,username,full_name,profile_image_url,last_seen_at,last_seen_visibility",
        )
        .eq("id", profileId)
        .maybeSingle();

    if (recipientError) {
      throw recipientError;
    }

    if (!recipient) {
      return NextResponse.json(
        {
          error:
            "Profile not found.",
        },
        { status: 404 },
      );
    }

    const friends =
      await areFriends(
        admin,
        user.id,
        profileId,
      );

    if (!friends) {
      return NextResponse.json(
        {
          error:
            "You can only view messages with accepted friends.",
        },
        { status: 403 },
      );
    }

    const {
      data: messages,
      error: messagesError,
    } = await admin
      .from("messages")
      .select(
        "id,sender_id,recipient_id,text,message_asset_url,message_asset_name,message_asset_type,message_asset_size,created_at",
      )
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${profileId}),and(sender_id.eq.${profileId},recipient_id.eq.${user.id})`,
      )
      .order(
        "created_at",
        {
          ascending: true,
        },
      );

    if (messagesError) {
      throw messagesError;
    }

    const visibility =
      (recipient.last_seen_visibility ??
        "friends") as LastSeenVisibility;

    const showLastSeen =
      await canSeeLastSeen(
        admin,
        user.id,
        profileId,
        visibility,
      );

    const normalizedMessages =
      (messages ?? []).map(
        (message) =>
          normalizeMessage(
            message as Record<
              string,
              unknown
            >,
          ),
      );

    return NextResponse.json({
      messages:
        normalizedMessages,
      count:
        normalizedMessages.length,
      profile: {
        profile_id: recipient.id,
        username:
          recipient.username,
        display_name:
          recipient.full_name,
        photo_url:
          recipient.profile_image_url,
        last_seen_at:
          showLastSeen
            ? recipient.last_seen_at
            : null,
        last_seen_visibility:
          visibility,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/messages failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Messages could not be loaded.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const user =
      await authenticate(request);

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        { status: 401 },
      );
    }

    const body =
      (await request.json()) as {
        profile_id?: unknown;
        text?: unknown;
        message_asset_url?: unknown;
        message_asset_name?: unknown;
        message_asset_type?: unknown;
        message_asset_size?: unknown;
      };

    const profileId =
      typeof body.profile_id ===
      "string"
        ? body.profile_id.trim()
        : "";

    if (
      !profileId ||
      !isUuid(profileId)
    ) {
      return NextResponse.json(
        {
          error:
            "A valid profile_id is required.",
        },
        { status: 400 },
      );
    }

    if (profileId === user.id) {
      return NextResponse.json(
        {
          error:
            "You cannot message yourself.",
        },
        { status: 400 },
      );
    }

    const text =
      typeof body.text === "string"
        ? body.text.trim()
        : "";

    const assetUrl =
      typeof body.message_asset_url ===
      "string"
        ? body.message_asset_url.trim()
        : "";

    const assetName =
      typeof body.message_asset_name ===
      "string"
        ? body.message_asset_name.trim()
        : "";

    const assetType =
      typeof body.message_asset_type ===
      "string"
        ? body.message_asset_type.trim()
        : "";

    const assetSize =
      typeof body.message_asset_size ===
      "number"
        ? body.message_asset_size
        : null;

    if (
      text.length >
      MAX_MESSAGE_LENGTH
    ) {
      return NextResponse.json(
        {
          error:
            `Messages cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
        },
        { status: 400 },
      );
    }

    if (
      assetSize !== null &&
      (!Number.isFinite(
        assetSize,
      ) ||
        assetSize < 0 ||
        assetSize >
          MAX_ASSET_SIZE)
    ) {
      return NextResponse.json(
        {
          error:
            "Attachments must be 10 MB or smaller.",
        },
        { status: 400 },
      );
    }

    if (!text && !assetUrl) {
      return NextResponse.json(
        {
          error:
            "Message cannot be empty.",
        },
        { status: 400 },
      );
    }

    const admin =
      createAdminClient();

    const { data: recipient, error: recipientError } =
      await admin
        .from("profiles")
        .select(
          "id,allows_messages",
        )
        .eq("id", profileId)
        .maybeSingle();

    if (recipientError) {
      throw recipientError;
    }

    if (!recipient) {
      return NextResponse.json(
        {
          error:
            "Recipient profile not found.",
        },
        { status: 404 },
      );
    }

    const friends =
      await areFriends(
        admin,
        user.id,
        profileId,
      );

    if (!friends) {
      return NextResponse.json(
        {
          error:
            "You can only message accepted friends.",
        },
        { status: 403 },
      );
    }

    if (
      recipient.allows_messages ===
      false
    ) {
      return NextResponse.json(
        {
          error:
            "This person is not accepting messages right now.",
        },
        { status: 403 },
      );
    }

    const { data, error } =
      await admin
        .from("messages")
        .insert({
          sender_id: user.id,
          recipient_id: profileId,
          text,
          message_asset_url:
            assetUrl || null,
          message_asset_name:
            assetName || null,
          message_asset_type:
            assetType || null,
          message_asset_size:
            assetSize,
        })
        .select(
          "id,sender_id,recipient_id,text,message_asset_url,message_asset_name,message_asset_type,message_asset_size,created_at",
        )
        .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        message:
          normalizeMessage(
            data as Record<
              string,
              unknown
            >,
          ),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/messages failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Message could not be sent.",
      },
      { status: 500 },
    );
  }
}