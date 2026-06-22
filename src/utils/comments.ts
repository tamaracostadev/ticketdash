import type { JiraComment, JiraIssue } from "../types/jira";
import type { IsoTimestamp, LastSeenByTicket } from "../types/persistence";
import { isAfter } from "./dates";

export function getLatestComment(issue: JiraIssue): JiraComment | null {
  return issue.fields.comment.comments.reduce<JiraComment | null>(
    (latest, comment) =>
      latest === null || isAfter(comment.updated, latest.updated)
        ? comment
        : latest,
    null,
  );
}

export function hasUnreadComment(
  issue: JiraIssue,
  lastSeen: LastSeenByTicket,
): boolean {
  const latestComment = getLatestComment(issue);

  if (latestComment === null) {
    return false;
  }

  const seenAt: IsoTimestamp | undefined = lastSeen[issue.key.toUpperCase()];
  return seenAt === undefined || isAfter(latestComment.updated, seenAt);
}
