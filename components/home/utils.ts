export function initials(name: string) {
  return String(name || "myFolks")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export async function apiRequest(
  path: string,
  options: RequestInit = {},
): Promise<any> {
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error("request_failed");
  }

  const type = response.headers.get("content-type") || "";

  return type.includes("application/json")
    ? response.json()
    : {};
}
