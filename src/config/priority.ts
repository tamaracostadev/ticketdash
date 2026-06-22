import type {
  AutomaticPriorityLevel,
  AutomaticPriorityReasonType,
} from "../types/priority";

export const PRIORITY_REASON_SCORES: Readonly<
  Record<Exclude<AutomaticPriorityReasonType, "open-threads">, number>
> = {
  "changes-requested": 90,
  "merge-conflict": 100,
  "rejected-by-qa": 60,
  "rejected-by-review": 60,
  "unread-comments": 30,
};

export const OPEN_THREAD_BASE_SCORE = 20;
export const OPEN_THREAD_ADDITIONAL_SCORE = 5;
export const OPEN_THREAD_MAX_SCORE = 40;

export const PRIORITY_LEVEL_MINIMUM_SCORE: Readonly<
  Record<Exclude<AutomaticPriorityLevel, "low">, number>
> = {
  high: 40,
  normal: 1,
  urgent: 80,
};
