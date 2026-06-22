import { Github, X } from "lucide-react";

interface DismissibleWarningProps {
  message: string;
  onDismiss: () => void;
}

export function DismissibleWarning({
  message,
  onDismiss,
}: DismissibleWarningProps) {
  return (
    <section className="flex items-start justify-between gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-100">
      <div className="flex gap-3">
        <Github className="mt-0.5 shrink-0 text-violet-300" size={18} />
        <p>{message}</p>
      </div>
      <button
        aria-label="Dismiss warning"
        className="rounded-full p-1 text-violet-200 hover:bg-violet-500/15 hover:text-white"
        type="button"
        onClick={onDismiss}
      >
        <X size={16} />
      </button>
    </section>
  );
}
