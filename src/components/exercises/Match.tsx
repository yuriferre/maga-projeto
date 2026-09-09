import { useMemo } from "react";
import type { Exercise } from "../../../shared/schema.ts";
import type { ExerciseResponse } from "../../../shared/scoring.ts";

type Props = { exercise: Extract<Exercise, { type: "match" }>; value: ExerciseResponse | undefined; onChange(v: ExerciseResponse): void; disabled: boolean };

export function Match({ exercise, value, onChange, disabled }: Props) {
  const current = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const rights = useMemo(() => [...exercise.pairs.map((p) => p.right)].sort(), [exercise]);
  return (
    <ul className="space-y-2">
      {exercise.pairs.map((p) => (
        <li key={p.left} className="flex items-center gap-3">
          <span className="w-1/2 rounded bg-slate-100 px-3 py-2">{p.left}</span>
          <select className="w-1/2 rounded border border-slate-300 px-2 py-2" value={current[p.left] ?? ""} disabled={disabled} onChange={(e) => onChange({ ...current, [p.left]: e.target.value })}>
            <option value="">—</option>
            {rights.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </li>
      ))}
    </ul>
  );
}
