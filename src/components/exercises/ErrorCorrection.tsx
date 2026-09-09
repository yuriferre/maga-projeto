import type { Exercise } from "../../../shared/schema.ts";
import type { ExerciseResponse } from "../../../shared/scoring.ts";

type Props = { exercise: Extract<Exercise, { type: "error_correction" }>; value: ExerciseResponse | undefined; onChange(v: ExerciseResponse): void; disabled: boolean };

export function ErrorCorrection({ exercise, value, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-900 line-through decoration-rose-400">{exercise.prompt}</p>
      <input
        className="w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        placeholder="Escreva a versão correta"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus
      />
    </div>
  );
}
