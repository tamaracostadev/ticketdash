import {
  OPEN_THREAD_ADDITIONAL_SCORE,
  OPEN_THREAD_BASE_SCORE,
  OPEN_THREAD_MAX_SCORE,
  PRIORITY_LEVEL_MINIMUM_SCORE,
  PRIORITY_REASON_SCORES,
} from "../config/priority";
import type {
  AutomaticPriorityLevel,
  AutomaticPriorityReason,
  TicketPriority,
} from "../types/priority";

export interface PrioritySignals {
  hasChangesRequested: boolean;
  hasConflict: boolean;
  hasUnreadComment: boolean;
  openThreadCount: number;
  rejectionReason: "rejected-by-qa" | "rejected-by-review" | null;
}

function getLevel(score: number): AutomaticPriorityLevel {
  if (score >= PRIORITY_LEVEL_MINIMUM_SCORE.urgent) return "urgent";
  if (score >= PRIORITY_LEVEL_MINIMUM_SCORE.high) return "high";
  if (score >= PRIORITY_LEVEL_MINIMUM_SCORE.normal) return "normal";
  return "low";
}

function getOpenThreadScore(count: number): number {
  if (count <= 0) return 0;
  return Math.min(
    OPEN_THREAD_BASE_SCORE + (count - 1) * OPEN_THREAD_ADDITIONAL_SCORE,
    OPEN_THREAD_MAX_SCORE,
  );
}

export function calculatePriority(signals: PrioritySignals): TicketPriority {
  const reasons: AutomaticPriorityReason[] = [];
  const add = (type: AutomaticPriorityReason["type"], score: number) => {
    if (score > 0) reasons.push({ score, type });
  };

  if (signals.hasConflict) {
    add("merge-conflict", PRIORITY_REASON_SCORES["merge-conflict"]);
  }
  if (signals.hasChangesRequested) {
    add("changes-requested", PRIORITY_REASON_SCORES["changes-requested"]);
  }
  if (signals.hasUnreadComment) {
    add("unread-comments", PRIORITY_REASON_SCORES["unread-comments"]);
  }
  if (signals.rejectionReason) {
    add(
      signals.rejectionReason,
      PRIORITY_REASON_SCORES[signals.rejectionReason],
    );
  }
  add("open-threads", getOpenThreadScore(signals.openThreadCount));

  const score = reasons.reduce((total, reason) => total + reason.score, 0);
  return { level: getLevel(score), reasons, score };
}
