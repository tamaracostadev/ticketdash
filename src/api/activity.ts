import type {
  ActivityEvent,
  ActivityObservationInput,
  ActivityStateByTicket,
} from "../types/activity";
import { parseActivityStates } from "../utils/activityValidation";

async function readJson(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      typeof (body as Record<string, unknown>).message === "string"
        ? String((body as Record<string, unknown>).message)
        : "Activity persistence unavailable.";
    throw new Error(message);
  }
  return body;
}

export async function captureActivity(
  observations: ActivityObservationInput[],
  request: typeof fetch = fetch,
): Promise<void> {
  const response = await request("/api/activity/capture", {
    body: JSON.stringify(observations),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) await readJson(response);
}

export async function fetchActivityStates(
  request: typeof fetch = fetch,
): Promise<ActivityStateByTicket> {
  const parsed = parseActivityStates(
    await readJson(await request("/api/activity/state")),
  );
  if (parsed === null) throw new Error("Activity state returned invalid data.");
  return parsed;
}

export async function fetchTicketTimeline(
  ticketKey: string,
  request: typeof fetch = fetch,
): Promise<ActivityEvent[]> {
  const body = await readJson(
    await request(
      `/api/activity/tickets/${encodeURIComponent(ticketKey)}/timeline`,
    ),
  );
  if (!Array.isArray(body)) throw new Error("Timeline returned invalid data.");
  return body as ActivityEvent[];
}
