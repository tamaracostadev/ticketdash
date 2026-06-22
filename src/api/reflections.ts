import type {
  TicketReflection,
  TicketReflectionsByKey,
} from "../types/reflections";
import {
  normalizeTicketReflection,
  parseTicketReflections,
} from "../utils/reflectionValidation";

async function request(
  path: string,
  init?: RequestInit,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const response = await fetcher(path, init);
  if (response.ok) return response;

  let message = "Reflection persistence unavailable.";
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string") message = body.message;
  } catch {
    // Keep the public fallback when the API does not return JSON.
  }
  throw new Error(message);
}

export async function fetchReflections(
  fetcher: typeof fetch = fetch,
): Promise<TicketReflectionsByKey> {
  const response = await request("/api/reflections", undefined, fetcher);
  const body: unknown = await response.json();
  const reflections = parseTicketReflections(body);
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    Object.keys(body).length !== Object.keys(reflections).length
  ) {
    throw new Error("Reflection persistence returned invalid data.");
  }
  return reflections;
}

export async function saveReflection(
  reflection: TicketReflection,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const normalized = normalizeTicketReflection(reflection);
  if (!normalized) throw new Error("Invalid reflection.");
  await request(
    `/api/reflections/${encodeURIComponent(normalized.ticketKey)}`,
    {
      body: JSON.stringify(normalized),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
    fetcher,
  );
}

export async function removeReflection(
  ticketKey: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  await request(
    `/api/reflections/${encodeURIComponent(ticketKey.toUpperCase())}`,
    { method: "DELETE" },
    fetcher,
  );
}
