import type {
  FriendRequestRecord,
  FriendRequestStates,
} from "../types";

function isUsableRequest(
  request: FriendRequestRecord | undefined | null,
): request is FriendRequestRecord {
  return Boolean(
    request &&
      typeof request.id === "string" &&
      typeof request.sender_id === "string" &&
      typeof request.recipient_id === "string" &&
      typeof request.status === "string",
  );
}

/**
 * Collapse the raw request list into one state per other person.
 *
 * Accepted always wins; otherwise the first pending request is kept,
 * tagged by whether the current user sent or received it.
 */
export function mapRequestsToStates(
  requests: FriendRequestRecord[],
  currentUserId: string,
): FriendRequestStates {
  const states: FriendRequestStates = {};

  for (const request of requests) {
    if (!isUsableRequest(request)) continue;

    const otherProfileId =
      request.sender_id === currentUserId
        ? request.recipient_id
        : request.sender_id;

    if (!otherProfileId) continue;

    if (request.status === "accepted") {
      states[otherProfileId] = {
        status: "accepted",
        requestId: request.id,
      };

      continue;
    }

    if (request.status === "pending" && !states[otherProfileId]) {
      states[otherProfileId] = {
        status:
          request.sender_id === currentUserId
            ? "pending"
            : "incoming",
        requestId: request.id,
      };
    }
  }

  return states;
}

/**
 * Map a failed "send request" error onto the state it implies.
 *
 * The API rejects duplicates, so these errors are really status
 * information rather than failures worth surfacing to the user.
 */
export function statusFromRequestError(
  message: string,
): FriendRequestStates[string]["status"] | null {
  if (message === "A friend request is already pending.") {
    return "pending";
  }

  if (message === "You are already friends with this person.") {
    return "accepted";
  }

  if (message.includes("already sent you a friend request")) {
    return "incoming";
  }

  return null;
}
