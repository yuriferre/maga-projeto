import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import type { SpeakingMetrics } from "../../server/speaking-metrics.ts";
import { api, ApiError, type AssessmentMissing, type AssessmentRecord, type LevelAssessmentState } from "../lib/api.ts";
import { content, levels } from "../lib/content.ts";
import { Button } from "../components/ui/Button.tsx";
import { Card } from "../components/ui/Card.tsx";
import { Markdown } from "../components/ui/Markdown.tsx";
import { Stepper } from "../components/lesson/Stepper.tsx";
import { ExerciseList } from "../components/exercises/ExerciseList.tsx";
import { Writing } from "../components/lesson/Writing.tsx";
import { Speaking } from "../components/lesson/Speaking.tsx";
import { AssessmentResult } from "../components/assessment/AssessmentResult.tsx";

type Stage = "loading" | "locked" | "intro" | "items" | "writing" | "speaking" | "result";
const STEPS = [{ key: "items", label: "Itens" }, { key: "writing", label: "Escrita" }, { key: "speaking", label: "Fala" }, { key: "result", label: "Resultado" }];

export function LevelAssessment() {
  const n = Number(useParams().n ?? "");
  const level = levels.find((l) => l.id === n);
  const assessment = content.levelAssessments[`L${n}`];
  const [stage, setStage] = useState<Stage>("loading");
  const [state, setState] = useState<LevelAssessmentState | null>(null);
  const [record, setRecord] = useState<AssessmentRecord | null>(null);
  const [writingScore, setWritingScore] = useState<number | null>(null);
  const [spoken, setSpoken] = useState<SpeakingMetrics | null>(null);
  const [missing, setMissing] = useState<AssessmentMissing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const retryRetake = useRef(false);

  /** Carrega o estado e decide o estágio: resultado, retomada ou intro. */
  const load = useCallback((afterRetake = false) => {
    retryRetake.current = afterRetake;
    setStage("loading"); setState(null); setRecord(null);
    setWritingScore(null); setSpoken(null);
    setError(null); setMissing(null);
    api.levelAssessmentState(n).then((s) => {
      setState(s);
      const hasRun = s.run.answered.length > 0 || s.run.writing !== null || s.run.speaking !== null;
      if (s.eligible.missing.length > 0) { setStage("locked"); return; }
      if (s.latest && !hasRun && !afterRetake) { setRecord(s.latest); setStage("result"); return; }
      setWritingScore(s.run.writing?.score ?? null);
      if (s.run.speaking) setSpoken(JSON.parse(s.run.speaking.metrics_json) as SpeakingMetrics);
      if (!hasRun) { setStage("intro"); return; }
      const allAnswered = assessment ? assessment.items.every((q) => s.run.answered.includes(q.id)) : true;
      setStage(!allAnswered ? "items" : s.run.writing?.score == null ? "writing" : "speaking");
    }).catch((e: Error) => { setError(e.message); setStage("intro"); });
  }, [n, assessment]);
  useEffect(() => { load(); }, [load]);

  if (!assessment || !level) return <p className="text-rose-700">Este nível ainda não tem avaliação.</p>;
  const backTo = { to: "/trilha", label: "Voltar à trilha" };

  const finish = async () => {
    setBusy(true); setError(null); setMissing(null);
    try {
      const res = await api.finishLevelAssessment(n);
      setRecord(res.assessment);
      setStage("result");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const body = e.body as { missing?: AssessmentMissing | string[] } | null;
        if (Array.isArray(body?.missing)) { load(); }
        else if (body?.missing) setMissing(body.missing);
        else setError(e.message);
      } else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const retake = () => { load(true); };

  if (stage === "loading") return <p className="text-slate-500">Carregando…</p>;
  if (stage === "result" && record) return <AssessmentResult record={record} items={assessment.items} title={assessment.title} backTo={backTo} onRetake={retake} />;
  if (stage === "locked" && state) {
    return (
      <div className="space-y-4">
        <Link to={backTo.to} className="text-sm text-indigo-700 hover:underline">← trilha</Link>
        <h1 className="text-2xl font-semibold">{assessment.title}</h1>
        <Card>
          <p className="text-slate-700">Aprove nos módulos do nível antes da avaliação final: {state.eligible.modulesDone}/{state.eligible.modulesTotal} aprovados.</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">{state.eligible.missing.map((m) => <li key={m}><Link to={`/modules/${m}`} className="text-indigo-700 hover:underline">{m} · {level.modules.find((mod) => mod.id === m)?.title}</Link></li>)}</ul>
        </Card>
      </div>
    );
  }

  const answered = state?.run.answered ?? [];
  const body = (() => {
    switch (stage) {
      case "intro":
        return (
          <div className="space-y-4">
            <Markdown text={assessment.intro} />
            <p className="text-sm text-slate-500">{assessment.items.length} itens · 1 escrita · 1 gravação. Pode fechar e retomar; as respostas ficam salvas.</p>
            {state
              ? <Button onClick={() => setStage("items")}>Começar</Button>
              : <Button onClick={() => load(retryRetake.current)}>Tentar novamente</Button>}
          </div>
        );
      case "items":
        return <ExerciseList key="items" lessonId={`L${n}`} block="assessment" exercises={assessment.items} feedback="deferred" initialAnswered={answered} onFinished={() => setStage("writing")} />;
      case "writing":
        return (
          <div className="space-y-4">
            <Writing spec={assessment.writing} fetchLatest={() => api.levelAssessmentState(n).then((s) => s.run.writing)} submit={(b) => api.submitLevelWriting(n, b)} onSaved={setWritingScore} />
            <p className="text-sm text-slate-600">Envie o texto, compare com o modelo e salve sua nota (1–5) para continuar.</p>
            <Button disabled={writingScore === null} onClick={() => setStage("speaking")}>Continuar para a fala →</Button>
          </div>
        );
      case "speaking":
        return (
          <div className="space-y-6">
            <Speaking spec={assessment.speaking} title="Gravação" onSubmitted={setSpoken} submit={(b) => api.submitLevelSpeaking(n, { mode: "A", ...b })} />
            <Button disabled={busy || !spoken} onClick={finish}>Concluir a avaliação</Button>
            {!spoken && <p className="text-xs text-slate-500">A gravação é obrigatória na avaliação (nota mínima {assessment.pass.speakingMin}/5).</p>}
          </div>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-5">
      <Link to={backTo.to} className="text-sm text-indigo-700 hover:underline">← trilha</Link>
      <h1 className="text-2xl font-semibold">{assessment.title}</h1>
      {stage !== "intro" && <Stepper steps={STEPS} current={Math.max(0, STEPS.findIndex((s) => s.key === stage))} onSelect={() => undefined} readOnly />}
      {error && <p className="text-sm text-rose-700">Servidor não respondeu ({error}).</p>}
      {missing && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Faltam: {[missing.exercises.length > 0 ? `${missing.exercises.length} item(ns)` : "", missing.writing ? "a nota da escrita" : "", missing.speaking ? "a gravação" : ""].filter(Boolean).join(", ")}.
          {missing.exercises.length > 0 && <Button variant="ghost" onClick={() => load()}>Voltar aos itens</Button>}
          {missing.writing && <Button variant="ghost" onClick={() => { setMissing(null); setStage("writing"); }}>Ir para a escrita</Button>}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">{body}</div>
    </div>
  );
}
