import { useNavigate } from "react-router";
import type { Dashboard } from "../../lib/api.ts";
import { Button } from "../ui/Button.tsx";
import { Card } from "../ui/Card.tsx";

export function SrsCard({ srs }: { srs: Dashboard["srs"] }) {
  const navigate = useNavigate();
  const acc = srs.accuracy30d;
  return (
    <Card>
      <h2 className="font-medium">Cards</h2>
      <p className="mt-1 text-3xl font-semibold">{srs.dueNow} <span className="text-base font-normal text-slate-500">para revisar</span></p>
      <p className="text-sm text-slate-600">novos {srs.new} · aprendendo {srs.learning} · maduros {srs.mature} · total {srs.total}</p>
      <p className="text-sm text-slate-600">
        acerto 30 dias: {acc.value === null ? "—" : `${Math.round(acc.value * 100)}% (${acc.samples})`}
        {srs.dueNow === 0 && srs.nextDue ? ` · próximo: ${new Date(srs.nextDue).toLocaleDateString("pt-BR")}` : ""}
      </p>
      <Button className="mt-3" disabled={srs.dueNow === 0} onClick={() => navigate("/review")}>Revisar</Button>
    </Card>
  );
}
