import { useEffect, useMemo, useState } from "react";
import { buildGlossary, matches, type GlossaryItem } from "../../shared/glossary.ts";
import { api } from "../lib/api.ts";
import { content, tagLabel } from "../lib/content.ts";
import { isSpeechSynthesisSupported, speak } from "../lib/speech.ts";
import { Badge } from "../components/ui/Badge.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Card } from "../components/ui/Card.tsx";

const ALL = buildGlossary(content);
const registerTone = { formal: "blue", neutral: "neutral", informal: "amber" } as const;
const registerLabel = { formal: "formal", neutral: "neutro", informal: "informal" } as const;
type AddState = "added" | "exists" | "error";

export function Glossary() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [source, setSource] = useState("all");
  const [added, setAdded] = useState<Record<string, AddState>>({});
  const tts = isSpeechSynthesisSupported();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 150);
    return () => window.clearTimeout(timer);
  }, [query]);

  const sources = useMemo(() => {
    const byId = new Map<string, string>();
    for (const item of ALL) byId.set(item.source.id, item.source.label);
    return [...byId.entries()];
  }, []);
  const items = useMemo(() => ALL.filter((i) => (source === "all" || i.source.id === source) && matches(i, debounced)), [debounced, source]);

  const say = (text: string) => { speak(text).catch(() => undefined); };
  const add = async (item: GlossaryItem) => {
    try {
      const res = await api.addCard({ front: item.meaning, back: item.term, ...(item.collocations[0] ? { hint: item.collocations[0] } : {}), tag: item.tags[0]! });
      setAdded((a) => ({ ...a, [item.key]: res.inserted ? "added" : "exists" }));
    } catch {
      setAdded((a) => ({ ...a, [item.key]: "error" }));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Glossário</h1>
        <p className="mt-1 text-sm text-slate-600">{ALL.length} termos: temas curados e vocabulário das aulas. Busca ignora acentos.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="w-full max-w-md rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          placeholder="Buscar termo, significado ou exemplo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar no glossário"
        />
        <span className="text-sm text-slate-500">{items.length} resultado(s)</span>
      </div>
      <div className="flex flex-wrap gap-1 text-xs">
        {[["all", "Todas as fontes"] as const, ...sources].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSource(id)} className={`rounded-full px-3 py-1 ${source === id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>
        ))}
      </div>

      {items.length === 0 && <p className="text-slate-500">Nenhum termo para "{debounced}".</p>}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.key}>
            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{item.term}</h2>
                {tts && <button type="button" onClick={() => say(item.term)} className="text-indigo-700 hover:underline" aria-label={`Ouvir ${item.term}`}>▶</button>}
                <Badge tone={registerTone[item.register]}>{registerLabel[item.register]}</Badge>
                <span className="text-xs text-slate-500">{item.source.label}</span>
                {item.pronunciation && <span className="font-mono text-xs text-slate-500">{item.pronunciation}</span>}
              </div>
              <p className="mt-1 text-slate-800">{item.meaning}</p>
              {item.definition && <p className="text-sm text-slate-600">{item.definition}</p>}
              <ul className="mt-2 space-y-1 text-sm">
                {item.examples.map((ex, i) => (
                  <li key={i}>
                    <span className="text-slate-800">{ex.en}</span>
                    {tts && <button type="button" onClick={() => say(ex.en)} className="ml-2 text-indigo-700 hover:underline" aria-label="Ouvir exemplo">▶</button>}
                    {ex.pt && <span className="ml-2 text-slate-500">— {ex.pt}</span>}
                  </li>
                ))}
              </ul>
              {item.collocations.length > 0 && <p className="mt-2 text-sm text-slate-600"><span className="font-medium">Colocações:</span> {item.collocations.join(" · ")}</p>}
              {item.pitfalls.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-rose-800">{item.pitfalls.map((p, i) => <li key={i}>{p}</li>)}</ul>}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {item.tags.map((t) => <Badge key={t}>{tagLabel(t)}</Badge>)}
                <Button variant="secondary" className="ml-auto" disabled={added[item.key] === "added" || added[item.key] === "exists"} onClick={() => add(item)}>
                  {added[item.key] === "added" ? "Adicionado aos cards" : added[item.key] === "exists" ? "Já está nos cards" : added[item.key] === "error" ? "Erro, tente de novo" : "Adicionar aos cards"}
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
