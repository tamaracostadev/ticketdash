import type { IsoTimestamp } from "./persistence";

export type GitHubMergeable = "MERGEABLE" | "CONFLICTING" | "UNKNOWN";

export type GitHubReviewDecision =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REVIEW_REQUIRED"
  | null;

export interface GitHubActor {
  login: string;
}

export interface GitHubReviewComment {
  author: GitHubActor | null;
  createdAt: IsoTimestamp;
}

export interface GitHubReviewThread {
  comments: {
    nodes: GitHubReviewComment[];
  };
  isOutdated: boolean;
  isResolved: boolean;
}

export interface GitHubRepository {
  name: string;
  owner: GitHubActor;
}

export interface GitHubCommitNode {
  commit: {
    committedDate: IsoTimestamp;
  };
}

export interface GitHubPR {
  author?: GitHubActor | null;
  changesRequestedReviews?: {
    nodes: Array<{
      submittedAt: IsoTimestamp;
    }>;
  };
  headRefName: string;
  isDraft: boolean;
  latestOpinionatedReviews?: {
    nodes: Array<{
      author: GitHubActor | null;
      state: Exclude<GitHubReviewDecision, null | "REVIEW_REQUIRED">;
      submittedAt: IsoTimestamp;
    }>;
  };
  latestCommits?: {
    nodes: GitHubCommitNode[];
  };
  mergeable: GitHubMergeable;
  number: number;
  repository: GitHubRepository;
  reviewDecision: GitHubReviewDecision;
  reviewRequests?: {
    totalCount: number;
  };
  searchContexts?: {
    authored?: boolean;
    reviewed?: boolean;
    reviewRequested?: boolean;
  };
  reviewThreads: {
    nodes: GitHubReviewThread[];
  };
  title: string;
  updatedAt?: IsoTimestamp;
  url: string;
}

export interface GitHubSearchResponse {
  data?: {
    authored: {
      nodes: Array<GitHubPR | null>;
    };
    reviewed: {
      nodes: Array<GitHubPR | null>;
    };
    reviewRequested: {
      nodes: Array<GitHubPR | null>;
    };
  };
  errors?: Array<{
    message: string;
  }>;
}

export interface GitHubWarning {
  code: "review-queue-access-limited";
  message: string;
}

export interface GitHubPRResponsePayload {
  prs: GitHubPR[];
  warnings: GitHubWarning[];
}
