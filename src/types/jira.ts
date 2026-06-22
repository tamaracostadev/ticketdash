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
  maxResults: number;
  startAt: number;
  total: number;
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
