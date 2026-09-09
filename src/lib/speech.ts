const PREFERRED_VOICES = ["Samantha", "Daniel", "Karen", "Moira", "Google US English", "Google UK English Female", "Google UK English Male"];

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSynthesisSupported()) return Promise.resolve([]);
  const english = () => window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const now = english();
  if (now.length > 0) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => { window.speechSynthesis.removeEventListener("voiceschanged", done); resolve(english()); };
    window.speechSynthesis.addEventListener("voiceschanged", done);
    setTimeout(done, 700);
  });
}

/** Voz preferida; com index > 0 alterna entre vozes para diferenciar falantes. */
export function pickVoice(voices: SpeechSynthesisVoice[], index = 0): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;
  const preferred = PREFERRED_VOICES.map((name) => voices.find((v) => v.name === name)).filter((v): v is SpeechSynthesisVoice => Boolean(v));
  const ordered = [...preferred, ...voices.filter((v) => !preferred.includes(v))];
  return ordered[index % ordered.length];
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
}

export function speak(text: string, opts: { voice?: SpeechSynthesisVoice; rate?: number } = {}): Promise<void> {
  if (!isSpeechSynthesisSupported()) return Promise.reject(new Error("Síntese de voz não disponível neste navegador."));
  stopSpeaking();
  return new Promise((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = opts.voice?.lang ?? "en-US";
    if (opts.voice) u.voice = opts.voice;
    u.rate = opts.rate ?? 0.95;
    u.onend = () => resolve();
    u.onerror = (e) => (e.error === "interrupted" || e.error === "canceled" ? resolve() : reject(new Error(e.error)));
    window.speechSynthesis.speak(u);
  });
}

// ---- Reconhecimento de fala (Chrome). Tipos mínimos declarados aqui para não depender de @types externos.
type RecognitionEvent = { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void; stop(): void; abort(): void;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function isRecognitionSupported(): boolean {
  return recognitionCtor() !== undefined;
}

export function startRecognition(opts: { onResult(transcript: string, isFinal: boolean): void; onEnd(): void; onError(message: string): void }): { stop(): void } {
  const Ctor = recognitionCtor();
  if (!Ctor) { opts.onError("Reconhecimento de fala não disponível. Use o Google Chrome."); return { stop() {} }; }
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.continuous = true;
  rec.interimResults = true;
  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]!;
      const t = r[0]?.transcript ?? "";
      if (r.isFinal) finalText += `${t} `;
      else interim += t;
    }
    opts.onResult(`${finalText}${interim}`.trim(), interim === "");
  };
  rec.onend = () => opts.onEnd();
  rec.onerror = (e) => opts.onError(e.error === "not-allowed" ? "Permissão de microfone negada." : `Erro no reconhecimento: ${e.error}`);
  rec.start();
  return { stop: () => rec.stop() };
}
