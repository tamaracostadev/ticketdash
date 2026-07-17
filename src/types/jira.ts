import type { IsoTimestamp } from "./persistence";

export interface JiraUser {
  accountId: string;
  displayName: string;
}

export interface JiraComment {
  id: string;
  author: JiraUser;
  created: IsoTimestamp;
  updated: IsoTimestamp;
}

export interface JiraCommentsPage {
  comments: JiraComment[];
  maxResults: number;
  startAt: number;
  total: number;
}

export interface JiraStatusCategory {
  key: string;
  name: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  statusCategory: JiraStatusCategory;
}

export interface JiraIssueFields {
  comment: JiraCommentsPage;
  status: JiraStatus;
  summary: string;
  updated: IsoTimestamp;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
  isLast?: boolean;
  nextPageToken?: string;
}

export interface JiraDirectClosure {
  fromStatus: string;
  occurredAt: IsoTimestamp;
  ticketKey: string;
  toStatus: string;
}

export interface JiraChangelogItem {
  field: string;
  fromString: string | null;
  toString: string | null;
}

export interface JiraChangelogHistory {
  author: JiraUser;
  created: IsoTimestamp;
  items: JiraChangelogItem[];
}

export interface JiraChangelogResponse {
  maxResults: number;
  startAt: number;
  total: number;
  values: JiraChangelogHistory[];
}

export interface JiraTransitionStatus {
  id: string;
  name: string;
}

export interface JiraTransition {
  id: string;
  name: string;
  to: JiraTransitionStatus;
}

export interface JiraTransitionsResponse {
  transitions: JiraTransition[];
}

export interface JiraTransitionAssistantState {
  available: boolean;
  reason: string | null;
  transition: JiraTransition | null;
}
