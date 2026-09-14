import { supabase } from "@/src/lib/supabase";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(
    message: string,
    status: number,
    data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
};

/**
 * Generic API request helper.
 *
 * Authenticated requests automatically receive the current
 * Supabase access token in the Authorization header.
 */
export async function apiRequest<
  T = Record<string, any>,
>(
  input: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    auth = true,
    headers,
    ...requestOptions
  } = options;

  const requestHeaders =
    new Headers(headers);

  requestHeaders.set(
    "Accept",
    "application/json",
  );

  /*
   * Attach the Supabase access token to authenticated API requests.
   */
  if (auth) {
    const {
      data: { session },
      error,
    } =
      await supabase.auth.getSession();

    if (error) {
      throw new ApiError(
        "Unable to read your authentication session.",
        401,
        error,
      );
    }

    if (!session?.access_token) {
      throw new ApiError(
        "Authentication required.",
        401,
      );
    }

    requestHeaders.set(
      "Authorization",
      `Bearer ${session.access_token}`,
    );
  }

  const response =
    await fetch(input, {
      ...requestOptions,
      headers: requestHeaders,
    });

  let data: unknown = null;

  const contentType =
    response.headers.get(
      "content-type",
    );

  if (
    contentType?.includes(
      "application/json",
    )
  ) {
    try {
      data =
        await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text =
        await response.text();

      data = text || null;
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    let message =
      `Request failed with status ${response.status}.`;

    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (
        data as {
          error?: unknown;
        }
      ).error === "string"
    ) {
      message = (
        data as {
          error: string;
        }
      ).error;
    } else if (
      typeof data === "string" &&
      data.trim()
    ) {
      message = data;
    }

    throw new ApiError(
      message,
      response.status,
      data,
    );
  }

  return data as T;
}

/**
 * Return a short set of initials for a profile name.
 *
 * Examples:
 *   "Rashidh Darien" -> "RD"
 *   "Rashidh" -> "R"
 *   "James Robert Darien" -> "JD"
 */
export function initials(
  value?: string | null,
): string {
  if (!value) {
    return "?";
  }

  const parts =
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (!parts.length) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 1)
      .toUpperCase();
  }

  return (
    parts[0].slice(0, 1) +
    parts[
      parts.length - 1
    ].slice(0, 1)
  ).toUpperCase();
}

/**
 * Return a shuffled copy of an array.
 */
export function shuffle<T>(
  items: T[],
): T[] {
  const copy = [...items];

  for (
    let i = copy.length - 1;
    i > 0;
    i -= 1
  ) {
    const j =
      Math.floor(
        Math.random() *
          (i + 1),
      );

    [
      copy[i],
      copy[j],
    ] = [
      copy[j],
      copy[i],
    ];
  }

  return copy;
}