import type { Exercise } from "../../../shared/schema.ts";
import type { ExerciseResponse } from "../../../shared/scoring.ts";

type Props = { exercise: Extract<Exercise, { type: "multiple_choice" }>; value: ExerciseResponse | undefined; onChange(v: ExerciseResponse): void; disabled: boolean };

export function MultipleChoice({ exercise, value, onChange, disabled }: Props) {
  return (
    <ul className="space-y-2">
      {exercise.options.map((opt, i) => (
        <li key={i}>
          <label className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${value === i ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"} ${disabled ? "cursor-default" : ""}`}>
            <input type="radio" name={exercise.id} checked={value === i} onChange={() => onChange(i)} disabled={disabled} />
            <span><span className="mr-2 text-slate-400">{String.fromCharCode(97 + i)})</span>{opt}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
