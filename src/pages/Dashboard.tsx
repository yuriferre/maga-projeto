import { Link } from "react-router";
import { useDashboard } from "../lib/useDashboard.ts";
import type { Dashboard } from "../lib/api.ts";
import { competencyLabel, getLesson, tagLabel } from "../lib/content.ts";
import { Card } from "../components/ui/Card.tsx";
import { RadarChart } from "../components/dashboard/RadarChart.tsx";
import { PlacementCard } from "../components/dashboard/PlacementCard.tsx";
import { TagHeatmap } from "../components/dashboard/TagHeatmap.tsx";
import { StreakCard } from "../components/dashboard/StreakCard.tsx";
import { SrsCard } from "../components/dashboard/SrsCard.tsx";
import { WeeklyGoalCard } from "../components/dashboard/WeeklyGoalCard.tsx";
import { Timeline } from "../components/dashboard/Timeline.tsx";

const DAYS = 30;
const AXES = ["REA", "VOC", "LIS", "WRI", "SPK", "PRO", "CNF"] as const;

export function Dashboard() {
  const { data, error, reload } = useDashboard(DAYS);
  if (error) return <p className="text-rose-700">Servidor não respondeu ({error}). Painel indisponível.</p>;
  if (!data) return <p className="text-slate-500">Carregando painel…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Painel</h1>
        <p className="mt-1 text-sm text-slate-600">Radar e heatmap consideram os últimos {DAYS} dias. A sequência conta qualquer atividade no dia.</p>
      </div>
      <RecommendationCard rec={data.recommendation} />
      <div className="grid gap-6 md:grid-cols-2">
        <PlacementCard latest={data.placement.latest} />
        <StreakCard streak={data.streak} />
        <SrsCard srs={data.srs} />
        <Card>
          <h2 className="font-medium">Competências</h2>
          <RadarChart axes={AXES.map((k) => ({ key: k, label: competencyLabel[k] ?? k, value: data.radar[k].value }))} />
          <p className="text-center text-xs text-slate-500">{AXES.map((k) => `${competencyLabel[k]}: ${data.radar[k].samples}`).join(" · ")} amostra(s)</p>
        </Card>
        <WeeklyGoalCard week={data.week} onSaved={reload} />
      </div>
      <TagHeatmap stats={data.tags.stats} weak={data.tags.weak} days={DAYS} />
      <Timeline items={data.timeline} />
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Dashboard["recommendation"] }) {
  const inner = (() => {
    switch (rec.kind) {
      case "review-lesson": {
        const lesson = getLesson(rec.lessonId);
        return (
          <>
            Antes de avançar, vale refazer exercícios de{" "}
            <Link to={`/lessons/${rec.lessonId}`} className="font-medium text-indigo-700 hover:underline">{rec.lessonId}{lesson ? ` · ${lesson.title}` : ""}</Link>
            {" — "}tags fracas: {rec.tags.map((t, i) => <span key={t}>{i > 0 && ", "}<Link to={`/tags/${t}`} className="text-indigo-700 hover:underline">{tagLabel(t)}</Link></span>)}.
          </>
        );
      }
      case "review-tag":
        return (
          <>
            Revise a tag{" "}
            <Link to={`/tags/${rec.tag}`} className="font-medium text-indigo-700 hover:underline">{tagLabel(rec.tag)}</Link>
            {" — ela está fraca nas últimas tentativas."}
          </>
        );
      case "next":
        return rec.lessonId
          ? <>Próxima aula: <Link to={`/lessons/${rec.lessonId}`} className="font-medium text-indigo-700 hover:underline">{rec.lessonId} · {getLesson(rec.lessonId)?.title}</Link></>
          : <>Trilha concluída — sem aulas pendentes.</>;
    }
  })();
  return <Card><p className="text-sm text-slate-700"><span className="font-medium">Hoje: </span>{inner}</p></Card>;
}
