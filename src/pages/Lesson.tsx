import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import type { Exercise } from "../../shared/schema.ts";
import { getLesson } from "../lib/content.ts";
import { api } from "../lib/api.ts";
import { Button } from "../components/ui/Button.tsx";
import { Stepper } from "../components/lesson/Stepper.tsx";
import { WarmUp } from "../components/lesson/WarmUp.tsx";
import { Objective } from "../components/lesson/Objective.tsx";
import { Context } from "../components/lesson/Context.tsx";
import { Vocabulary } from "../components/lesson/Vocabulary.tsx";
import { Grammar } from "../components/lesson/Grammar.tsx";
import { Examples } from "../components/lesson/Examples.tsx";
import { BrErrors } from "../components/lesson/BrErrors.tsx";
import { Dialogue } from "../components/lesson/Dialogue.tsx";
import { Listening } from "../components/lesson/Listening.tsx";
import { Writing } from "../components/lesson/Writing.tsx";
import { Speaking } from "../components/lesson/Speaking.tsx";
import { Quiz } from "../components/lesson/Quiz.tsx";
import { Completion } from "../components/lesson/Completion.tsx";

export function Lesson() {
  const { id = "" } = useParams();
  const lesson = getLesson(id);
  const [warmup, setWarmup] = useState<Exercise[] | null>(null);
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!lesson) return;
    setStep(0);
    api.startLesson(lesson.id).catch((e: Error) => setServerError(e.message));
    api.warmup(lesson.id).then(({ items }) => setWarmup(items)).catch(() => setWarmup([]));
  }, [lesson]);

  const steps = useMemo(() => {
    if (!lesson) return [];
    const list = [
      ...(warmup && warmup.length > 0 ? [{ key: "warmup", label: "Revisão" }] : []),
      { key: "objective", label: "Objetivo" },
      { key: "context", label: "Contexto" },
      { key: "vocabulary", label: "Vocabulário" },
      ...(lesson.grammar ? [{ key: "grammar", label: "Gramática" }] : []),
      { key: "examples", label: "Exemplos" },
      ...(lesson.brErrors.length > 0 ? [{ key: "brErrors", label: "Erros comuns" }] : []),
      { key: "dialogue", label: "Diálogo" },
      { key: "listening", label: "Escuta" },
      { key: "writing", label: "Escrita" },
      { key: "speaking", label: "Fala" },
      { key: "quiz", label: "Quiz" },
      { key: "completion", label: "Conclusão" },
    ];
    return list;
  }, [lesson, warmup]);

  if (!lesson) return <p className="text-rose-700">Aula não encontrada.</p>;
  if (warmup === null) return <p className="text-slate-500">Carregando aula…</p>;
  const current = steps[Math.min(step, steps.length - 1)]!;

  const body = (() => {
    switch (current.key) {
      case "warmup": return <WarmUp lesson={lesson} items={warmup} />;
      case "objective": return <Objective lesson={lesson} />;
      case "context": return <Context lesson={lesson} />;
      case "vocabulary": return <Vocabulary lesson={lesson} />;
      case "grammar": return <Grammar lesson={lesson} />;
      case "examples": return <Examples lesson={lesson} />;
      case "brErrors": return <BrErrors lesson={lesson} />;
      case "dialogue": return <Dialogue lesson={lesson} />;
      case "listening": return <Listening lessonId={lesson.id} block="listening" lines={lesson.listening.lines} questions={lesson.listening.questions} />;
      case "writing": return <Writing spec={lesson.writing} fetchLatest={() => api.latestWriting(lesson.id).then((r) => r.submission)} submit={(body) => api.submitWriting(lesson.id, body)} minScoreLabel={`mínimo ${lesson.completion.writingMin}`} />;
      case "speaking": return <Speaking spec={lesson.speaking.modeA} submit={(body) => api.submitSpeaking(lesson.id, { mode: "A", ...body })} />;
      case "quiz": return <Quiz lesson={lesson} />;
      case "completion": return <Completion lesson={lesson} />;
      default: return null;
    }
  })();

  return (
    <div className="space-y-5">
      <div>
        <Link to={`/modules/${lesson.module}`} className="text-sm text-indigo-700 hover:underline">← {lesson.module}</Link>
        <h1 className="mt-1 text-2xl font-semibold">{lesson.id} · {lesson.title}</h1>
        {serverError && <p className="mt-1 text-sm text-rose-700">Servidor não respondeu ({serverError}). O progresso não será salvo.</p>}
      </div>
      <Stepper steps={steps} current={step} onSelect={setStep} />
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">{body}</div>
      <div className="flex justify-between">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>← Anterior</Button>
        <Button disabled={step >= steps.length - 1} onClick={() => setStep((s) => s + 1)}>Próximo →</Button>
      </div>
    </div>
  );
}
