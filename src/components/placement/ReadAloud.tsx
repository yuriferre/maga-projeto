import { useEffect, useRef, useState } from "react";
import { wordOverlap } from "../../../shared/speech-compare.ts";
import { isRecognitionSupported, startRecognition } from "../../lib/speech.ts";
import type { ReadAloudEntry } from "../../lib/api.ts";
import { Button } from "../ui/Button.tsx";

type Props = { sentences: string[]; entries: ReadAloudEntry[]; onChange(entries: ReadAloudEntry[]): void };

/** Leitura em voz alta: uma frase por vez, transcrição editável, % de palavras reconhecidas. */
export function ReadAloud({ sentences, entries, onChange }: Props) {
  const supported = isRecognitionSupported();
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handle = useRef<{ stop(): void } | null>(null);

  const stop = () => { handle.current?.stop(); handle.current = null; setRecordingIndex(null); };
  useEffect(() => () => stop(), []);

  const setTranscript = (i: number, transcript: string) => {
    const next = sentences.map((target, j) => ({ target, transcript: j === i ? transcript : entries[j]?.transcript ?? "" }));
    onChange(next);
  };

  const start = (i: number) => {
    setError(null);
    setTranscript(i, "");
    handle.current = startRecognition({
      onResult: (t) => setTranscript(i, t),
      onEnd: () => stop(),
      onError: (msg) => { setError(msg); stop(); },
    });
    setRecordingIndex(i);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Leia em voz alta</h3>
      {!supported && <p className="text-sm text-rose-700">Reconhecimento de fala indisponível. Use o Google Chrome ou digite o que você leu.</p>}
      <ol className="space-y-3">
        {sentences.map((target, i) => {
          const transcript = entries[i]?.transcript ?? "";
          const pct = transcript ? Math.round(wordOverlap(transcript, target) * 100) : null;
          const recording = recordingIndex === i;
          return (
            <li key={i} className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-base">{i + 1}. {target}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {supported && <Button variant={recording ? "secondary" : "primary"} disabled={recordingIndex !== null && !recording} onClick={() => (recording ? stop() : start(i))}>{recording ? "◼ Parar" : transcript ? "● Regravar" : "● Gravar"}</Button>}
                {pct !== null && <span className={`text-sm ${pct >= 80 ? "text-emerald-700" : "text-amber-700"}`}>{pct}% das palavras reconhecidas</span>}
              </div>
              <input className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm" value={transcript} onChange={(e) => setTranscript(i, e.target.value)} placeholder="Transcrição" />
            </li>
          );
        })}
      </ol>
      {error && <p className="text-sm text-rose-700">{error}</p>}
    </div>
  );
}
