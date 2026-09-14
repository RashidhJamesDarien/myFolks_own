"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import { Eyebrow } from "./Eyebrow";
import type { Profile } from "./types";
import { API } from "./constants";
import { apiRequest } from "./utils";

type FriendRequest = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  direction:
    | "incoming"
    | "outgoing";
  sender: Profile | null;
  recipient: Profile | null;
  profile: Profile | null;
};

type FriendsResponse = {
  friends?: Profile[];
};

type FriendRequestsResponse = {
  requests?: FriendRequest[];
};

export function FriendsView({
  friends,
  search,
  onSearch,
  onOpenMessage,
}: {
  friends: Profile[];
  search: string;
  onSearch: (value: string) => void;
  onOpenMessage: (
    profile: Profile,
  ) => void;
}) {
  const [localFriends, setLocalFriends] =
    useState<Profile[]>(friends);

  const [requests, setRequests] =
    useState<FriendRequest[]>([]);

  const [loadingRequests, setLoadingRequests] =
    useState(true);

  const [requestActionId, setRequestActionId] =
    useState<string | null>(null);

  const [statusMessage, setStatusMessage] =
    useState<string | null>(null);

  const [statusType, setStatusType] =
    useState<
      "info" | "success" | "error"
    >("info");

  useEffect(() => {
    setLocalFriends(friends);
  }, [friends]);

  useEffect(() => {
    let cancelled = false;

    async function loadFriendRequests() {
      try {
        setLoadingRequests(true);

        const data =
          (await apiRequest(
            API.friendRequests,
          )) as FriendRequestsResponse;

        if (cancelled) {
          return;
        }

        setRequests(
          data.requests ?? [],
        );
      } catch (error) {
        console.error(
          "Failed to load friend requests:",
          error,
        );

        if (!cancelled) {
          setStatusType("error");

          setStatusMessage(
            error instanceof Error
              ? error.message
              : "Unable to load friend requests.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingRequests(false);
        }
      }
    }

    void loadFriendRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  const incomingRequests =
    useMemo(
      () =>
        requests.filter(
          (request) =>
            request.direction ===
              "incoming" &&
            request.status ===
              "pending" &&
            Boolean(request.sender),
        ),
      [requests],
    );

  const outgoingRequests =
    useMemo(
      () =>
        requests.filter(
          (request) =>
            request.direction ===
              "outgoing" &&
            request.status ===
              "pending" &&
            Boolean(request.recipient),
        ),
      [requests],
    );

  const filteredFriends =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return localFriends;
      }

      return localFriends.filter(
        (friend) => {
          const name =
            friend.display_name
              ?.toLowerCase() ?? "";

          const username =
            friend.username
              ?.toLowerCase() ?? "";

          const interest =
            friend.featured_interest
              ?.toLowerCase() ?? "";

          return (
            name.includes(query) ||
            username.includes(query) ||
            interest.includes(query)
          );
        },
      );
    }, [localFriends, search]);

  function showStatus(
    message: string,
    type:
      | "info"
      | "success"
      | "error" = "info",
  ) {
    setStatusType(type);
    setStatusMessage(message);
  }

  async function refreshFriends() {
    try {
      const data =
        (await apiRequest(
          "/api/friends",
        )) as FriendsResponse;

      setLocalFriends(
        data.friends ?? [],
      );
    } catch (error) {
      console.error(
        "Failed to refresh friends:",
        error,
      );

      showStatus(
        error instanceof Error
          ? error.message
          : "Unable to refresh friends.",
        "error",
      );
    }
  }

  async function refreshRequests() {
    try {
      const data =
        (await apiRequest(
          API.friendRequests,
        )) as FriendRequestsResponse;

      setRequests(
        data.requests ?? [],
      );
    } catch (error) {
      console.error(
        "Failed to refresh friend requests:",
        error,
      );
    }
  }

  async function handleIncomingAction(
    request: FriendRequest,
    action:
      | "accept"
      | "decline",
  ) {
    if (requestActionId) {
      return;
    }

    setStatusMessage(null);
    setRequestActionId(request.id);

    try {
      await apiRequest(
        API.friendRequests,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            request_id:
              request.id,
            action,
          }),
        },
      );

      setRequests(
        (currentRequests) =>
          currentRequests.filter(
            (currentRequest) =>
              currentRequest.id !==
              request.id,
          ),
      );

      if (
        action === "accept"
      ) {
        await refreshFriends();

        showStatus(
          "Friend request accepted. You are now friends.",
          "success",
        );
      } else {
        showStatus(
          "Friend request declined.",
          "success",
        );
      }
    } catch (error) {
      console.error(
        `Failed to ${action} friend request:`,
        error,
      );

      showStatus(
        error instanceof Error
          ? error.message
          : action === "accept"
            ? "Unable to accept the friend request."
            : "Unable to decline the friend request.",
        "error",
      );

      await refreshRequests();
    } finally {
      setRequestActionId(null);
    }
  }

  async function handleCancelRequest(
    request: FriendRequest,
  ) {
    if (requestActionId) {
      return;
    }

    setRequestActionId(
      request.id,
    );
    setStatusMessage(null);

    try {
      await apiRequest(
        API.friendRequests,
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            request_id:
              request.id,
          }),
        },
      );

      setRequests(
        (currentRequests) =>
          currentRequests.filter(
            (currentRequest) =>
              currentRequest.id !==
              request.id,
          ),
      );

      showStatus(
        "Friend request cancelled.",
        "success",
      );
    } catch (error) {
      console.error(
        "Failed to cancel friend request:",
        error,
      );

      showStatus(
        error instanceof Error
          ? error.message
          : "Unable to cancel the friend request.",
        "error",
      );

      await refreshRequests();
    } finally {
      setRequestActionId(null);
    }
  }

  return (
    <section className="view-panel">
      <Eyebrow>
        Your connections
      </Eyebrow>

      <h1>Friends</h1>

      <p className="section-copy">
        Friendship begins when both
        people choose it.
      </p>

      {statusMessage && (
        <div
          className={`status-message ${statusType}`}
        >
          <Icon
            name={
              statusType === "error"
                ? "alert-circle"
                : statusType ===
                    "success"
                  ? "check-circle"
                  : "info"
            }
            size={18}
          />

          <p>{statusMessage}</p>

          <button
            type="button"
            onClick={() =>
              setStatusMessage(null)
            }
            aria-label="Dismiss message"
          >
            <Icon
              name="x"
              size={16}
            />
          </button>
        </div>
      )}

      {!loadingRequests &&
        incomingRequests.length >
          0 && (
          <section className="friend-requests-section">
            <div className="section-heading">
              <div>
                <Eyebrow>
                  Requests
                </Eyebrow>

                <h2>
                  Friend requests
                </h2>
              </div>

              <span className="request-count">
                {
                  incomingRequests.length
                }
              </span>
            </div>

            <div className="friend-requests-list">
              {incomingRequests.map(
                (request) => {
                  const sender =
                    request.sender;

                  if (!sender) {
                    return null;
                  }

                  const processing =
                    requestActionId ===
                    request.id;

                  return (
                    <article
                      className="friend-request-card"
                      key={request.id}
                    >
                      <Avatar
                        profile={sender}
                      />

                      <div className="friend-request-content">
                        <h3>
                          {
                            sender.display_name
                          }
                        </h3>

                        {sender.username && (
                          <p className="friend-request-username">
                            @
                            {
                              sender.username
                            }
                          </p>
                        )}

                        {sender.featured_interest && (
                          <p>
                            {
                              sender.featured_interest
                            }
                          </p>
                        )}

                        <p>
                          Wants to be
                          your friend.
                        </p>
                      </div>

                      <div className="friend-request-actions">
                        <button
                          type="button"
                          className="button lavender"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            handleIncomingAction(
                              request,
                              "accept",
                            )
                          }
                        >
                          {processing
                            ? "..."
                            : "Accept"}
                        </button>

                        <button
                          type="button"
                          className="button secondary"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            handleIncomingAction(
                              request,
                              "decline",
                            )
                          }
                        >
                          Decline
                        </button>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          </section>
        )}

      {!loadingRequests &&
        outgoingRequests.length >
          0 && (
          <section className="friend-requests-section outgoing-requests">
            <div className="section-heading">
              <div>
                <Eyebrow>
                  Sent
                </Eyebrow>

                <h2>
                  Sent requests
                </h2>
              </div>

              <span className="request-count">
                {
                  outgoingRequests.length
                }
              </span>
            </div>

            <div className="friend-requests-list">
              {outgoingRequests.map(
                (request) => {
                  const recipient =
                    request.recipient;

                  if (!recipient) {
                    return null;
                  }

                  const processing =
                    requestActionId ===
                    request.id;

                  return (
                    <article
                      className="friend-request-card"
                      key={request.id}
                    >
                      <Avatar
                        profile={
                          recipient
                        }
                      />

                      <div className="friend-request-content">
                        <h3>
                          {
                            recipient.display_name
                          }
                        </h3>

                        {recipient.username && (
                          <p className="friend-request-username">
                            @
                            {
                              recipient.username
                            }
                          </p>
                        )}

                        <p>
                          Waiting for
                          their
                          response.
                        </p>
                      </div>

                      <div className="friend-request-actions">
                        <span className="request-status">
                          Request sent
                        </span>

                        <button
                          type="button"
                          className="button secondary"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            handleCancelRequest(
                              request,
                            )
                          }
                        >
                          {processing
                            ? "..."
                            : "Cancel"}
                        </button>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          </section>
        )}

      <div className="search-field">
        <label htmlFor="friend-search">
          Search friends
        </label>

        <div className="search-input-wrap">
          <Icon
            name="search"
            size={20}
          />

          <input
            id="friend-search"
            type="search"
            value={search}
            onChange={(event) =>
              onSearch(
                event.target.value,
              )
            }
            placeholder="Search friends"
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                onSearch("")
              }
              aria-label="Clear friend search"
            >
              <Icon
                name="x"
                size={18}
              />
            </button>
          )}
        </div>
      </div>

      {!filteredFriends.length ? (
        <div className="empty-banner">
          <Icon
            name="heart"
            size={30}
          />

          <p>
            {search
              ? "No friends match that name."
              : "No accepted friends yet. When someone accepts your request, they will appear here."}
          </p>
        </div>
      ) : (
        <div className="friends-grid">
          {filteredFriends.map(
            (friend) => (
              <article
                className="friend-card"
                key={
                  friend.profile_id
                }
              >
                <Avatar
                  profile={friend}
                />

                <div>
                  <h2>
                    {
                      friend.display_name
                    }
                  </h2>

                  {friend.username && (
                    <p>
                      @
                      {
                        friend.username
                      }
                    </p>
                  )}

                  {friend.featured_interest && (
                    <p>
                      {
                        friend.featured_interest
                      }
                    </p>
                  )}

                  <p className="request-status">
                    Friends
                  </p>
                </div>

                <button
                  type="button"
                  className="button lavender"
                  onClick={() =>
                    onOpenMessage(
                      friend,
                    )
                  }
                >
                  Message
                </button>
              </article>
            ),
          )}
        </div>
      )}
    </section>
  );
}