import { useQuery } from "@tanstack/react-query";

import { createDemoDailyWorkLog } from "../demo/demoData";
import { getCurrentDemoMode } from "../demo/mode";
import { fetchDailyWorkLog } from "../api/reports";

export function useDailyWorkLog(
  date: string,
  timezone: string,
) {
  const demoMode = getCurrentDemoMode();
  return useQuery({
    queryFn: () =>
      demoMode
        ? Promise.resolve(createDemoDailyWorkLog(date, timezone))
        : fetchDailyWorkLog(date, timezone),
    queryKey: ["reports", demoMode ? "demo" : "live", "daily-log", date, timezone],
  });
}
