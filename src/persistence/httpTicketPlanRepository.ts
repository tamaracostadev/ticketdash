import type { TicketPlan, TicketPlansByKey } from "../types/planning";
import { parseTicketPlans } from "../utils/ticketPlanValidation";
import type { TicketPlanRepository } from "./ticketPlanRepository";

export interface TicketPlanImporter {
  import(plans: TicketPlansByKey): Promise<void>;
}

async function request(
  path: string,
  init?: RequestInit,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const response = await fetcher(path, init);
  if (response.ok) return response;

  let message = "Planning persistence unavailable.";
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string") message = body.message;
  } catch {
    // Keep the public fallback when the API does not return JSON.
  }
  throw new Error(message);
}

export class HttpTicketPlanRepository
implements TicketPlanRepository, TicketPlanImporter {
  public constructor(private readonly fetcher: typeof fetch = fetch) {}

  public async clear(): Promise<void> {
    await request("/api/planning/ticket-plans", { method: "DELETE" }, this.fetcher);
  }

  public async import(plans: TicketPlansByKey): Promise<void> {
    await request("/api/planning/ticket-plans/import", {
      body: JSON.stringify(plans),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }, this.fetcher);
  }

  public async load(): Promise<TicketPlansByKey> {
    const response = await request(
      "/api/planning/ticket-plans",
      undefined,
      this.fetcher,
    );
    const body: unknown = await response.json();
    const plans = parseTicketPlans(body);
    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      Object.keys(body).length !== Object.keys(plans).length
    ) {
      throw new Error("Planning persistence returned invalid data.");
    }
    return plans;
  }

  public async remove(ticketKey: string): Promise<void> {
    await request(
      `/api/planning/ticket-plans/${encodeURIComponent(ticketKey.toUpperCase())}`,
      { method: "DELETE" },
      this.fetcher,
    );
  }

  public async reorder(ticketKeys: string[]): Promise<void> {
    await request(
      "/api/planning/ticket-plans/reorder",
      {
        body: JSON.stringify({ ticketKeys: ticketKeys.map((key) => key.toUpperCase()) }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      this.fetcher,
    );
  }

  public async save(plan: TicketPlan): Promise<void> {
    const ticketKey = plan.ticketKey.toUpperCase();
    await request(
      `/api/planning/ticket-plans/${encodeURIComponent(ticketKey)}`,
      {
        body: JSON.stringify({ ...plan, ticketKey }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
      this.fetcher,
    );
  }
}
