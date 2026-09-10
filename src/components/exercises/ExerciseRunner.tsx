import { useState } from "react";
import type { Exercise } from "../../../shared/schema.ts";
import { checkExercise, type CheckResult, type ExerciseResponse } from "../../../shared/scoring.ts";
import { Button } from "../ui/Button.tsx";
import { MultipleChoice } from "./MultipleChoice.tsx";
import { FillBlank } from "./FillBlank.tsx";
import { ErrorCorrection } from "./ErrorCorrection.tsx";
import { Reorder } from "./Reorder.tsx";
import { Translate } from "./Translate.tsx";
import { Match } from "./Match.tsx";
import { FreeText } from "./FreeText.tsx";

const typeLabel: Record<Exercise["type"], string> = {
  multiple_choice: "Escolha a alternativa", fill_blank: "Complete", error_correction: "Corrija a frase",
  reorder: "Coloque em ordem", translate: "Traduza", match: "Associe", free_text: "Escreva",
};

export type FeedbackMode = "immediate" | "deferred";
type Props = { exercise: Exercise; onAnswered(result: CheckResult, response: ExerciseResponse): void; feedback?: FeedbackMode };

/** Resposta completa o suficiente para ser avaliada — evita registrar tentativa incompleta como erro. */
export function isResponseComplete(exercise: Exercise, value: ExerciseResponse | undefined): value is ExerciseResponse {
  if (value === undefined) return false;
  switch (exercise.type) {
    case "multiple_choice":
      return typeof value === "number";
    case "reorder":
      return Array.isArray(value) && value.length === exercise.tokens.length;
    case "match":
      return (
        value !== null && typeof value === "object" && !Array.isArray(value) &&
        exercise.pairs.every((p) => typeof value[p.left] === "string" && value[p.left] !== "")
      );
    default:
      return typeof value === "string" && value.trim().length > 0;
  }
}

export function ExerciseRunner({ exercise, onAnswered, feedback = "immediate" }: Props) {
  const [value, setValue] = useState<ExerciseResponse | undefined>(undefined);
  const [result, setResult] = useState<CheckResult | null>(null);
  const disabled = result !== null;

  const submit = () => {
    if (!isResponseComplete(exercise, value)) return;
    const r = checkExercise(exercise, value);
    setResult(r);
    onAnswered(r, value);
  };

  const input = (() => {
    const common = { value, onChange: setValue, disabled };
    switch (exercise.type) {
      case "multiple_choice": return <MultipleChoice exercise={exercise} {...common} />;
      case "fill_blank": return <FillBlank exercise={exercise} {...common} />;
      case "error_correction": return <ErrorCorrection exercise={exercise} {...common} />;
      case "reorder": return <Reorder exercise={exercise} {...common} />;
      case "translate": return <Translate exercise={exercise} {...common} />;
      case "match": return <Match exercise={exercise} {...common} />;
      case "free_text": return <FreeText exercise={exercise} {...common} />;
    }
  })();

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{typeLabel[exercise.type]}</div>
      {exercise.type !== "fill_blank" && exercise.type !== "error_correction" && exercise.type !== "translate" && <p className="text-lg">{exercise.prompt}</p>}
      {input}
      {!disabled && <Button type="submit" disabled={!isResponseComplete(exercise, value)}>Responder</Button>}
      {result && feedback === "deferred" && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Resposta registrada. O resultado aparece no fim do teste.</div>
      )}
      {result && feedback === "immediate" && (
        <div className={`rounded-md border p-3 text-sm ${result.correct ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}`}>
          <div className="font-medium">{result.correct ? "✓ Correto" : "✗ Não é isso"}</div>
          {!result.correct && <div className="mt-1">Esperado: <span className="font-medium">{result.expected}</span></div>}
          <div className="mt-2 text-slate-700">{exercise.explanation}</div>
        </div>
      )}
    </form>
  );
}
