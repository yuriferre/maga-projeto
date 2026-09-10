import type { Dashboard } from "../../lib/api.ts";
import { Card } from "../ui/Card.tsx";

const kindLabel: Record<string, string> = { placement: "Teste inicial", module: "Avaliação de módulo", level: "Avaliação de nível", checkpoint: "Checkpoint" };

export function Timeline({ items }: { items: Dashboard["timeline"] }) {
  return (
    <Card>
      <h2 className="font-medium">Linha do tempo</h2>
      {items.length === 0 ? <p className="mt-2 text-sm text-slate-500">Nenhuma avaliação ainda. O teste inicial é a primeira.</p> : (
        <ol className="mt-2 space-y-1 text-sm">
          {items.map((t) => {
            // Sem separador órfão quando nível ou percentual não vêm no resumo.
            const parts = [
              t.summary.level === undefined ? null : `nível ${t.summary.level}`,
              t.summary.pct === undefined ? null : `${Math.round(t.summary.pct * 100)}%`,
              new Date(t.ts).toLocaleDateString("pt-BR"),
            ].filter((part): part is string => part !== null);
            return (
              <li key={t.id} className="flex justify-between border-t border-slate-100 py-1">
                <span>{kindLabel[t.kind] ?? t.kind}{t.kind !== "placement" ? ` · ${t.ref}` : ""}</span>
                <span className="text-slate-600">{parts.join(" · ")}</span>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
