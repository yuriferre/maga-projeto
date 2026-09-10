import { useEffect, useRef, useState } from "react";
import type { SpeakingModeA } from "../../../shared/schema.ts";
import type { SpeakingMetrics } from "../../../server/speaking-metrics.ts";
import { isRecognitionSupported, startRecognition } from "../../lib/speech.ts";
import { Button } from "../ui/Button.tsx";

type Props = {
  spec: SpeakingModeA;
  submit(body: { transcript: string; durationSec: number; selfConfidence?: number }): Promise<{ metrics: SpeakingMetrics }>;
  title?: string;
  onSubmitted?(metrics: SpeakingMetrics): void;
};

export function Speaking({ spec, submit: send, title = "Atividade de conversação (modo A)", onSubmitted }: Props) {
  const modeA = spec;
  const supported = isRecognitionSupported();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [durationSec, setDurationSec] = useState(0);
  const [confidence, setConfidence] = useState<number | "">("");
  const [metrics, setMetrics] = useState<SpeakingMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const handle = useRef<{ stop(): void } | null>(null);
  const timer = useRef<number | null>(null);

  const stop = () => {
    handle.current?.stop();
    handle.current = null;
    if (timer.current) { window.clearInterval(timer.current); timer.current = null; }
    setRecording(false);
  };
  useEffect(() => () => stop(), []);

  const start = () => {
    setError(null); setMetrics(null); setTranscript(""); setSeconds(0); setDurationSec(0);
    const startedAt = Date.now();
    handle.current = startRecognition({
      onResult: (t) => setTranscript(t),
      onEnd: () => { setDurationSec(Math.round((Date.now() - startedAt) / 1000)); stop(); },
      onError: (msg) => { setError(msg); stop(); },
    });
    setRecording(true);
    timer.current = window.setInterval(() => {
      const s = Math.round((Date.now() - startedAt) / 1000);
      setSeconds(s);
      setDurationSec(s);
      if (s >= modeA.maxSeconds + 10) stop();
    }, 500);
  };

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const res = await send({ transcript, durationSec, ...(confidence === "" ? {} : { selfConfidence: Number(confidence) }) });
      setMetrics(res.metrics);
      onSubmitted?.(res.metrics);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-slate-700">{modeA.prompt}</p>
      <details className="text-sm text-slate-600"><summary className="cursor-pointer font-medium">Expressões-alvo ({modeA.targetPhrases.length})</summary><p className="mt-1">{modeA.targetPhrases.join(" · ")}</p></details>
      {modeA.checklist.length > 0 && <ul className="list-disc pl-5 text-sm text-slate-600">{modeA.checklist.map((c, i) => <li key={i}>{c}</li>)}</ul>}

      <div className="flex flex-wrap items-center gap-3">
        {supported
          ? <Button onClick={recording ? stop : start} variant={recording ? "secondary" : "primary"}>{recording ? "◼ Parar" : "● Gravar"}</Button>
          : <span className="text-sm text-rose-700">Reconhecimento de fala indisponível. Use o Google Chrome ou digite a transcrição abaixo.</span>}
        <span className={`font-mono text-sm ${seconds > modeA.maxSeconds ? "text-rose-700" : "text-slate-600"}`}>{seconds}s / {modeA.maxSeconds}s</span>
      </div>

      <textarea className="min-h-28 w-full rounded border border-slate-300 p-3 text-slate-800 focus:border-indigo-500 focus:outline-none" value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder={supported ? "A transcrição aparece aqui enquanto você fala. Corrija o que o reconhecimento errou." : "Digite o que você diria."} />
      {(!supported || (transcript.trim().length > 0 && durationSec === 0 && !recording)) && (
        <>
          <label className="text-sm text-slate-600">Duração (s): <input type="number" className="ml-2 w-20 rounded border border-slate-300 px-2 py-1" value={durationSec} onChange={(e) => setDurationSec(Number(e.target.value))} /></label>
          <span className="ml-2 text-xs text-slate-500">informe quanto tempo levou para falar</span>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>Como você se sentiu?</span>
        <select className="rounded border border-slate-300 px-2 py-1" value={confidence} onChange={(e) => setConfidence(e.target.value === "" ? "" : Number(e.target.value))}>
          <option value="">—</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <Button onClick={submit} disabled={busy || recording || transcript.trim().length === 0 || durationSec <= 0}>Enviar gravação</Button>
      </div>
      {error && <p className="text-sm text-rose-700">{error}</p>}

      {metrics && (
        <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4 text-sm">
          <div className="text-lg font-medium">Nota: {metrics.score}/5</div>
          <div>{metrics.wordCount} palavras · {metrics.durationSec}s ({metrics.withinTime ? "dentro do tempo" : "acima do tempo"}) · {metrics.wpm} palavras/min {metrics.wpm >= 90 && metrics.wpm <= 170 ? "(ritmo bom)" : metrics.wpm < 90 ? "(devagar)" : "(rápido demais)"}</div>
          <div><span className="font-medium text-emerald-800">Expressões usadas ({metrics.used.length}):</span> {metrics.used.join(" · ") || "nenhuma"}</div>
          <div><span className="font-medium text-slate-600">Não usadas:</span> {metrics.missing.join(" · ")}</div>
          {metrics.findings.length > 0 && (
            <ul className="space-y-1">
              {metrics.findings.map((f, i) => <li key={i} className="rounded border border-rose-200 bg-rose-50 p-2"><span className="line-through decoration-rose-400">{f.match}</span> → <span className="font-medium text-emerald-800">{f.right}</span> <span className="text-slate-600">— {f.why}</span></li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
