import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { GRADE_BUTTONS, previewIntervals, type CardState } from "../../shared/sm2.ts";
import { api, type CardCounts, type CardRow } from "../lib/api.ts";
import { tagLabel } from "../lib/content.ts";
import { isSpeechSynthesisSupported, speak } from "../lib/speech.ts";
import { Badge } from "../components/ui/Badge.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Card } from "../components/ui/Card.tsx";
import { ProgressBar } from "../components/ui/ProgressBar.tsx";

const intervalLabel = (days: number) => (days === 0 ? "agora" : days === 1 ? "em 1 dia" : `em ${days} dias`);
const sourceLabel = (lessonId: string) => (lessonId === "glossary" ? "Glossário" : `Aula ${lessonId}`);
const toState = (c: CardRow): CardState => ({ ease: c.ease, intervalDays: c.interval_days, reps: c.reps, lapses: c.lapses });

export function Review() {
  const [queue, setQueue] = useState<CardRow[] | null>(null);
  const [counts, setCounts] = useState<CardCounts | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [again, setAgain] = useState(0);
  const [done, setDone] = useState(0);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Busca a fila e zera a rodada. */
  const load = useCallback(() => {
    setQueue(null); setIndex(0); setRevealed(false); setAgain(0); setDone(0); setFinished(false); setError(null);
    api.srsQueue().then((r) => { setQueue(r.cards); setCounts(r.counts); }).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const current = queue && !finished ? queue[index] : undefined;
  const preview = current ? previewIntervals(toState(current)) : null;

  const grade = useCallback(async (g: number) => {
    if (!current || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await api.srsReview(current.id, g);
      setCounts(res.counts);
      if (g < 3) setAgain((n) => n + 1);
      setDone((n) => n + 1);
      setRevealed(false);
      if (index + 1 >= (queue?.length ?? 0)) setFinished(true);
      else setIndex((i) => i + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [current, busy, index, queue]);

  // Atalhos: Espaço/Enter mostra o verso; 1–4 dão a nota.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) { e.preventDefault(); setRevealed(true); return; }
      if (revealed && /^[1-4]$/.test(e.key)) { e.preventDefault(); void grade(GRADE_BUTTONS[Number(e.key) - 1]!.grade); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, revealed, grade]);

  const header = counts && (
    <p className="text-sm text-slate-600">
      {counts.dueNow} para revisar · novos {counts.new} · aprendendo {counts.learning} · maduros {counts.mature}
    </p>
  );

  if (error && !queue) return <p className="text-rose-700">Servidor não respondeu ({error}).</p>;
  if (!queue || !counts) return <p className="text-slate-500">Carregando fila…</p>;

  if (queue.length === 0 || finished) {
    const nothingYet = counts.total === 0;
    const remaining = counts.dueNow;
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Revisão</h1>
        {header}
        <Card>
          {finished && <p className="text-lg font-medium">Rodada concluída: {done} card(s), {again} errado(s).</p>}
          {nothingYet
            ? <p className="mt-2 text-slate-600">Nenhum card ainda. Conclua uma aula ou adicione termos do glossário.</p>
            : remaining > 0
              ? <p className="mt-2 text-slate-600">{remaining} card(s) ainda vencido(s) (os errados voltam para a fila).</p>
              : <p className="mt-2 text-slate-600">Fila vazia. Próximo card: {counts.nextDue ? new Date(counts.nextDue).toLocaleDateString("pt-BR") : "—"}.</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            {remaining > 0 && <Button onClick={load}>Revisar os vencidos ({remaining})</Button>}
            <Link to="/" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100">Painel</Link>
            <Link to={nothingYet ? "/trilha" : "/glossary"} className="rounded-md px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">{nothingYet ? "Trilha" : "Glossário"}</Link>
          </div>
        </Card>
      </div>
    );
  }

  const card = current!;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Revisão</h1>
      {header}
      <ProgressBar value={done / queue.length} />
      <p className="text-xs text-slate-500">Card {index + 1} de {queue.length} · {sourceLabel(card.lesson_id)} · <Badge>{tagLabel(card.tag)}</Badge></p>
      <Card className="min-h-56">
        <p className="text-xs uppercase tracking-wide text-slate-500">Como você diria</p>
        <p className="mt-2 text-2xl">{card.front}</p>
        {revealed ? (
          <div className="mt-6 space-y-2 border-t border-slate-200 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-2xl font-medium text-indigo-800">{card.back}</p>
              {isSpeechSynthesisSupported() && <Button variant="ghost" onClick={() => { speak(card.back).catch(() => undefined); }}>▶ Ouvir</Button>}
            </div>
            {card.hint && <p className="text-sm text-slate-600">Dica: {card.hint}</p>}
          </div>
        ) : (
          <Button className="mt-6" onClick={() => setRevealed(true)}>Mostrar (Espaço)</Button>
        )}
      </Card>
      {revealed && preview && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GRADE_BUTTONS.map((b, i) => (
            <Button key={b.key} variant={b.key === "again" ? "secondary" : "primary"} disabled={busy} onClick={() => grade(b.grade)}>
              {b.label} <span className="text-xs opacity-80">· {intervalLabel(preview[b.key])} · {i + 1}</span>
            </Button>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-rose-700">Não foi possível salvar ({error}). Tente de novo.</p>}
    </div>
  );
}
