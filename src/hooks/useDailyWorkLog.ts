import { useQuery } from "@tanstack/react-query";

import { fetchDailyWorkLog } from "../api/reports";

export function useDailyWorkLog(
  date: string,
  timezone: string,
) {
  return useQuery({
    queryFn: () => fetchDailyWorkLog(date, timezone),
    queryKey: ["reports", "daily-log", date, timezone],
  });
}
