import type { Exercise } from "../../../shared/schema.ts";
import type { ExerciseResponse } from "../../../shared/scoring.ts";

type Props = { exercise: Extract<Exercise, { type: "free_text" }>; value: ExerciseResponse | undefined; onChange(v: ExerciseResponse): void; disabled: boolean };

export function FreeText({ exercise, value, onChange, disabled }: Props) {
  const text = typeof value === "string" ? value : "";
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="space-y-1">
      <textarea className="min-h-32 w-full rounded border border-slate-300 p-3 focus:border-indigo-500 focus:outline-none" value={text} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      <div className="text-right text-xs text-slate-500">{words} palavra(s){exercise.minWords ? ` · mínimo ${exercise.minWords}` : ""}</div>
    </div>
  );
}
