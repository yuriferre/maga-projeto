import type { Dashboard } from "../../lib/api.ts";
import { Card } from "../ui/Card.tsx";

const GROUPS: Array<{ key: Dashboard["tags"]["stats"][number]["group"]; label: string }> = [
  { key: "gram", label: "Gramática" }, { key: "br", label: "Erros típicos" }, { key: "vocab", label: "Vocabulário" }, { key: "topic", label: "Situação" }, { key: "comp", label: "Competência" },
];

function tone(rate: number): string {
  if (rate === 0) return "bg-emerald-100 text-emerald-900";
  if (rate <= 0.2) return "bg-lime-100 text-lime-900";
  if (rate <= 0.4) return "bg-amber-100 text-amber-900";
  if (rate <= 0.6) return "bg-orange-200 text-orange-900";
  return "bg-rose-200 text-rose-900";
}

export function TagHeatmap({ stats, weak, days }: { stats: Dashboard["tags"]["stats"]; weak: string[]; days: number }) {
  const weakSet = new Set(weak);
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">Erros por tag</h2>
        <span className="text-xs text-slate-500">últimos {days} dias · borda vermelha = tag fraca</span>
      </div>
      {stats.length === 0 && <p className="mt-2 text-sm text-slate-500">Nenhuma tentativa na janela.</p>}
      {GROUPS.map((g) => {
        const mine = stats.filter((s) => s.group === g.key);
        if (mine.length === 0) return null;
        return (
          <div key={g.key} className="mt-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">{g.label}</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {mine.map((s) => (
                <span key={s.tag} title={`${s.tag}: ${s.errors} erro(s) em ${s.attempts}`} className={`rounded px-2 py-1 text-xs ${tone(s.errorRate)} ${weakSet.has(s.tag) ? "ring-2 ring-rose-500" : ""}`}>
                  {s.label} <span className="opacity-70">{s.errors}/{s.attempts}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
