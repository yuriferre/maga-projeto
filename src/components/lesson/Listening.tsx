import { useEffect, useMemo, useRef, useState } from "react";
import type { Block, Exercise } from "../../../shared/schema.ts";
import { loadVoices, pickVoice, speak, stopSpeaking, isSpeechSynthesisSupported } from "../../lib/speech.ts";
import { Button } from "../ui/Button.tsx";
import { ExerciseList } from "../exercises/ExerciseList.tsx";
import type { FeedbackMode } from "../exercises/ExerciseRunner.tsx";
import { speakerIndexes } from "./Dialogue.tsx";

type Line = { speaker: string; text: string; note?: string };
type Props = { lessonId: string; block: Block; lines: Line[]; questions: Exercise[]; feedback?: FeedbackMode; initialAnswered?: string[]; onFinished?(): void };

export function Listening({ lessonId, block, lines, questions, feedback = "immediate", initialAnswered, onFinished }: Props) {
  const [rate, setRate] = useState(0.95);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [plays, setPlays] = useState(0);
  const indexes = useMemo(() => speakerIndexes(lines), [lines]);
  // Token da execução atual: incrementar cancela qualquer playAll em andamento.
  const runId = useRef(0);
  useEffect(() => () => { runId.current++; stopSpeaking(); }, []);

  const playAll = async () => {
    if (playing) { runId.current++; stopSpeaking(); setPlaying(false); return; }
    const myRun = ++runId.current;
    setPlaying(true);
    setPlays((p) => p + 1);
    const voices = await loadVoices();
    try {
      for (const line of lines) {
        if (runId.current !== myRun) return;
        await speak(line.text, { voice: pickVoice(voices, indexes.get(line.speaker) ?? 0), rate });
      }
    } finally {
      if (runId.current === myRun) setPlaying(false);
    }
  };

  const canReveal = feedback === "immediate";

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Compreensão auditiva</h2>
      <p className="text-sm text-slate-600">Ouça as {lines.length} fala(s) sem ler. Pode repetir e reduzir a velocidade.{canReveal ? " A transcrição aparece depois das perguntas." : ""}</p>
      <div className="flex flex-wrap items-center gap-3">
        {isSpeechSynthesisSupported() ? <Button onClick={playAll}>{playing ? "◼ Parar" : plays === 0 ? "▶ Ouvir" : "▶ Ouvir de novo"}</Button> : <span className="text-sm text-rose-700">Áudio indisponível neste navegador.</span>}
        <label className="flex items-center gap-2 text-sm text-slate-600">Velocidade <input type="range" min={0.7} max={1.1} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} /> {rate.toFixed(2)}×</label>
        <span className="text-xs text-slate-500">{plays} reprodução(ões)</span>
      </div>
      <ExerciseList lessonId={lessonId} block={block} exercises={questions} feedback={feedback} initialAnswered={initialAnswered} onFinished={() => { setRevealed(true); onFinished?.(); }} />
      {canReveal && (revealed || !isSpeechSynthesisSupported()) && (
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <h3 className="text-sm font-medium text-slate-600">Transcrição</h3>
          <ol className="mt-2 space-y-2 text-sm">{lines.map((l, i) => <li key={i}><span className="font-medium text-slate-600">{l.speaker}:</span> {l.text}</li>)}</ol>
        </div>
      )}
      {canReveal && !revealed && isSpeechSynthesisSupported() && <Button variant="ghost" onClick={() => setRevealed(true)}>Mostrar transcrição agora</Button>}
    </section>
  );
}
