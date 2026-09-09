import { useCallback, useEffect, useState } from "react";
import { api } from "./api.ts";
import type { LessonProgressRow } from "../../server/repo.ts";

export function useOverview() {
  const [byLesson, setByLesson] = useState<Map<string, LessonProgressRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    api.overview()
      .then(({ lessons }) => { setByLesson(new Map(lessons.map((l) => [l.lesson_id, l]))); setError(null); })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { byLesson, loading, error, reload };
}
