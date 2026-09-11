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
  it.each([
    "I stayed until late to fix it.",
    "I worked until late last night.",
    "We were working until late in the evening.",
  ])("does not flag valid until late usage: %s", (sentence) => {
    // A antiga asserção positiva confundia preferência por concisão com erro gramatical.
    expect(detectBrErrors(sentence, patterns)).toEqual([]);
  });
  it("flags 'do/did + modal' only as the calque", () => {
    expect(tagsOf("Do you can check the logs?")).toContain("br.do-modal");
    expect(tagsOf("Did you could reproduce it?")).toContain("br.do-modal");
    expect(tagsOf("Doesn't she can approve it?")).toContain("br.do-modal");
    expect(tagsOf("Do you have a minute?")).not.toContain("br.do-modal");
    expect(tagsOf("Do you think you can check the logs?")).not.toContain("br.do-modal");
    expect(tagsOf("I don't think it can wait.")).not.toContain("br.do-modal");
  });
  it("flags 'sorry for interrupt' but not the -ing or to-forms", () => {
    expect(tagsOf("Sorry for interrupt.")).toContain("br.sorry-for-interrupt");
    expect(tagsOf("Sorry for jump in.")).toContain("br.sorry-for-interrupt");
    expect(tagsOf("Sorry to interrupt.")).not.toContain("br.sorry-for-interrupt");
    expect(tagsOf("Sorry for interrupting.")).not.toContain("br.sorry-for-interrupt");
    expect(tagsOf("Sorry for the interruption.")).not.toContain("br.sorry-for-interrupt");
  });
  it("flags 'need that you' as the 'preciso que você' calque", () => {
    expect(tagsOf("I need that you check the config.")).toContain("br.need-that-you");
    expect(tagsOf("I need you to check the config.")).not.toContain("br.need-that-you");
    expect(tagsOf("I need that file. You can check the rest.")).not.toContain("br.need-that-you");
  });
  it("flags do/did + past-tense forms only", () => {
    expect(tagsOf("I didn't understood the error.")).toContain("br.did-past");
    expect(tagsOf("Did you tried a restart?")).toContain("br.did-past");
    expect(tagsOf("She doesn't knew about it.")).toContain("br.did-past");
    const clean = [
      "Did you try a restart?",
      "It worked.",
      "I don't need anything else.",
      "Do you feed the alerts into the dashboard?",
      "Did you read the runbook?",
      "Did you found the company before joining?",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.did-past");
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
      "Actually I am running low on time, but currently we are blocked.",
      "Actually, I am thinking about it, currently leaning yes.",
      "Actually he is joking, currently nobody believes him.",
    ];
    for (const s of clean) expect(detectBrErrors(s, patterns), s).toEqual([]);
    expect(tagsOf("It depends of the runner.")).toContain("br.depend-of");
  });
  it("flags 'said me' but not 'told me' or 'said to me'", () => {
    expect(tagsOf("She said me to check the logs.")).toContain("br.said-me");
    expect(tagsOf("Marcos says me the freeze starts tomorrow.")).toContain("br.said-me");
    expect(tagsOf("She told me to check the logs.")).not.toContain("br.said-me");
    expect(tagsOf("He said to me the fix was live.")).not.toContain("br.said-me");
    expect(tagsOf("He said, 'me too'.")).not.toContain("br.said-me");
    expect(tagsOf("What did she say? Me, I think it's fine.")).not.toContain("br.said-me");
  });
  it("flags 'ask to + pronoun' only", () => {
    expect(tagsOf("Ask to him about the freeze.")).toContain("br.ask-to");
    expect(tagsOf("You can ask to her in the thread.")).toContain("br.ask-to");
    expect(tagsOf("Ask him about the freeze.")).not.toContain("br.ask-to");
    expect(tagsOf("Ask to join the huddle.")).not.toContain("br.ask-to");
    expect(tagsOf("May I ask you to check?")).not.toContain("br.ask-to");
  });
  it("flags preposition + 'next <period>' but not possessives", () => {
    expect(tagsOf("The deploy is on next week.")).toContain("br.on-next");
    expect(tagsOf("I'll pick this up in next Monday.")).toContain("br.on-next");
    expect(tagsOf("I'll pick this up next week.")).not.toContain("br.on-next");
    expect(tagsOf("Let's review it in next week's planning.")).not.toContain("br.on-next");
    expect(tagsOf("See you on the next call.")).not.toContain("br.on-next");
  });
  it("flags 'send to me the X' word-order calque only", () => {
    expect(tagsOf("Can you send to me the runbook?")).toContain("br.send-to-me");
    expect(tagsOf("She forwarded to me the thread.")).toContain("br.send-to-me");
    expect(tagsOf("Send me the runbook.")).not.toContain("br.send-to-me");
    expect(tagsOf("Send the runbook to me.")).not.toContain("br.send-to-me");
    expect(tagsOf("She replied to me.")).not.toContain("br.send-to-me");
  });
  it("flags 'for to' but not legitimate 'for' or 'to' sequences", () => {
    expect(tagsOf("I read the doc for to find the flag.")).toContain("br.for-to");
    expect(tagsOf("I checked the log for to see the error.")).toContain("br.for-to");
    expect(tagsOf("For me, to read logs is the hard part.")).not.toContain("br.for-to");
    expect(tagsOf("I bought it for two dollars.")).not.toContain("br.for-to");
    expect(tagsOf("She works for TOTVS.")).not.toContain("br.for-to");
  });
  it("flags wrong -ed forms of irregular verbs only", () => {
    expect(tagsOf("I readed the error message.")).toContain("br.irregular-past");
    expect(tagsOf("We finded the root cause in the trace.")).toContain("br.irregular-past");
    expect(tagsOf("He thinked the flag was deprecated.")).toContain("br.irregular-past");
    const clean = [
      "I read the log yesterday.",
      "We seeded the database before the test.",
      "She needed more time to read the RFC.",
      "They agreed on the rollout plan.",
      "He sawed through the branch with a hand saw.",
      "The batter flied out to center field.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.irregular-past");
  });
  it("flags 'more + -er adjective' calques only", () => {
    expect(tagsOf("This doc is more easy to read.")).toContain("br.more-er");
    expect(tagsOf("The new UI is more fast.")).toContain("br.more-er");
    const clean = [
      "This doc is easier to read.",
      "The new UI is faster.",
      "It is more detailed than the old one.",
      "It is more or less the same.",
      "We need more specific examples.",
    ];
    for (const s of clean) expect(tagsOf(s), s).not.toContain("br.more-er");
  });
  it("flags 'in the internet' but not attributive 'internet' uses", () => {
    expect(tagsOf("I found the workaround in the internet.")).toContain("br.in-the-internet");
    expect(tagsOf("On the internet nobody knows.")).not.toContain("br.in-the-internet");
    expect(tagsOf("In the internet age, docs are online.")).not.toContain("br.in-the-internet");
    expect(tagsOf("I found it online.")).not.toContain("br.in-the-internet");
  });
  it("flags 'didn't saw' and 'had a doubt' after the catalog extensions", () => {
    expect(tagsOf("I didn't saw your comment on the issue.")).toContain("br.did-past");
    expect(tagsOf("I had a doubt about the chart.")).toContain("br.doubt");
    expect(tagsOf("I saw your comment.")).not.toContain("br.did-past");
    expect(tagsOf("I had doubts about his story.")).not.toContain("br.doubt");
  });
  it("still flags the narrowed calques", () => {
    expect(tagsOf("Any doubts?")).toContain("br.doubt");
    expect(tagsOf("I have 30 years.")).toContain("br.have-years");
    expect(tagsOf("I will be ready until Friday.")).toContain("br.until-by");
    expect(tagsOf("I want to win a good salary.")).toContain("br.win-money");
    expect(tagsOf("We lost the deadline again.")).toContain("br.lose-the-deadline");
    expect(tagsOf("I'm waiting you in the call.")).toContain("br.waiting-no-prep");
    expect(tagsOf("We pretend to deploy on Friday.")).toContain("br.pretend");
  });
});
