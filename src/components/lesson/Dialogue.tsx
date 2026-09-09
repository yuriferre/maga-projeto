import { useEffect, useMemo, useRef, useState } from "react";
import type { Lesson } from "../../../shared/schema.ts";
import { loadVoices, pickVoice, speak, stopSpeaking, isSpeechSynthesisSupported } from "../../lib/speech.ts";
import { Button } from "../ui/Button.tsx";
import { SpeakButton } from "./SpeakButton.tsx";

/** Índice de voz por falante (ordem de aparição), para que cada pessoa soe diferente. */
export function speakerIndexes(lines: { speaker: string }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const l of lines) if (!map.has(l.speaker)) map.set(l.speaker, map.size);
  return map;
}

export function Dialogue({ lesson }: { lesson: Lesson }) {
  const [rate, setRate] = useState(0.95);
  const [showText, setShowText] = useState(true);
  const [playingAll, setPlayingAll] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const indexes = useMemo(() => speakerIndexes(lesson.dialogue.lines), [lesson]);
  // Token da execução atual: incrementar cancela qualquer playAll em andamento.
  const runId = useRef(0);
  useEffect(() => () => { runId.current++; stopSpeaking(); }, []);

  const playAll = async () => {
    if (playingAll) { runId.current++; stopSpeaking(); setPlayingAll(false); setCurrent(null); return; }
    const myRun = ++runId.current;
    setPlayingAll(true);
    const voices = await loadVoices();
    try {
      for (let i = 0; i < lesson.dialogue.lines.length; i++) {
        if (runId.current !== myRun) return;
        const line = lesson.dialogue.lines[i]!;
        setCurrent(i);
        await speak(line.text, { voice: pickVoice(voices, indexes.get(line.speaker) ?? 0), rate });
      }
    } finally {
      if (runId.current === myRun) { setPlayingAll(false); setCurrent(null); }
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Diálogo</h2>
      <p className="text-sm text-slate-500">{lesson.dialogue.title}</p>
      <div className="flex flex-wrap items-center gap-3">
        {isSpeechSynthesisSupported() ? <Button onClick={playAll}>{playingAll ? "◼ Parar" : "▶ Ouvir tudo"}</Button> : <span className="text-sm text-rose-700">Áudio indisponível neste navegador.</span>}
        <label className="flex items-center gap-2 text-sm text-slate-600">Velocidade <input type="range" min={0.7} max={1.1} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} /> {rate.toFixed(2)}×</label>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} /> mostrar texto</label>
      </div>
      <ol className="space-y-2">
        {lesson.dialogue.lines.map((l, i) => (
          <li key={i} className={`rounded-md border p-3 ${current === i ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-600">{l.speaker}</span>
              <SpeakButton text={l.text} voiceIndex={indexes.get(l.speaker) ?? 0} rate={rate} small />
            </div>
            {showText && <p className="mt-1 text-slate-900">{l.text}</p>}
            {showText && l.note && <p className="mt-1 text-xs text-amber-800">{l.note}</p>}
          </li>
        ))}
      </ol>
      {lesson.dialogue.notes.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">{lesson.dialogue.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      )}
    </section>
  );
}
