import { useCallback, useMemo, useState } from "react";

const STORAGE_KEY = "jira-github-dashboard:dismissed-warnings";

function readDismissedWarnings(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeDismissedWarnings(codes: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

export function useDismissedWarnings() {
  const [dismissedCodes, setDismissedCodes] = useState<string[]>(() =>
    readDismissedWarnings()
  );

  const dismissedSet = useMemo(
    () => new Set(dismissedCodes),
    [dismissedCodes],
  );

  const dismiss = useCallback((code: string) => {
    setDismissedCodes((current) => {
      if (current.includes(code)) {
        return current;
      }

      const next = [...current, code];
      writeDismissedWarnings(next);
      return next;
    });
  }, []);

  return {
    dismiss,
    dismissedSet,
  };
}
