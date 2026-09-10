import { useState } from "react";
import { api, type Dashboard, type WeekGoal } from "../../lib/api.ts";
import { Button } from "../ui/Button.tsx";
import { Card } from "../ui/Card.tsx";
import { ProgressBar } from "../ui/ProgressBar.tsx";

const DEFAULTS: WeekGoal = { lessonsTarget: 3, reviewsTarget: 5, minutesTarget: 150 };

export function WeeklyGoalCard({ week, onSaved }: { week: Dashboard["week"]; onSaved(): void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WeekGoal>(week.goal ?? DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true); setError(null);
    try { await api.setWeekGoal(draft); setEditing(false); onSaved(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const rows: Array<{ label: string; done: number; target: number }> = week.goal
    ? [
        { label: "Aulas", done: week.progress.lessons, target: week.goal.lessonsTarget },
        { label: "Revisões", done: week.progress.reviews, target: week.goal.reviewsTarget },
        { label: "Minutos", done: week.progress.minutes, target: week.goal.minutesTarget },
      ]
    : [];

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">Meta da semana</h2>
        <span className="text-xs text-slate-500">desde {week.weekStart}</span>
      </div>
      {!week.goal && !editing && (
        <div className="mt-2">
          <p className="text-sm text-slate-600">Sem meta definida para esta semana.</p>
          <Button className="mt-2" variant="secondary" onClick={() => setEditing(true)}>Definir meta</Button>
        </div>
      )}
      {week.goal && !editing && (
        <div className="mt-2 space-y-3">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="flex justify-between text-sm"><span>{r.label}</span><span className="text-slate-600">{r.done}/{r.target}</span></div>
              <ProgressBar value={r.target === 0 ? 0 : r.done / r.target} />
            </div>
          ))}
          <Button variant="ghost" onClick={() => { setDraft(week.goal ?? DEFAULTS); setEditing(true); }}>Editar</Button>
        </div>
      )}
      {editing && (
        <form className="mt-2 space-y-2 text-sm" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {([["lessonsTarget", "Aulas"], ["reviewsTarget", "Revisões"], ["minutesTarget", "Minutos"]] as const).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3">{label}
              <input type="number" min={0} className="w-24 rounded border border-slate-300 px-2 py-1" value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })} />
            </label>
          ))}
          {error && <p className="text-rose-700">{error}</p>}
          <div className="flex gap-2"><Button type="submit" disabled={busy}>Salvar</Button><Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button></div>
        </form>
      )}
    </Card>
  );
}
