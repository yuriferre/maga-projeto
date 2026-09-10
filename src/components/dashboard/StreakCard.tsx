import type { Dashboard } from "../../lib/api.ts";
import { Card } from "../ui/Card.tsx";

export function StreakCard({ streak }: { streak: Dashboard["streak"] }) {
  return (
    <Card>
      <h2 className="font-medium">Sequência</h2>
      <p className="mt-1 text-3xl font-semibold">{streak.current} <span className="text-base font-normal text-slate-500">dia(s)</span></p>
      <p className="text-sm text-slate-600">Melhor: {streak.best} · hoje {streak.activeToday ? "✓" : "ainda sem atividade"}</p>
    </Card>
  );
}
