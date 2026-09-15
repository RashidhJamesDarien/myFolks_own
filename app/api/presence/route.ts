import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY;

function getRequiredEnvironmentVariable(
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

function createUserClient(accessToken: string) {
  return createClient(
    getRequiredEnvironmentVariable(
      supabaseUrl,
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    getRequiredEnvironmentVariable(
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
    getRequiredEnvironmentVariable(
      supabaseUrl,
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    getRequiredEnvironmentVariable(
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

async function authenticate(request: Request) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const accessToken =
    authorization.slice("Bearer ".length).trim();

  if (!accessToken) {
    return null;
  }

  const client =
    createUserClient(accessToken);

  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  return user;
}

export async function POST(request: Request) {
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

    const admin =
      createAdminClient();

    const now =
      new Date().toISOString();

    const { error } = await admin
      .from("profiles")
      .update({
        last_seen_at: now,
      })
      .eq("id", user.id);

    if (error) {
      console.error(
        "Failed to update last seen:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "Presence could not be updated.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      last_seen_at: now,
    });
  } catch (error) {
    console.error(
      "Presence API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Presence could not be updated.",
      },
      { status: 500 },
    );
  }
}