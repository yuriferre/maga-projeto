import { useEffect, useMemo, useState } from "react";
import type { SpeakingMetrics } from "../../server/speaking-metrics.ts";
import { placementExercises } from "../../shared/schema.ts";
import { api, ApiError, type PlacementAssessment, type PlacementState, type ReadAloudEntry } from "../lib/api.ts";
import { placement } from "../lib/content.ts";
import { Button } from "../components/ui/Button.tsx";
import { Markdown } from "../components/ui/Markdown.tsx";
import { Stepper } from "../components/lesson/Stepper.tsx";
import { ExerciseList } from "../components/exercises/ExerciseList.tsx";
import { Listening } from "../components/lesson/Listening.tsx";
import { Writing } from "../components/lesson/Writing.tsx";
import { Speaking } from "../components/lesson/Speaking.tsx";
import { PassageView } from "../components/placement/PassageView.tsx";
import { ReadAloud } from "../components/placement/ReadAloud.tsx";
import { PlacementResult } from "../components/placement/PlacementResult.tsx";

type Stage = "loading" | "intro" | "reading" | "vocabulary" | "grammar" | "listening" | "writing" | "speaking" | "result";
const STEPS: Array<{ key: Stage; label: string }> = [
  { key: "reading", label: "Leitura" }, { key: "vocabulary", label: "Vocabulário" }, { key: "grammar", label: "Gramática" },
  { key: "listening", label: "Escuta" }, { key: "writing", label: "Escrita" }, { key: "speaking", label: "Fala (opcional)" }, { key: "result", label: "Resultado" },
];
const ORDER: Stage[] = ["intro", "reading", "vocabulary", "grammar", "listening", "writing", "speaking", "result"];
const next = (s: Stage): Stage => ORDER[Math.min(ORDER.indexOf(s) + 1, ORDER.length - 1)]!;

/** Frase da caixa de pendências: só escrita, só itens ou os dois. */
function missingSentence(missing: { exercises: string[]; writing: boolean }): string {
  const items = missing.exercises.length;
  if (items === 0) return "Falta a nota da escrita.";
  return `Faltam ${items} item(ns) objetivo(s)${missing.writing ? " e a nota da escrita" : ""}.`;
}

/** Primeiro bloco com item sem resposta na rodada; escrita se falta nota; senão fala. */
function resumeStage(state: PlacementState): Stage {
  const answered = new Set(state.run.answered);
  for (const { exercise, block } of placementExercises(placement)) if (!answered.has(exercise.id)) return block;
  if (!state.run.writing || state.run.writing.score === null) return "writing";
  return "speaking";
}

export function Placement() {
  const [stage, setStage] = useState<Stage>("loading");
  const [state, setState] = useState<PlacementState | null>(null);
  const [assessment, setAssessment] = useState<PlacementAssessment | null>(null);
  const [passageIndex, setPassageIndex] = useState(0);
  const [scriptIndex, setScriptIndex] = useState(0);
  const [writingScore, setWritingScore] = useState<number | null>(null);
  const [readAloud, setReadAloud] = useState<ReadAloudEntry[]>(placement.speaking.readAloud.map((target) => ({ target, transcript: "" })));
  const [spoken, setSpoken] = useState<SpeakingMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<{ exercises: string[]; writing: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.placementState().then((s) => {
      setState(s);
      const hasRun = s.run.answered.length > 0 || s.run.writing !== null || s.run.speaking !== null;
      if (s.latest && !hasRun) { setAssessment(s.latest); setStage("result"); return; }
      if (hasRun) {
        setWritingScore(s.run.writing?.score ?? null);
        // Fala já enviada nesta rodada: o botão precisa dizer "Concluir o teste", não "Pular a fala".
        if (s.run.speaking) setSpoken(JSON.parse(s.run.speaking.metrics_json) as SpeakingMetrics);
        const resume = resumeStage(s);
        const answeredPassages = placement.reading.passages.findIndex((p) => p.questions.some((q) => !s.run.answered.includes(q.id)));
        const answeredScripts = placement.listening.scripts.findIndex((sc) => sc.questions.some((q) => !s.run.answered.includes(q.id)));
        setPassageIndex(Math.max(0, answeredPassages));
        setScriptIndex(Math.max(0, answeredScripts));
        setStage(resume);
        return;
      }
      setStage("intro");
    }).catch((e: Error) => { setError(e.message); setStage("intro"); });
  }, []);

  const answered = useMemo(() => state?.run.answered ?? [], [state]);

  const finish = async () => {
    setBusy(true); setError(null); setMissing(null);
    try {
      const res = await api.finishPlacement();
      setAssessment(res.assessment);
      setStage("result");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setMissing((e.body as { missing: { exercises: string[]; writing: boolean } }).missing);
      else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Recarrega o estado do servidor (itens desta sessão já foram gravados) e retoma no primeiro bloco incompleto. */
  const backToBlocks = () => {
    api.placementState().then((s) => { setState(s); setPassageIndex(0); setScriptIndex(0); setMissing(null); setStage(resumeStage(s)); }).catch((e: Error) => setError(e.message));
  };

  const retake = () => {
    setAssessment(null); setState(null); setPassageIndex(0); setScriptIndex(0); setWritingScore(null); setSpoken(null); setMissing(null);
    setReadAloud(placement.speaking.readAloud.map((target) => ({ target, transcript: "" })));
    setStage("intro");
  };

  if (stage === "loading") return <p className="text-slate-500">Carregando…</p>;
  if (stage === "result" && assessment) return <PlacementResult assessment={assessment} placement={placement} onRetake={retake} />;

  const body = (() => {
    switch (stage) {
      case "intro":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{placement.title}</h2>
            <Markdown text={placement.intro} />
            <p className="text-sm text-slate-500">Duração estimada: {placement.durationMin} min. Você pode fechar a aba e retomar depois: as respostas ficam salvas.</p>
            <Button onClick={() => setStage("reading")}>Começar</Button>
          </div>
        );
      case "reading": {
        const passage = placement.reading.passages[passageIndex]!;
        const last = passageIndex >= placement.reading.passages.length - 1;
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Leitura · trecho {passageIndex + 1} de {placement.reading.passages.length}</h2>
            <PassageView passage={passage} />
            <ExerciseList key={passage.id} lessonId="placement" block="placement" exercises={passage.questions} feedback="deferred" initialAnswered={answered}
              onFinished={() => (last ? setStage("vocabulary") : setPassageIndex((i) => i + 1))} />
          </div>
        );
      }
      case "vocabulary":
      case "grammar": {
        const block = placement[stage];
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{stage === "vocabulary" ? "Vocabulário em contexto" : "Gramática em contexto"}</h2>
            {block.intro && <p className="text-sm text-slate-600">{block.intro}</p>}
            <ExerciseList key={stage} lessonId="placement" block="placement" exercises={block.questions} feedback="deferred" initialAnswered={answered} onFinished={() => setStage(next(stage))} />
          </div>
        );
      }
      case "listening": {
        const script = placement.listening.scripts[scriptIndex]!;
        const last = scriptIndex >= placement.listening.scripts.length - 1;
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Escuta · áudio {scriptIndex + 1} de {placement.listening.scripts.length}: {script.title}</h2>
            <Listening key={script.id} lessonId="placement" block="placement" lines={script.lines} questions={script.questions} feedback="deferred" initialAnswered={answered}
              onFinished={() => (last ? setStage("writing") : setScriptIndex((i) => i + 1))} />
          </div>
        );
      }
      case "writing":
        return (
          <div className="space-y-4">
            <Writing spec={placement.writing} fetchLatest={() => api.placementState().then((s) => s.run.writing)} submit={(b) => api.submitPlacementWriting(b)} onSaved={setWritingScore} />
            <p className="text-sm text-slate-600">Para concluir o teste, envie o texto, compare com o modelo e salve sua nota (1–5).</p>
            <Button disabled={writingScore === null} onClick={() => setStage("speaking")}>Continuar para a fala →</Button>
          </div>
        );
      case "speaking":
        return (
          <div className="space-y-6">
            <p className="text-sm text-slate-600">Bloco opcional. Sem ele, os eixos Fala, Pronúncia e Confiança ficam vazios no radar.</p>
            <ReadAloud sentences={placement.speaking.readAloud} entries={readAloud} onChange={setReadAloud} />
            <Speaking spec={placement.speaking.modeA} title="Pergunta" onSubmitted={setSpoken}
              submit={(b) => api.submitPlacementSpeaking({ ...b, readAloud: readAloud.filter((r) => r.transcript.trim().length > 0) })} />
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy} onClick={finish}>{spoken ? "Concluir o teste" : "Pular a fala e concluir"}</Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Teste inicial</h1>
      {stage !== "intro" && <Stepper steps={STEPS} current={Math.max(0, STEPS.findIndex((s) => s.key === stage))} onSelect={() => undefined} readOnly />}
      {error && <p className="text-sm text-rose-700">Servidor não respondeu ({error}).</p>}
      {missing && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {missingSentence(missing)}
          {missing.exercises.length > 0 && <Button variant="ghost" onClick={backToBlocks}>Voltar aos blocos</Button>}
          {missing.writing && <Button variant="ghost" onClick={() => setStage("writing")}>Ir para a escrita</Button>}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">{body}</div>
    </div>
  );
}
