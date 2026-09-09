const CONTRACTIONS: Record<string, string> = {
  "i've": "i have", "i'm": "i am", "i'll": "i will", "i'd": "i would",
  "it's": "it is", "that's": "that is", "there's": "there is", "what's": "what is", "who's": "who is",
  "he's": "he is", "she's": "she is", "it'll": "it will",
  "we've": "we have", "we're": "we are", "we'll": "we will",
  "they've": "they have", "they're": "they are", "they'll": "they will",
  "you've": "you have", "you're": "you are", "you'll": "you will",
  "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
  "didn't": "did not", "don't": "do not", "doesn't": "does not",
  "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not",
  "won't": "will not", "wouldn't": "would not", "can't": "cannot", "couldn't": "could not", "shouldn't": "should not",
  "let's": "let us", "could've": "could have", "should've": "should have", "would've": "would have",
};

/** Minúsculas + contrações expandidas, para comparar transcrição (STT) com frases-alvo. */
export function expandContractions(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .toLowerCase()
    .replace(/\b[a-z]+'[a-z]+\b/g, (m) => CONTRACTIONS[m] ?? m);
}

export function tokenizeWords(text: string): string[] {
  return expandContractions(text)
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function matchTargetPhrases(transcript: string, targets: string[]): { used: string[]; missing: string[] } {
  const haystack = ` ${tokenizeWords(transcript).join(" ")} `;
  const used: string[] = [];
  const missing: string[] = [];
  for (const t of targets) {
    const needle = ` ${tokenizeWords(t).join(" ")} `;
    (haystack.includes(needle) ? used : missing).push(t);
  }
  return { used, missing };
}

export function wordsPerMinute(wordCount: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.round((wordCount / seconds) * 60);
}
