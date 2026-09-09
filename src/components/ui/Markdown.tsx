import { parseMarkdown, type Inline } from "../../../shared/mini-markdown.ts";

function Inlines({ inlines }: { inlines: Inline[] }) {
  return (
    <>
      {inlines.map((n, i) => {
        if (n.type === "bold") return <strong key={i}>{n.text}</strong>;
        if (n.type === "italic") return <em key={i}>{n.text}</em>;
        if (n.type === "code") return <code key={i} className="rounded bg-slate-100 px-1 font-mono text-[0.9em]">{n.text}</code>;
        return <span key={i}>{n.text}</span>;
      })}
    </>
  );
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseMarkdown(text);
  return (
    <div className={`space-y-3 text-slate-700 ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === "paragraph") return <p key={i}><Inlines inlines={b.inlines} /></p>;
        if (b.type === "list") return <ul key={i} className="list-disc space-y-1 pl-5">{b.items.map((it, j) => <li key={j}><Inlines inlines={it} /></li>)}</ul>;
        return (
          <div key={i} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>{b.header.map((c, j) => <th key={j} className="border-b border-slate-300 px-2 py-1 text-left font-medium"><Inlines inlines={c} /></th>)}</tr></thead>
              <tbody>{b.rows.map((r, j) => <tr key={j} className="odd:bg-slate-50">{r.map((c, k) => <td key={k} className="px-2 py-1 align-top"><Inlines inlines={c} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
