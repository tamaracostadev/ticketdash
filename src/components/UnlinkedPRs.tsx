import { GitPullRequest } from "lucide-react";

import type { GitHubPR } from "../types/github";
import { PRBadge } from "./PRBadge";

interface UnlinkedPRsProps {
  prs: GitHubPR[];
}

export function UnlinkedPRs({ prs }: UnlinkedPRsProps) {
  if (prs.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-white">PRs without active ticket</h2>
      <ul className="mt-3 grid gap-3 md:grid-cols-2">
        {prs.map((pr) => (
          <li className="rounded-xl border border-slate-800 bg-slate-900/60 p-4" key={pr.url}>
            <a className="flex items-start gap-3 text-slate-200 hover:text-white" href={pr.url} target="_blank" rel="noreferrer">
              <GitPullRequest className="mt-1 shrink-0 text-sky-300" size={18} />
              <span>
                <span className="block font-medium">{pr.repository.owner.login}/{pr.repository.name} #{pr.number}</span>
                <span className="mt-1 block text-sm text-slate-400">{pr.title}</span>
                <span className="mt-3 block"><PRBadge pr={pr} /></span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
