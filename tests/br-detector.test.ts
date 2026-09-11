import { describe, it, expect } from "vitest";
import { detectBrErrors } from "../shared/br-detector.ts";
import { loadContent } from "../shared/content-loader.ts";

const patterns = loadContent("content").brErrors;
const tagsOf = (text: string) => detectBrErrors(text, patterns).map((f) => f.tag);

describe("detectBrErrors", () => {
  it("flags 'I have a doubt'", () => {
    expect(tagsOf("I have a doubt about the runner.")).toContain("br.doubt");
  });
  it("flags present continuous + since", () => {
    expect(tagsOf("I'm working on this since yesterday.")).toContain("br.since-present");
    expect(tagsOf("I am working on this since Monday")).toContain("br.since-present");
  });
  it("does NOT flag the correct present perfect + since", () => {
    expect(tagsOf("I've been working on this since yesterday.")).not.toContain("br.since-present");
  });
  it("flags 'until' used as a deadline after finish/done", () => {
    expect(tagsOf("I will finish it until Friday.")).toContain("br.until-by");
    expect(tagsOf("I'll be working on it until Friday.")).not.toContain("br.until-by");
  });
  it("flags 'giving error'", () => {
    expect(tagsOf("The job is giving error again")).toContain("br.giving-error");
  });
  it("flags 'waiting the'", () => {
    expect(tagsOf("I'm waiting the review")).toContain("br.waiting-no-prep");
    expect(tagsOf("I'm waiting on the review")).not.toContain("br.waiting-no-prep");
  });
  it("flags 'explain me'", () => {
    expect(tagsOf("Can you explain me the setup?")).toContain("br.explain-me");
  });
  it("flags 'pretend to' and 'assist the meeting'", () => {
    expect(tagsOf("I pretend to finish today")).toContain("br.pretend");
    expect(tagsOf("I will assist the meeting")).toContain("br.assist");
  });
  it("returns findings ordered by index with match text", () => {
    const findings = detectBrErrors("I have a doubt. It's giving error.", patterns);
    expect(findings.map((f) => f.tag)).toEqual(["br.doubt", "br.giving-error"]);
    expect(findings[0]!.match.toLowerCase()).toContain("doubt");
    expect(findings[0]!.index).toBeLessThan(findings[1]!.index);
  });
  it("returns an empty array for clean text", () => {
    expect(detectBrErrors("I've been working on this since Monday and I'm blocked on access.", patterns)).toEqual([]);
  });
  it("does not flag ordinary correct English (false-positive guard)", () => {
    const clean = [
      "I have some doubts about this migration plan.",
      "I am changing my approach since it's cleaner.",
      "I won't be done until Friday.",
      "I borrowed his laptop; I'll have it until Friday.",
      "I'm just waiting a minute for the kettle.",
      "The kids pretended to be pirates all afternoon.",
      "Actually I'm not sure that's right.",
      "In the last week we shipped two releases.",
      "I have 10 years of experience in software development.",
      "She wins money every time she plays the lottery.",
      "The signal is bad, I'm losing the call.",
      "I've been waiting a long time for the review.",
      "I was waiting a full hour.",
      "The number of people is growing.",
      "The list of people is long.",
      "Can you explain them?",
      "I lost the meeting notes.",
      "It gives an error when the token expires.",
      "We have 3 years left.",
      "I'm going to do it since Monday's meeting was cancelled.",
      "The office is open until late.",
    ];
    for (const s of clean) expect(detectBrErrors(s, patterns), s).toEqual([]);
  });
  it("flags 'actually' used as 'currently' only with an explicit present-time context", () => {
    expect(tagsOf("Actually I'm working at a bank now.")).toContain("br.actually");
    expect(tagsOf("Actually we are using Terraform these days.")).toContain("br.actually");
    expect(tagsOf("I actually work at Nubank nowadays.")).toContain("br.actually");
  });
  it("does NOT flag the correct uses of 'actually' or of 'depend on'", () => {
    const clean = [
      "Actually I'm not sure that's right.",
      "Actually, yeah, Marcos can pair with me.",
      "It's actually working now.",
      "Actually I finished it yesterday.",
      "It depends on the runner.",
      "The dependency of the module is outdated.",
    ];
    for (const s of clean) expect(detectBrErrors(s, patterns), s).toEqual([]);
    expect(tagsOf("It depends of the runner.")).toContain("br.depend-of");
  });
  it("still flags the narrowed calques", () => {
    expect(tagsOf("Any doubts?")).toContain("br.doubt");
    expect(tagsOf("I have 30 years.")).toContain("br.have-years");
    expect(tagsOf("I will be ready until Friday.")).toContain("br.until-by");
    expect(tagsOf("I want to win a good salary.")).toContain("br.win-money");
    expect(tagsOf("We lost the deadline again.")).toContain("br.lose-the-deadline");
    expect(tagsOf("I'm waiting you in the call.")).toContain("br.waiting-no-prep");
    expect(tagsOf("We pretend to deploy on Friday.")).toContain("br.pretend");
    expect(tagsOf("I stayed until late to fix it.")).toContain("br.until-late");
  });
});
