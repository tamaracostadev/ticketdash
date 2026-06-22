import { TriangleAlert } from "lucide-react";

interface ErrorStateProps {
  messages: string[];
}

export function ErrorState({ messages }: ErrorStateProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-200">
      <h2 className="flex items-center gap-2 font-semibold">
        <TriangleAlert size={18} /> Unable to load some dashboard data
      </h2>
      <ul className="mt-2 list-inside list-disc text-sm text-rose-100/80">
        {messages.map((message) => <li key={message}>{message}</li>)}
      </ul>
    </section>
  );
}
