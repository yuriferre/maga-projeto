export type Inline = { type: "text" | "bold" | "italic" | "code"; text: string };
export type MdBlock =
  | { type: "paragraph"; inlines: Inline[] }
  | { type: "table"; header: Inline[][]; rows: Inline[][][] }
  | { type: "list"; items: Inline[][] };

// Itálico exige texto colado aos asteriscos, para que um "*" solto não engula o texto seguinte.
const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|\*(?!\s)[^*]+?(?<!\s)\*)/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ type: "text", text: text.slice(last, idx) });
    const tok = m[0];
    if (tok.startsWith("**")) out.push({ type: "bold", text: tok.slice(2, -2) });
    else if (tok.startsWith("`")) out.push({ type: "code", text: tok.slice(1, -1) });
    else out.push({ type: "italic", text: tok.slice(1, -1) });
    last = idx + tok.length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

const splitRow = (line: string): Inline[][] =>
  line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => parseInline(cell.trim()));

const isSeparator = (line: string) => /^\s*\|?\s*:?-{3,}/.test(line);

export function parseMarkdown(text: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  const chunks = text.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean);
  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    if (lines.every((l) => l.trim().startsWith("|")) && lines.length >= 2 && isSeparator(lines[1]!)) {
      blocks.push({ type: "table", header: splitRow(lines[0]!), rows: lines.slice(2).map(splitRow) });
    } else if (lines.every((l) => /^\s*-\s+/.test(l))) {
      blocks.push({ type: "list", items: lines.map((l) => parseInline(l.replace(/^\s*-\s+/, ""))) });
    } else {
      blocks.push({ type: "paragraph", inlines: parseInline(lines.map((l) => l.trim()).join(" ")) });
    }
  }
  return blocks;
}
