import { useMemo, useState } from "react";
import type { Exercise } from "../../../shared/schema.ts";
import type { ExerciseResponse } from "../../../shared/scoring.ts";

type Props = { exercise: Extract<Exercise, { type: "reorder" }>; value: ExerciseResponse | undefined; onChange(v: ExerciseResponse): void; disabled: boolean };

/** Embaralha de forma determinística a partir do id (não muda a cada render). */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const a = items.map((v, i) => ({ v, i }));
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a.map((x) => x.v);
}

export function Reorder({ exercise, value, onChange, disabled }: Props) {
  const pool = useMemo(() => seededShuffle(exercise.tokens.map((t, i) => ({ t, i })), exercise.id), [exercise]);
  const [usedIdx, setUsedIdx] = useState<number[]>([]);
  const chosen = Array.isArray(value) ? value : [];

  const pick = (i: number) => { const next = [...usedIdx, i]; setUsedIdx(next); onChange(next.map((k) => exercise.tokens[k]!)); };
  const unpick = (pos: number) => { const next = usedIdx.filter((_, p) => p !== pos); setUsedIdx(next); onChange(next.map((k) => exercise.tokens[k]!)); };

  return (
    <div className="space-y-3">
      <div className="flex min-h-12 flex-wrap gap-2 rounded-md border border-dashed border-slate-300 p-2">
        {chosen.length === 0 && <span className="text-sm text-slate-400">Clique nas palavras na ordem certa.</span>}
        {usedIdx.map((k, pos) => (
          <button key={pos} type="button" disabled={disabled} onClick={() => unpick(pos)} className="rounded bg-indigo-600 px-3 py-1 text-white">{exercise.tokens[k]}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {pool.map(({ t, i }) => (
          <button key={i} type="button" disabled={disabled || usedIdx.includes(i)} onClick={() => pick(i)} className="rounded border border-slate-300 bg-white px-3 py-1 disabled:opacity-30">{t}</button>
        ))}
      </div>
    </div>
  );
}
