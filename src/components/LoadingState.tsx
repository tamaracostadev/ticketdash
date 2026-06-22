import { LoaderCircle } from "lucide-react";

export function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-slate-300">
      <LoaderCircle className="animate-spin text-sky-300" size={20} />
      Loading dashboard...
    </div>
  );
}
