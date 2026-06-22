export function isDemoMode(search: string): boolean {
  return new URLSearchParams(search).get("demo") === "true";
}

export function getCurrentDemoMode(): boolean {
  return typeof window !== "undefined" && isDemoMode(window.location.search);
}
