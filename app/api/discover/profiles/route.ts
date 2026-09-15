import { NextRequest, NextResponse } from "next/server";
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

const supabaseAuth = createClient(
  supabaseUrl,
  supabasePublishableKey,
);

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export async function GET(request: NextRequest) {
  try {
    const authorizationHeader =
      request.headers.get("authorization");

    if (!authorizationHeader) {
      return NextResponse.json(
        {
          error: "Missing authorization header.",
        },
        { status: 401 },
      );
    }

    const [scheme, token] =
      authorizationHeader.split(" ");

    if (
      scheme?.toLowerCase() !== "bearer" ||
      !token
    ) {
      return NextResponse.json(
        {
          error: "Invalid authorization header.",
        },
        { status: 401 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      console.error(
        "Failed to authenticate discover request:",
        userError,
      );

      return NextResponse.json(
        {
          error:
            "Your session is invalid or has expired.",
        },
        { status: 401 },
      );
    }

    const {
      data: profiles,
      error: profilesError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, username, full_name, featured_interest, bio, location, profile_image_url",
      )
      .neq("id", user.id);

    if (profilesError) {
      console.error(
        "Failed to load discover profiles:",
        profilesError,
      );

      return NextResponse.json(
        {
          error: "Profiles could not be loaded.",
        },
        { status: 500 },
      );
    }

    const normalizedProfiles = (
      profiles || []
    ).map((profile) => ({
      profile_id: profile.id,
      username:
        profile.username ?? undefined,
      display_name:
        profile.full_name ||
        profile.username ||
        "myFolks user",
      featured_interest:
        profile.featured_interest || "",
      bio: profile.bio || "",
      location: profile.location || "",
      visibility: "published",
      allows_messages: true,
      photo_url:
        profile.profile_image_url ||
        undefined,
    }));

    return NextResponse.json(
      {
        profiles: normalizedProfiles,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Unexpected discover profiles error:",
      error,
    );

    return NextResponse.json(
      {
        error: "An unexpected error occurred.",
      },
      { status: 500 },
    );
  }
}