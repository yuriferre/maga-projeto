import type { Exercise } from "../../../shared/schema.ts";
import type { ExerciseResponse } from "../../../shared/scoring.ts";

type Props = { exercise: Extract<Exercise, { type: "fill_blank" }>; value: ExerciseResponse | undefined; onChange(v: ExerciseResponse): void; disabled: boolean };

export function FillBlank({ exercise, value, onChange, disabled }: Props) {
  const [before, after = ""] = exercise.prompt.split("___");
  return (
    <p className="text-lg leading-loose">
      {before}
      <input
        className="mx-1 inline-block w-48 rounded border border-slate-300 px-2 py-1 text-base focus:border-indigo-500 focus:outline-none"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus
        aria-label="resposta"
      />
      {after}
    </p>
  );
}
