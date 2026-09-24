const API_BASE = process.env.NEXT_PUBLIC_URL_SERVICE_URL ?? "https://url.devslix.com/api";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://playground.devslix.com";

export interface PlaygroundStateData {
  projectName: string;
  html: string;
  css: string;
  js: string;
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

function playgroundLongURL(id: string): string {
  return `${SITE_URL}/?playgroundId=${id}`;
}

function buildUrlState(data: PlaygroundStateData): PlaygroundUrlState {
  return { type: "playground", version: 1, data };
}

async function request(path: string, init?: RequestInit): Promise<UrlRecord> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // A bare 204/empty response has no JSON body — that's fine.
  }

  if (!res.ok) {
    const errors = (body as { errors?: { message?: string }[] } | null)?.errors;
    const message =
      errors?.[0]?.message ??
      (body as { message?: string } | null)?.message ??
      `Request failed (${res.status})`;
    throw new PlaygroundApiError(message);
  }

  // Payload wraps create/update/delete responses as { message, doc };
  // find-by-id returns the document directly. Handle both.
  const doc = (body as { doc?: UrlRecord } | null)?.doc ?? (body as UrlRecord);
  return doc;
}

/** Creates a fresh record. longURL is a placeholder here — Share fills in
 * the real value once the id exists (see updatePlaygroundUrl below). */
export async function createPlaygroundUrl(data: PlaygroundStateData): Promise<UrlRecord> {
  return request("/urls", {
    method: "POST",
    body: JSON.stringify({ longURL: SITE_URL, urlState: buildUrlState(data) }),
  });
}

/** Updates the same record's code and points longURL at this playground's
 * own share URL. Called every time Share is clicked (idempotent). */
export async function updatePlaygroundUrl(
  id: string,
  data: PlaygroundStateData,
): Promise<UrlRecord> {
  return request(`/urls/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ longURL: playgroundLongURL(id), urlState: buildUrlState(data) }),
  });
}

export async function getPlaygroundUrl(id: string): Promise<UrlRecord> {
  return request(`/urls/${id}`);
}

export async function deletePlaygroundUrl(id: string): Promise<void> {
  await request(`/urls/${id}`, { method: "DELETE" });
}