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

type DeleteMode =
  | "me"
  | "everyone";

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  text: string;
  message_asset_url: string | null;
  message_asset_name: string | null;
  message_asset_type: string | null;
  message_asset_size: number | null;
  created_at: string;
  deleted_for_sender: boolean;
  deleted_for_recipient: boolean;
  deleted_for_everyone: boolean;
};

type MessageInsertRow = MessageRow;

type MessageDeletionRow = Pick<
  MessageRow,
  | "id"
  | "sender_id"
  | "recipient_id"
  | "deleted_for_sender"
  | "deleted_for_recipient"
  | "deleted_for_everyone"
>;

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
      typeof message.sender_id === "string"
        ? message.sender_id
        : "",

    recipient_id:
      typeof message.recipient_id ===
      "string"
        ? message.recipient_id
        : "",

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
        : "",

    deleted_for_sender:
      message.deleted_for_sender === true,

    deleted_for_recipient:
      message.deleted_for_recipient === true,

    deleted_for_everyone:
      message.deleted_for_everyone === true,
  };
}

async function areFriends(
  admin: ReturnType<
    typeof createAdminClient
  >,
  userId: string,
  otherUserId: string,
) {
  const { data, error } =
    await admin
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

/* =========================================================
   GET MESSAGES
   ========================================================= */

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

    const url =
      new URL(request.url);

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

    if (
      profileId === user.id
    ) {
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

    const {
      data: recipient,
      error: recipientError,
    } =
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
      data: rawMessages,
      error: messagesError,
    } =
      await admin
        .from("messages")
        .select(
          [
            "id",
            "sender_id",
            "recipient_id",
            "text",
            "message_asset_url",
            "message_asset_name",
            "message_asset_type",
            "message_asset_size",
            "created_at",
            "deleted_for_sender",
            "deleted_for_recipient",
            "deleted_for_everyone",
          ].join(","),
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

    const allMessages =
      (rawMessages as unknown as MessageRow[]) ??
      [];

    /*
     * Deleted messages are removed from the
     * conversation view according to the
     * deletion flags.
     */
    const visibleMessages =
      allMessages.filter(
        (message) => {
          if (
            message.deleted_for_everyone
          ) {
            return false;
          }

          if (
            message.sender_id ===
            user.id
          ) {
            return !message.deleted_for_sender;
          }

          return !message.deleted_for_recipient;
        },
      );

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
      visibleMessages.map(
        (message) =>
          normalizeMessage(
            message as unknown as Record<
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
        profile_id:
          recipient.id,

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
          showLastSeen
            ? visibility
            : "nobody",
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

/* =========================================================
   SEND MESSAGE
   ========================================================= */

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

    if (
      profileId === user.id
    ) {
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

    const {
      data: recipient,
      error: recipientError,
    } =
      await admin
        .from("profiles")
        .select("id")
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

    const {
      data: rawMessage,
      error,
    } =
      await admin
        .from("messages")
        .insert({
          sender_id:
            user.id,

          recipient_id:
            profileId,

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
          [
            "id",
            "sender_id",
            "recipient_id",
            "text",
            "message_asset_url",
            "message_asset_name",
            "message_asset_type",
            "message_asset_size",
            "created_at",
            "deleted_for_sender",
            "deleted_for_recipient",
            "deleted_for_everyone",
          ].join(","),
        )
        .single();

    if (error) {
      throw error;
    }

    const data =
      rawMessage as unknown as MessageInsertRow;

    return NextResponse.json(
      {
        message:
          normalizeMessage(
            data as unknown as Record<
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

/* =========================================================
   DELETE MESSAGE
   ========================================================= */

export async function DELETE(
  request: Request,
) {
  try {
    const user =
      await authenticate(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required.",
        },
        { status: 401 },
      );
    }

    const body =
      (await request.json()) as {
        message_id?: unknown;
        mode?: unknown;
      };

    const messageId =
      typeof body.message_id ===
      "string"
        ? body.message_id.trim()
        : "";

    const mode =
      typeof body.mode === "string"
        ? (body.mode as DeleteMode)
        : "";

    if (
      !messageId ||
      !isUuid(messageId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid message_id is required.",
        },
        { status: 400 },
      );
    }

    if (
      mode !== "me" &&
      mode !== "everyone"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid deletion mode is required.",
        },
        { status: 400 },
      );
    }

    const admin =
      createAdminClient();

    /*
     * Load the message first so we can determine:
     *
     * 1. Whether it exists.
     * 2. Whether the authenticated user is involved.
     * 3. Whether the user is the sender.
     */
    const {
      data: rawMessage,
      error: messageError,
    } =
      await admin
        .from("messages")
        .select(
          [
            "id",
            "sender_id",
            "recipient_id",
            "deleted_for_sender",
            "deleted_for_recipient",
            "deleted_for_everyone",
          ].join(","),
        )
        .eq("id", messageId)
        .maybeSingle();

    if (messageError) {
      throw messageError;
    }

    if (!rawMessage) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Message not found.",
        },
        { status: 404 },
      );
    }

    const message =
      rawMessage as unknown as MessageDeletionRow;

    const isSender =
      message.sender_id ===
      user.id;

    const isRecipient =
      message.recipient_id ===
      user.id;

    if (
      !isSender &&
      !isRecipient
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You do not have permission to delete this message.",
        },
        { status: 403 },
      );
    }

    /*
     * Delete for everyone is only available
     * to the sender.
     */
    if (
      mode === "everyone" &&
      !isSender
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only the sender can delete a message for everyone.",
        },
        { status: 403 },
      );
    }

    /*
     * If the message is already deleted for everyone,
     * there is nothing more to update.
     */
    if (
      message.deleted_for_everyone
    ) {
      return NextResponse.json({
        success: true,
        mode,
        message_id:
          message.id,
        already_deleted: true,
      });
    }

    /*
     * Determine exactly which deletion flag belongs
     * to the authenticated user.
     */
    const update: Record<
      string,
      boolean
    > =
      mode === "everyone"
        ? {
            deleted_for_everyone:
              true,
          }
        : isSender
        ? {
            deleted_for_sender:
              true,
          }
        : {
            deleted_for_recipient:
              true,
          };

    /*
     * IMPORTANT:
     *
     * Return the updated database row.
     *
     * This lets us verify that Supabase actually
     * persisted the deletion flag.
     */
    const {
      data: updatedRawMessage,
      error: updateError,
    } =
      await admin
        .from("messages")
        .update(update)
        .eq("id", messageId)
        .select(
          [
            "id",
            "sender_id",
            "recipient_id",
            "deleted_for_sender",
            "deleted_for_recipient",
            "deleted_for_everyone",
          ].join(","),
        )
        .single();

    if (updateError) {
      console.error(
        "Supabase message deletion update failed:",
        updateError,
      );

      throw updateError;
    }

    if (!updatedRawMessage) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The message could not be updated.",
        },
        { status: 500 },
      );
    }

    const updatedMessage =
      updatedRawMessage as unknown as MessageDeletionRow;

    /*
     * Verify the exact flag we intended to change.
     */
    const deletionPersisted =
      mode === "everyone"
        ? updatedMessage.deleted_for_everyone ===
          true
        : isSender
        ? updatedMessage.deleted_for_sender ===
          true
        : updatedMessage.deleted_for_recipient ===
          true;

    if (!deletionPersisted) {
      console.error(
        "Message deletion was not persisted correctly.",
        {
          messageId,
          mode,
          userId: user.id,
          updatedMessage,
        },
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "The message deletion was not persisted.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      mode,
      message_id:
        updatedMessage.id,
      deleted_for_sender:
        updatedMessage.deleted_for_sender,
      deleted_for_recipient:
        updatedMessage.deleted_for_recipient,
      deleted_for_everyone:
        updatedMessage.deleted_for_everyone,
    });
  } catch (error) {
    console.error(
      "DELETE /api/messages failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Message could not be deleted.",
      },
      { status: 500 },
    );
  }
}