import { useEffect, useState } from "react";
import type { WritingSpec } from "../../../shared/schema.ts";
import type { WritingFeedback } from "../../../server/writing-feedback.ts";
import type { WritingRow } from "../../../server/repo.ts";
import { Button } from "../ui/Button.tsx";
import { Markdown } from "../ui/Markdown.tsx";

type Props = {
  spec: WritingSpec;
  fetchLatest(): Promise<WritingRow | null>;
  submit(body: { text: string; selfScore?: number }): Promise<{ id: number; feedback: WritingFeedback }>;
  /** Texto ao lado da nota salva, ex.: "mínimo 3". */
  minScoreLabel?: string;
  onSaved?(score: number | null): void;
};

export function Writing({ spec, fetchLatest, submit, minScoreLabel, onSaved }: Props) {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [selfScore, setSelfScore] = useState<number | "">("");
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const { minWords, maxWords } = spec;

  useEffect(() => {
    let cancelled = false;
    fetchLatest().then((submission) => {
      if (cancelled || !submission) return;
      setText(submission.text);
      setFeedback(JSON.parse(submission.feedback_json) as WritingFeedback);
      setSavedScore(submission.score);
    }).catch(() => undefined);
    return () => { cancelled = true; };
    // fetchLatest muda a cada render; buscamos uma vez por spec.
  }, [spec]);

  const send = async (score?: number) => {
    setBusy(true); setError(null);
    try {
      const res = await submit(score === undefined ? { text } : { text, selfScore: score });
      setFeedback(res.feedback);
      setSavedScore(res.feedback.score);
      onSaved?.(res.feedback.score);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Exercício de escrita</h2>
      <Markdown text={spec.prompt} />
      <ul className="text-sm text-slate-600">
        {spec.constraints.length > 0 && <li><span className="font-medium">Obrigatório:</span> {spec.constraints.map((c) => c.label).join(" · ")}</li>}
        <li><span className="font-medium">Rubrica:</span> {spec.rubric.join(" · ")}</li>
      </ul>
      <textarea className="min-h-40 w-full rounded border border-slate-300 p-3 focus:border-indigo-500 focus:outline-none" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva em inglês…" />
      <div className="flex items-center justify-between">
        <span className={`text-sm ${words >= minWords && words <= maxWords ? "text-emerald-700" : "text-slate-500"}`}>{words} palavras (meta {minWords}–{maxWords})</span>
        <Button onClick={() => send()} disabled={busy || words === 0}>{feedback ? "Enviar de novo" : "Enviar"}</Button>
      </div>
      {error && <p className="text-sm text-rose-700">{error}</p>}

      {feedback && (
        <div className="space-y-4 rounded-md border border-slate-200 bg-white p-4">
          <h3 className="font-medium">Correção {feedback.mode === "rules" && <span className="text-xs font-normal text-slate-500">(modo por regras — sem IA nesta etapa)</span>}</h3>
          <ul className="space-y-1 text-sm">
            <li>{feedback.withinLength ? "✓" : "✗"} Tamanho: {feedback.wordCount} palavras (meta {feedback.minWords}–{feedback.maxWords})</li>
            {feedback.constraints.map((c, i) => <li key={i}>{c.met === null ? "•" : c.met ? "✓" : "✗"} {c.label}</li>)}
          </ul>
          {feedback.findings.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium text-rose-800">Padrões de erro encontrados</h4>
              <ul className="mt-1 space-y-2 text-sm">
                {feedback.findings.map((f, i) => (
                  <li key={i} className="rounded border border-rose-200 bg-rose-50 p-2">
                    <div><span className="line-through decoration-rose-400">{f.match}</span> → <span className="font-medium text-emerald-800">{f.right}</span></div>
                    <div className="text-slate-600">{f.why} <span className="text-xs text-slate-400">[{f.tag}]</span></div>
                  </li>
                ))}
              </ul>
            </div>
          ) : <p className="text-sm text-emerald-700">✓ Nenhum padrão de erro do catálogo encontrado.</p>}
          <div>
            <h4 className="text-sm font-medium">Modelo de resposta</h4>
            <p className="mt-1 rounded bg-slate-50 p-3 text-sm text-slate-800">{feedback.model}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Compare com o modelo e avalie sua escrita pela rubrica:</span>
            <select className="rounded border border-slate-300 px-2 py-1" value={selfScore} onChange={(e) => setSelfScore(e.target.value === "" ? "" : Number(e.target.value))}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <Button variant="secondary" disabled={selfScore === "" || busy} onClick={() => send(Number(selfScore))}>Salvar nota</Button>
            {savedScore !== null && <span className="text-emerald-700">nota salva: {savedScore}/5{minScoreLabel ? ` (${minScoreLabel})` : ""}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
