import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import type { Lesson } from "../../../shared/schema.ts";
import { api, type LessonStatus } from "../../lib/api.ts";
import { Button } from "../ui/Button.tsx";

export function Completion({ lesson }: { lesson: Lesson }) {
  const [status, setStatus] = useState<LessonStatus | null>(null);
  const [cards, setCards] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => { api.lessonStatus(lesson.id).then(setStatus).catch((e: Error) => setError(e.message)); }, [lesson.id]);
  useEffect(load, [load]);

  const complete = async () => {
    try {
      const res = await api.completeLesson(lesson.id);
      setStatus(res);
      setCards(res.cardsInserted);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (error) return <p className="text-rose-700">{error}</p>;
  if (!status) return <p className="text-slate-500">Carregando…</p>;
  const c = status.completion;
  const done = status.progress?.status === "completed";

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Conclusão</h2>
      <ul className="space-y-1 text-sm">
        <li>{c.quizPct >= c.quizMin ? "✓" : "✗"} Quiz: {Math.round(c.quizPct * 100)}% (mínimo {Math.round(c.quizMin * 100)}%)</li>
        <li>{c.writingScore !== null && c.writingScore >= c.writingMin ? "✓" : "✗"} Escrita: {c.writingScore === null ? "não enviada" : `nota ${c.writingScore}`} (mínimo {c.writingMin})</li>
        <li>{!c.speakingRequired || c.speakingCount > 0 ? "✓" : "✗"} Fala: {c.speakingCount} gravação(ões){c.speakingRequired ? " (mínimo 1)" : ""}</li>
        <li>{c.cardsAdded ? "✓" : "•"} Cards no SRS: {c.cardsAdded ? `${lesson.srsCards.length} adicionados` : `${lesson.srsCards.length} serão adicionados ao concluir`}</li>
      </ul>
      {done ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4">
          <p className="font-medium text-emerald-900">Aula concluída{cards !== null ? ` · ${cards} card(s) adicionados` : ""}.</p>
          <Link to={`/modules/${lesson.module}`} className="mt-2 inline-block text-sm text-indigo-700 hover:underline">← Voltar ao módulo</Link>
        </div>
      ) : (
        <Button onClick={complete} disabled={!c.met}>{c.met ? "Concluir aula" : `Faltam: ${c.missing.join("; ")}`}</Button>
      )}
      <div>
        <h3 className="text-sm font-medium text-slate-600">Cards desta aula</h3>
        <ul className="mt-1 grid gap-1 text-sm sm:grid-cols-2">{lesson.srsCards.map((k, i) => <li key={i} className="rounded border border-slate-200 bg-white px-2 py-1"><span className="text-slate-500">{k.front}</span> → {k.back}</li>)}</ul>
      </div>
    </section>
  );
}
