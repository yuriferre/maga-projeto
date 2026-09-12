import { Link } from "react-router";
import type { PlacementAssessment } from "../../lib/api.ts";
import { placement } from "../../lib/content.ts";
import { Button } from "../ui/Button.tsx";
import { Card } from "../ui/Card.tsx";

export function PlacementCard({ latest, checkpoint }: { latest: PlacementAssessment | null; checkpoint: { due: boolean; nextAt: string | null } }) {
  if (!latest) {
    return (
      <Card>
        <h2 className="font-medium">Teste inicial</h2>
        <p className="mt-1 text-sm text-slate-600">Cerca de {placement.durationMin} minutos. Define seu nível de entrada, o radar inicial e as tags fracas que o warm-up das aulas vai usar.</p>
        <Link to="/placement" className="mt-3 inline-block"><Button>Fazer o teste</Button></Link>
      </Card>
    );
  }
  const r = latest.result;
  return (
    <Card>
      <h2 className="font-medium">Teste inicial</h2>
      <p className="mt-1 text-2xl font-semibold">Nível sugerido: {r.level}</p>
      <p className="text-sm text-slate-600">{Math.round(r.pct * 100)}% nos itens objetivos · escrita {r.writingScore ?? "—"}/5 · {new Date(latest.ts).toLocaleDateString("pt-BR")}</p>
      <div className="mt-3 flex gap-3">
        <Link to="/placement"><Button variant="secondary">Ver resultado</Button></Link>
        <Link to="/trilha"><Button variant="ghost">Ir para a trilha</Button></Link>
      </div>
      {checkpoint.due && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Checkpoint de 4 semanas disponível — mesmo formato do teste, para comparar a evolução.
          <Link to="/checkpoint" className="ml-2 font-medium text-indigo-700 hover:underline">Fazer o checkpoint</Link>
        </div>
      )}
    </Card>
  );
}
