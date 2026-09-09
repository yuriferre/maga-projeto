import type { Exercise } from "../../../shared/schema.ts";
import type { ExerciseResponse } from "../../../shared/scoring.ts";

type Props = { exercise: Extract<Exercise, { type: "translate" }>; value: ExerciseResponse | undefined; onChange(v: ExerciseResponse): void; disabled: boolean };

export function Translate({ exercise, value, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      <p className="rounded-md bg-slate-100 p-3 text-slate-800">🇧🇷 {exercise.prompt}</p>
      <input
        className="w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        placeholder="Em inglês…"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus
      />
    </div>
  );
}
