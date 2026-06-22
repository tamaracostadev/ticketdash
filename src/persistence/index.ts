export type { LastSeenRepository } from "./lastSeenRepository";
export type { TicketPlanRepository } from "./ticketPlanRepository";
export { HttpLastSeenRepository } from "./httpLastSeenRepository";
export { HttpTicketPlanRepository } from "./httpTicketPlanRepository";
export { LocalStorageLastSeenRepository } from "./localStorageLastSeenRepository";
export { LocalStorageTicketPlanRepository } from "./localStorageTicketPlanRepository";
export { MigratingLastSeenRepository } from "./migratingLastSeenRepository";
export { MigratingTicketPlanRepository } from "./migratingTicketPlanRepository";

import { HttpLastSeenRepository } from "./httpLastSeenRepository";
import { HttpTicketPlanRepository } from "./httpTicketPlanRepository";
import { LocalStorageLastSeenRepository } from "./localStorageLastSeenRepository";
import { LocalStorageTicketPlanRepository } from "./localStorageTicketPlanRepository";
import { MigratingLastSeenRepository } from "./migratingLastSeenRepository";
import { MigratingTicketPlanRepository } from "./migratingTicketPlanRepository";

export const lastSeenRepository = new MigratingLastSeenRepository(
  new HttpLastSeenRepository(),
  new LocalStorageLastSeenRepository(),
);
export const ticketPlanRepository = new MigratingTicketPlanRepository(
  new HttpTicketPlanRepository(),
  new LocalStorageTicketPlanRepository(),
);
