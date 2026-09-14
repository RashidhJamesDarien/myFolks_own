import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabasePublishableKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

if (!supabaseSecretKey) {
  throw new Error("Missing SUPABASE_SECRET_KEY");
}

/**
 * Public Supabase client.
 *
 * This client is only used to verify the user's access token.
 */
const supabaseAuth = createClient(
  supabaseUrl,
  supabasePublishableKey,
);

/**
 * Server-only Supabase client.
 *
 * The secret key must NEVER be exposed to browser/client code.
 */
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

export async function DELETE(request: NextRequest) {
  try {
    /*
     * The browser sends:
     *
     * Authorization: Bearer <supabase-access-token>
     */
    const authorizationHeader =
      request.headers.get("authorization");

    if (!authorizationHeader) {
      return NextResponse.json(
        {
          error: "Missing authorization header.",
        },
        {
          status: 401,
        },
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
        {
          status: 401,
        },
      );
    }

    /*
     * Verify that the access token belongs to a
     * currently authenticated Supabase user.
     */
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      console.error(
        "Failed to authenticate account deletion:",
        userError,
      );

      return NextResponse.json(
        {
          error: "Your session is invalid or has expired.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * Delete the user's profile row first.
     *
     * The secret-key client bypasses RLS, allowing this
     * server-side operation to work regardless of the
     * browser client's RLS policies.
     */
    const { error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", user.id);

    if (profileError) {
      console.error(
        "Failed to delete user profile:",
        profileError,
      );

      return NextResponse.json(
        {
          error:
            "Your profile could not be deleted.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Finally delete the Supabase Auth user.
     *
     * This permanently removes the authentication
     * account associated with the user.
     */
    const { error: deleteUserError } =
      await supabaseAdmin.auth.admin.deleteUser(
        user.id,
      );

    if (deleteUserError) {
      console.error(
        "Failed to delete Supabase Auth user:",
        deleteUserError,
      );

      return NextResponse.json(
        {
          error:
            "Your account could not be completely deleted.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account deleted successfully.",
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Unexpected account deletion error:",
      error,
    );

    return NextResponse.json(
      {
        error: "An unexpected error occurred.",
      },
      {
        status: 500,
      },
    );
  }
}