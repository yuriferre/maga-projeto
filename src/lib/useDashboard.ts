import { useCallback, useEffect, useState } from "react";
import { api, type Dashboard } from "./api.ts";

export function useDashboard(days = 30) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    api.dashboard(days).then((d) => { setData(d); setError(null); }).catch((e: Error) => setError(e.message));
  }, [days]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, reload };
}
