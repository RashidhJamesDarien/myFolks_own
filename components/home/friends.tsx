"use client";

import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import { Eyebrow } from "./Eyebrow";
import type { Profile } from "./types";

export function FriendsView({
  friends,
  search,
  onSearch,
  onOpenMessage,
}: {
  friends: Profile[];
  search: string;
  onSearch: (value: string) => void;
  onOpenMessage: (profile: Profile) => void;
}) {
  return (
    <section className="view-panel">
      <Eyebrow>Your connections</Eyebrow>

      <h1>Friends</h1>

      <p className="section-copy">
        Keep your connections intentional. Friendship begins
        only when both people choose it.
      </p>

      <div className="search-field">
        <label htmlFor="friend-search">
          Search friends
        </label>

        <div className="search-input-wrap">
          <Icon name="search" size={20} />

          <input
            id="friend-search"
            type="search"
            value={search}
            onChange={(event) =>
              onSearch(event.target.value)
            }
            placeholder="Search friends"
          />

          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label="Clear friend search"
            >
              <Icon name="x" size={18} />
            </button>
          )}
        </div>
      </div>

      {!friends.length ? (
        <div className="empty-banner">
          <Icon name="heart" size={30} />

          <p>
            {search
              ? "No friends match that name."
              : "No accepted friends yet. A connection begins only when both people choose it."}
          </p>
        </div>
      ) : (
        <div className="friends-grid">
          {friends.map((friend) => (
            <article
              className="friend-card"
              key={friend.profile_id}
            >
              <Avatar profile={friend} />

              <div>
                <h2>{friend.display_name}</h2>

                <p>{friend.featured_interest}</p>
              </div>

              <button
                type="button"
                className="button lavender"
                onClick={() =>
                  onOpenMessage(friend)
                }
              >
                Message
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
