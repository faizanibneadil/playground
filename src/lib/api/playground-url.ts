const API_BASE = process.env.NEXT_PUBLIC_URL_SERVICE_URL ?? "https://url.devslix.com/api";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://playground.devslix.com";

export interface PlaygroundStateData {
  projectName: string;
  html: string;
  css: string;
  js: string;
  theory: string;
}

export interface PlaygroundUrlState {
  type: "playground";
  version: 1;
  data: PlaygroundStateData;
}

export interface UrlRecord {
  id: string;
  longURL: string;
  shortURL: string;
  shareable_url: string;
  urlState: PlaygroundUrlState | null;
}

export class PlaygroundApiError extends Error {}

function buildUrlState(data: PlaygroundStateData): PlaygroundUrlState {
  return { type: "playground", version: 1, data };
}

/** The value Save writes into longURL, and what Share's visibility is
 * checked against. Kept as one helper so the write side and the read
 * side can't drift apart. */
function shareableLongURL(shortURL: string): string {
    const url = new URL(SITE_URL);
    url.searchParams.set("shortURL", shortURL);
    url.searchParams.set("a", "r");
    return url.toString();
  }

/** True once longURL has actually been patched to embed this record's
 * own shortURL — false right after creation (longURL is still the bare
 * site URL then), true after the first Save. */
export function longUrlMatchesShortUrl(record: UrlRecord): boolean {
  try {
    return new URL(record.longURL).searchParams.get("shortURL") === record.shortURL;
  } catch {
    return false;
  }
}

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function extractErrorMessage(body: unknown, status: number): string {
  const errors = (body as { errors?: { message?: string }[] } | null)?.errors;
  return (
    errors?.[0]?.message ??
    (body as { message?: string } | null)?.message ??
    `Request failed (${status})`
  );
}

async function request(path: string, init?: RequestInit): Promise<UrlRecord> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await parseJson(res);

  if (!res.ok) {
    throw new PlaygroundApiError(extractErrorMessage(body, res.status));
  }

  // Payload wraps create/update/delete responses as { message, doc };
  // find-by-id returns the document directly. Handle both.
  return (body as { doc?: UrlRecord } | null)?.doc ?? (body as UrlRecord);
}

/** Creates a fresh record. longURL is left as the bare site URL —
 * intentionally does NOT embed shortURL yet, so Share stays locked
 * until an explicit Save. */
export async function createPlaygroundUrl(data: PlaygroundStateData): Promise<UrlRecord> {
  return request("/urls", {
    method: "POST",
    body: JSON.stringify({ longURL: SITE_URL, urlState: buildUrlState(data) }),
  });
}

/** Persists the latest code/theory/name and fixes longURL so it embeds
 * shortURL — this is what unlocks Share. */
export async function updatePlaygroundUrl(
  id: string,
  data: PlaygroundStateData,
  shortURL: string,
): Promise<UrlRecord> {
  return request(`/urls/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ longURL: shareableLongURL(shortURL), urlState: buildUrlState(data) }),
  });
}

export async function getPlaygroundUrlById(id: string): Promise<UrlRecord> {
  return request(`/urls/${id}`);
}

/** Used when a visitor arrives via the public share link and only has a
 * shortURL, not the internal id — looks the record up by its unique
 * shortURL field. Payload's list endpoint has a different response
 * shape ({ docs: [...] }), so this doesn't go through request(). */
export async function findPlaygroundUrlByShortURL(shortURL: string): Promise<UrlRecord | null> {
  const query = `where[shortURL][equals]=${encodeURIComponent(shortURL)}&limit=1`;
  const res = await fetch(`${API_BASE}/urls?${query}`);
  const body = await parseJson(res);

  if (!res.ok) {
    throw new PlaygroundApiError(extractErrorMessage(body, res.status));
  }

  const docs = (body as { docs?: UrlRecord[] } | null)?.docs ?? [];
  return docs[0] ?? null;
}

export async function deletePlaygroundUrl(id: string): Promise<void> {
  await request(`/urls/${id}`, { method: "DELETE" });
}