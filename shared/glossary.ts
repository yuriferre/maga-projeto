import type { ContentBundle, Register } from "./schema.ts";

export type GlossarySource = { kind: "theme" | "lesson"; id: string; label: string };
export type GlossaryItem = {
  key: string;
  term: string;
  meaning: string;
  definition?: string;
  examples: Array<{ en: string; pt?: string }>;
  collocations: string[];
  pronunciation?: string;
  pitfalls: string[];
  register: Register;
  tags: string[];
  source: GlossarySource;
};

/** Minúsculas sem diacríticos, para busca e ordenação. */
export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Entradas curadas dos temas + vocabulário de cada aula com conteúdo, ordenadas por termo. */
export function buildGlossary(content: Pick<ContentBundle, "glossary" | "lessons">): GlossaryItem[] {
  const items: GlossaryItem[] = [];
  for (const theme of content.glossary) {
    for (const e of theme.entries) {
      items.push({ key: `${theme.id}:${normalize(e.term)}`, ...e, source: { kind: "theme", id: theme.id, label: theme.title } });
    }
  }
  for (const lesson of Object.values(content.lessons).sort((a, b) => a.id.localeCompare(b.id))) {
    const vocabTags = lesson.tags.filter((t) => t.startsWith("vocab."));
    for (const v of lesson.vocabulary) {
      items.push({
        key: `${lesson.id}:${normalize(v.term)}`,
        term: v.term,
        meaning: v.meaning,
        examples: [v.translation ? { en: v.example, pt: v.translation } : { en: v.example }],
        collocations: [],
        pitfalls: v.note ? [v.note] : [],
        register: v.register,
        tags: vocabTags.length > 0 ? vocabTags : ["comp.vocabulary"],
        source: { kind: "lesson", id: lesson.id, label: `Aula ${lesson.id}` },
      });
    }
  }
  return items.sort((a, b) => normalize(a.term).localeCompare(normalize(b.term)));
}

/** Busca sem acento e sem caixa em termo, significado, definição, exemplos (EN) e colocações. Consulta vazia casa tudo. */
export function matches(item: GlossaryItem, query: string): boolean {
  const q = normalize(query);
  if (q === "") return true;
  const haystack = [item.term, item.meaning, item.definition ?? "", ...item.examples.map((x) => x.en), ...item.collocations];
  return haystack.some((h) => normalize(h).includes(q));
}
