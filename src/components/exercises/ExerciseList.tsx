import { useState } from "react";
import type { Block, Exercise } from "../../../shared/schema.ts";
import type { CheckResult, ExerciseResponse } from "../../../shared/scoring.ts";
import { api } from "../../lib/api.ts";
import { Button } from "../ui/Button.tsx";
import { ProgressBar } from "../ui/ProgressBar.tsx";
import { ExerciseRunner } from "./ExerciseRunner.tsx";

type Props = { lessonId: string; block: Block; exercises: Exercise[]; onFinished?(summary: { correct: number; total: number }): void };

const responseToString = (r: ExerciseResponse) => (typeof r === "string" ? r : Array.isArray(r) ? r.join(" ") : typeof r === "number" ? String(r) : JSON.stringify(r));

export function ExerciseList({ lessonId, block, exercises, onFinished }: Props) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [answered, setAnswered] = useState(false);
  const [round, setRound] = useState(0);
  const [postError, setPostError] = useState<string | null>(null);

  const current = exercises[index];
  const finished = index >= exercises.length;
  const correct = results.filter((r) => r.correct).length;

  const onAnswered = (result: CheckResult, response: ExerciseResponse) => {
    setResults((prev) => [...prev, result]);
    setAnswered(true);
    if (!current) return;
    api.postAttempt({ lessonId, exerciseId: current.id, block, type: current.type, correct: result.correct, answer: responseToString(response), tags: current.tags })
      .then(() => setPostError(null))
      .catch((err: Error) => setPostError(`Não foi possível salvar a tentativa (${err.message}).`));
  };

  const next = () => {
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setAnswered(false);
    if (nextIndex >= exercises.length) onFinished?.({ correct: correct, total: exercises.length });
  };

  const restart = () => { setIndex(0); setResults([]); setAnswered(false); setRound((r) => r + 1); };

  if (exercises.length === 0) return <p className="text-slate-500">Nenhum exercício.</p>;

  if (finished) {
    return (
      <div className="space-y-3">
        <p className="text-lg font-medium">Resultado: {correct}/{exercises.length} ({Math.round((correct / exercises.length) * 100)}%)</p>
        <ProgressBar value={correct / exercises.length} />
        <Button variant="secondary" onClick={restart}>Refazer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Item {index + 1} de {exercises.length}</span>
        <span>{correct} certo(s)</span>
      </div>
      <ProgressBar value={index / exercises.length} />
      <ExerciseRunner key={`${round}-${current!.id}`} exercise={current!} onAnswered={onAnswered} />
      {postError && <p className="text-xs text-rose-700">{postError}</p>}
      {answered && <Button onClick={next}>{index + 1 < exercises.length ? "Próximo" : "Ver resultado"}</Button>}
    </div>
  );
}
