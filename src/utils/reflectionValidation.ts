import type {
  ReflectionDifficulty,
  ReflectionOutcome,
  TicketReflection,
  TicketReflectionsByKey,
} from "../types/reflections";
import { normalizeTicketKey } from "./ticketKeys.ts";

const DIFFICULTIES: Exclude<ReflectionDifficulty, null>[] = [
  "low",
  "medium",
  "high",
];
const OUTCOMES: Exclude<ReflectionOutcome, null>[] = [
  "done",
  "partial",
  "blocked",
  "dropped",
];
const MAX_TEXT_LENGTH = 1000;

function isOptionalMember<Value extends string>(
  value: unknown,
  members: Value[],
): value is Value | null {
  return value === null || (
    typeof value === "string" && members.includes(value as Value)
  );
}

function isReflectionText(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_TEXT_LENGTH;
}

export function normalizeTicketReflection(
  value: unknown,
): TicketReflection | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const reflection = value as Record<string, unknown>;
  const ticketKey = typeof reflection.ticketKey === "string"
    ? normalizeTicketKey(reflection.ticketKey)
    : null;
  if (
    ticketKey === null ||
    !isOptionalMember(reflection.difficulty, DIFFICULTIES) ||
    !isOptionalMember(reflection.outcome, OUTCOMES) ||
    !isReflectionText(reflection.blockers) ||
    !isReflectionText(reflection.learnings) ||
    !isReflectionText(reflection.notes)
  ) {
    return null;
  }

  return {
    blockers: reflection.blockers,
    difficulty: reflection.difficulty as ReflectionDifficulty,
    learnings: reflection.learnings,
    notes: reflection.notes,
    outcome: reflection.outcome as ReflectionOutcome,
    ticketKey,
  };
}

export function parseTicketReflections(value: unknown): TicketReflectionsByKey {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.values(value).reduce<TicketReflectionsByKey>(
    (reflections, rawReflection) => {
      const reflection = normalizeTicketReflection(rawReflection);
      if (reflection) reflections[reflection.ticketKey] = reflection;
      return reflections;
    },
    {},
  );
}
