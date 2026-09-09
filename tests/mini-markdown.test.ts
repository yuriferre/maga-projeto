import { describe, it, expect } from "vitest";
import { parseInline, parseMarkdown } from "../shared/mini-markdown.ts";

describe("parseInline", () => {
  it("splits bold, italic and code", () => {
    expect(parseInline("I**'ve fixed** it *now* `x`")).toEqual([
      { type: "text", text: "I" }, { type: "bold", text: "'ve fixed" }, { type: "text", text: " it " },
      { type: "italic", text: "now" }, { type: "text", text: " " }, { type: "code", text: "x" },
    ]);
  });
  it("leaves a lone asterisk alone and still parses a real italic later", () => {
    expect(parseInline("a * b *c* d")).toEqual([
      { type: "text", text: "a * b " }, { type: "italic", text: "c" }, { type: "text", text: " d" },
    ]);
  });
});

describe("parseMarkdown", () => {
  it("parses paragraphs, lists and tables", () => {
    const blocks = parseMarkdown(`Intro **here**.\n\n- one\n- two\n\n| A | B |\n|---|---|\n| 1 | **2** |\n| 3 | 4 |\n\nEnd.`);
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "list", "table", "paragraph"]);
    const table = blocks[2] as Extract<(typeof blocks)[number], { type: "table" }>;
    expect(table.header.map((c) => c[0]?.text)).toEqual(["A", "B"]);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]?.[1]?.[0]).toEqual({ type: "bold", text: "2" });
    const list = blocks[1] as Extract<(typeof blocks)[number], { type: "list" }>;
    expect(list.items).toHaveLength(2);
  });
  it("keeps single newlines inside a paragraph as spaces", () => {
    const [p] = parseMarkdown("line one\nline two");
    expect(p?.type).toBe("paragraph");
    expect((p as { inlines: { text: string }[] }).inlines[0]?.text).toBe("line one line two");
  });
});
