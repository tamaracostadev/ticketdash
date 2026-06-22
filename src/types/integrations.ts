export interface WorkflowStatusConfig {
  backlog: string[];
  codeReview: string[];
  development: string[];
  finalized: string[];
  release: string[];
  testing: string[];
}

export interface PublicDashboardConfig {
  githubUsername: string;
  projectKeys: string[];
  ticketKeyPrefixes: string[];
  workflowStatuses: WorkflowStatusConfig;
}

export interface IntegrationStatus {
  config: PublicDashboardConfig;
  github: boolean;
  jira: boolean;
}
