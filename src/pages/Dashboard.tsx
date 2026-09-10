import { useDashboard } from "../lib/useDashboard.ts";
import { competencyLabel } from "../lib/content.ts";
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
