import { DISCOVERY_ROUNDS } from "../constants";
import { shuffle } from "../utils";
import type { Profile } from "../types";

/** Flip to true while debugging the discovery queue. */
const DEBUG_DISCOVERY = false;

export function logDiscovery(
  label: string,
  payload?: unknown,
) {
  if (!DEBUG_DISCOVERY) return;

  console.log(`[myFolks discovery] ${label}`, payload);
}

function isUsableProfile(
  profile: Profile | undefined | null,
): profile is Profile {
  return Boolean(
    profile &&
      typeof profile.profile_id === "string" &&
      profile.profile_id.trim(),
  );
}

/**
 * Profiles that discovery is allowed to show.
 *
 * The API already strips existing relationships; this is a
 * client-side safety net for the current user and blocks.
 */
export function getDiscoveryEligibleProfiles(
  sourceProfiles: Profile[],
  options: {
    currentProfileId?: string;
    blockedProfiles?: Set<string>;
    excludedIds?: Set<string>;
  } = {},
) {
  const {
    currentProfileId,
    blockedProfiles = new Set<string>(),
    excludedIds = new Set<string>(),
  } = options;

  return sourceProfiles.filter((profile) => {
    if (!isUsableProfile(profile)) return false;

    if (
      currentProfileId &&
      profile.profile_id === currentProfileId
    ) {
      return false;
    }

    if (blockedProfiles.has(profile.profile_id)) {
      return false;
    }

    if (excludedIds.has(profile.profile_id)) {
      return false;
    }

    return true;
  });
}

/**
 * Deduplicate an API payload and drop the current user.
 */
export function normalizeDiscoverProfiles(
  rawProfiles: Profile[],
  options: {
    authUserId?: string;
    currentProfileId?: string;
  } = {},
) {
  const { authUserId, currentProfileId } = options;

  const unique = new Map<string, Profile>();

  for (const item of rawProfiles) {
    if (!isUsableProfile(item)) continue;
    if (authUserId && item.profile_id === authUserId) continue;

    if (
      currentProfileId &&
      item.profile_id === currentProfileId
    ) {
      continue;
    }

    if (!unique.has(item.profile_id)) {
      unique.set(item.profile_id, item);
    }
  }

  return Array.from(unique.values());
}

/**
 * Build the fixed-length discovery queue.
 *
 * Two eligible profiles are enough for six A-vs-B rounds.
 * Unique people are preferred before anyone is reused.
 *
 * Returns an empty array when a queue cannot be built.
 */
export function buildDiscoveryPairs(
  eligible: Profile[],
  rounds: number = DISCOVERY_ROUNDS,
): Profile[][] {
  if (eligible.length < 2) return [];

  const pool = shuffle([...eligible]);
  const pairs: Profile[][] = [];

  // First pass: prefer unique profiles.
  const firstPass = shuffle([...pool]);

  for (
    let cursor = 0;
    pairs.length < rounds && cursor + 1 < firstPass.length;
    cursor += 2
  ) {
    const [first, second] = [
      firstPass[cursor],
      firstPass[cursor + 1],
    ];

    if (first && second && first.profile_id !== second.profile_id) {
      pairs.push([first, second]);
    }
  }

  // Second pass: reuse profiles to guarantee a full session.
  const maxAttempts = Math.max(pool.length * 6, 12);

  for (
    let attempt = 0;
    pairs.length < rounds && attempt <= maxAttempts;
    attempt += 1
  ) {
    const first = pool[attempt % pool.length];
    const second = pool[(attempt + 1) % pool.length];

    if (first && second && first.profile_id !== second.profile_id) {
      pairs.push([first, second]);
    }
  }

  return pairs.slice(0, rounds);
}

/**
 * Message shown when discovery cannot build a session.
 */
export function describeEmptyDiscovery(
  apiProfileCount: number,
  eligibleCount: number,
): { text: string; type: "info" | "error" } {
  if (apiProfileCount === 0) {
    return {
      text: "The discovery API returned no profiles. Make sure at least two other users have created profiles.",
      type: "error",
    };
  }

  if (eligibleCount === 1) {
    return {
      text: "One profile is available, but myFolks needs at least two people to create an A-vs-B discovery round.",
      type: "info",
    };
  }

  return {
    text: "Profiles were returned, but none are currently available for discovery.",
    type: "info",
  };
}
