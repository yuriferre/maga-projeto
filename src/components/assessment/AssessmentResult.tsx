import { Link } from "react-router";
import type { Exercise } from "../../../shared/schema.ts";
import type { AssessmentRecord } from "../../lib/api.ts";
import { tagLabel } from "../../lib/content.ts";
import { Badge } from "../ui/Badge.tsx";
import { Button } from "../ui/Button.tsx";
import { Card } from "../ui/Card.tsx";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const score = (n: number | null) => (n === null ? "—" : `${n}/5`);

function expectedOf(ex: Exercise): string {
  if (ex.type === "multiple_choice") return ex.options[ex.answer] ?? "";
  if (ex.type === "match") return ex.pairs.map((p) => `${p.left} → ${p.right}`).join("; ");
  if (ex.type === "free_text") return ex.model ?? "Resposta livre conforme o enunciado.";
  if ("accepted" in ex) return ex.accepted[0] ?? "";
  if ("answer" in ex) return String(ex.answer);
  return "";
}
function shownAnswer(ex: Exercise, answer: string | null): string {
  if (answer === null) return "—";
  if (ex.type === "multiple_choice" && /^\d+$/.test(answer)) return ex.options[Number(answer)] ?? answer;
  if (ex.type === "match") {
    try {
      const pairs: unknown = JSON.parse(answer);
      if (pairs && typeof pairs === "object" && !Array.isArray(pairs)) {
        return Object.entries(pairs).map(([left, right]) => `${left} → ${String(right)}`).join("; ");
      }
    } catch { /* Resposta antiga inválida: mantém o texto original. */ }
  }
  return answer;
}

export function AssessmentResult({ record, items, title, backTo, onRetake }: { record: AssessmentRecord; items: Exercise[]; title: string; backTo: { to: string; label: string }; onRetake(): void }) {
  const r = record.result;
  const byId = new Map(items.map((q) => [q.id, q]));
  const date = new Date(record.ts).toLocaleString("pt-BR");
  const rule = `itens ≥ ${pct(r.pass.itemsMin)}, escrita ≥ ${r.pass.writingMin}, fala ≥ ${r.pass.speakingMin}`;
  return (
    <div className="space-y-6">
      <Card>
        <p className="text-sm text-slate-500">{title} · {date}</p>
        <h2 className={`mt-1 text-2xl font-semibold ${r.passed ? "text-emerald-800" : "text-rose-800"}`}>{r.passed ? "Aprovado" : "Ainda não"}</h2>
        <p className="mt-2 text-slate-700">Itens {r.correct}/{r.itemCount} ({pct(r.itemsPct)}) · escrita {score(r.writingScore)} · fala {score(r.speakingScore)}. Regra: {rule}.</p>
        <p className="mt-2 text-xs text-slate-500">A nota de escrita é a sua autoavaliação guiada pela rubrica; a de fala vem das expressões-alvo, erros do catálogo, tempo e ritmo.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to={backTo.to} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{backTo.label}</Link>
          <Button variant="ghost" onClick={onRetake}>Refazer</Button>
        </div>
      </Card>
      <Card>
        <h3 className="font-medium">Tags fracas ({r.weakTags.length})</h3>
        <div className="mt-2 flex flex-wrap gap-1">{r.weakTags.length === 0 ? <span className="text-sm text-slate-500">nenhuma</span> : r.weakTags.map((t) => <Badge key={t} tone="red">{tagLabel(t)}</Badge>)}</div>
      </Card>
      <Card>
        <h3 className="font-medium">Revisão item a item</h3>
        <ol className="mt-3 space-y-3 text-sm">
          {r.items.map((item, i) => {
            const ex = byId.get(item.id);
            if (!ex) return null;
            return (
              <li key={item.id} className={`rounded-md border p-3 ${item.correct ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                <div className="text-xs text-slate-500">{i + 1}</div>
                <div className="font-medium">{ex.prompt}</div>
                <div>{item.correct ? "✓" : "✗"} Sua resposta: {shownAnswer(ex, item.answer)}{!item.correct && <> · Esperado: <span className="font-medium">{expectedOf(ex)}</span></>}</div>
                <div className="mt-1 text-slate-600">{ex.explanation}</div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
