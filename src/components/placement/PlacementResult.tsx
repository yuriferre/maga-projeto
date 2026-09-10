import { Link } from "react-router";
import type { Placement } from "../../../shared/schema.ts";
import { placementExercises } from "../../../shared/schema.ts";
import type { PlacementAssessment } from "../../lib/api.ts";
import { competencyLabel, tagLabel } from "../../lib/content.ts";
import { Button } from "../ui/Button.tsx";
import { Badge } from "../ui/Badge.tsx";
import { Card } from "../ui/Card.tsx";
import { RadarChart } from "../dashboard/RadarChart.tsx";

const blockLabel = { reading: "Leitura", vocabulary: "Vocabulário", grammar: "Gramática", listening: "Escuta" } as const;
const AXES = ["REA", "VOC", "LIS", "WRI", "SPK", "PRO", "CNF"] as const;

function levelSentence(level: 1 | 2 | 3, pct: number, writing: number | null): string {
  const p = Math.round(pct * 100);
  if (level === 3) return `${p}% nos itens objetivos (acima de 80%) e escrita ${writing}/5 (4 ou mais): sugestão de começar no Nível 3.`;
  if (level === 2) return `${p}% nos itens objetivos (60% ou mais) e escrita ${writing}/5 (3 ou mais): sugestão de começar no Nível 2.`;
  return `${p}% nos itens objetivos${writing === null ? "" : ` e escrita ${writing}/5`}: sugestão de começar no Nível 1, a base da trilha.`;
}

export function PlacementResult({ assessment, placement, onRetake }: { assessment: PlacementAssessment; placement: Placement; onRetake(): void }) {
  const r = assessment.result;
  const byId = new Map(placementExercises(placement).map((e) => [e.exercise.id, e.exercise]));
  const date = new Date(assessment.ts).toLocaleString("pt-BR");

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-sm text-slate-500">Teste concluído em {date}</p>
        <h2 className="mt-1 text-2xl font-semibold">Nível sugerido: {r.level}</h2>
        <p className="mt-2 text-slate-700">{levelSentence(r.level, r.pct, r.writingScore)}</p>
        <p className="mt-2 text-xs text-slate-500">A nota de escrita é a sua autoavaliação guiada pela rubrica; a correção automática chega na etapa E4. Você pode ignorar a sugestão e começar onde preferir.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/"><Button>Ir para o painel</Button></Link>
          <Link to="/trilha"><Button variant="secondary">Ver a trilha</Button></Link>
          <Button variant="ghost" onClick={onRetake}>Refazer o teste</Button>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="font-medium">Por bloco</h3>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {(["reading", "vocabulary", "grammar", "listening"] as const).map((b) => (
                <tr key={b} className="border-t border-slate-100"><td className="py-1">{blockLabel[b]}</td><td className="py-1 text-right">{r.blocks[b].correct}/{r.blocks[b].total}</td><td className="py-1 text-right text-slate-500">{Math.round(r.blocks[b].pct * 100)}%</td></tr>
              ))}
              <tr className="border-t border-slate-100"><td className="py-1">Escrita (autoavaliação)</td><td className="py-1 text-right" colSpan={2}>{r.writingScore === null ? "—" : `${r.writingScore}/5`}</td></tr>
              <tr className="border-t border-slate-100"><td className="py-1">Fala</td><td className="py-1 text-right" colSpan={2}>{r.speaking ? `${r.speaking.score}/5 · leitura ${Math.round(r.speaking.readAloudPct * 100)}%` : "não feita"}</td></tr>
            </tbody>
          </table>
        </Card>
        <Card>
          <h3 className="font-medium">Radar inicial</h3>
          <RadarChart axes={AXES.map((k) => ({ key: k, label: competencyLabel[k] ?? k, value: r.radar[k] }))} />
        </Card>
      </div>

      <Card>
        <h3 className="font-medium">Tags fracas ({r.weakTags.length})</h3>
        <p className="text-sm text-slate-600">Erro em metade ou mais dos itens da tag. O warm-up das aulas vai puxar itens daqui.</p>
        <div className="mt-2 flex flex-wrap gap-1">{r.weakTags.length === 0 ? <span className="text-sm text-slate-500">nenhuma</span> : r.weakTags.map((t) => <Badge key={t} tone="red">{tagLabel(t)}</Badge>)}</div>
        <p className="mt-3 text-xs text-slate-500">Meta desta semana criada: 3 aulas, 5 revisões, 150 minutos. Ajuste no painel.</p>
      </Card>

      <Card>
        <h3 className="font-medium">Revisão item a item</h3>
        <ol className="mt-3 space-y-3 text-sm">
          {r.items.map((item, i) => {
            const ex = byId.get(item.id);
            if (!ex) return null;
            const expected = ex.type === "multiple_choice" ? ex.options[ex.answer] : "accepted" in ex ? ex.accepted[0] : "answer" in ex ? ex.answer : "";
            return (
              <li key={item.id} className={`rounded-md border p-3 ${item.correct ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                <div className="text-xs text-slate-500">{i + 1} · {blockLabel[item.block]}</div>
                <div className="font-medium">{ex.prompt}</div>
                <div>{item.correct ? "✓" : "✗"} Sua resposta: {item.answer ?? "—"}{!item.correct && <> · Esperado: <span className="font-medium">{expected}</span></>}</div>
                <div className="mt-1 text-slate-600">{ex.explanation}</div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
