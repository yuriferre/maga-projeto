import { useEffect, useState } from "react";
import { loadVoices, pickVoice, speak, stopSpeaking, isSpeechSynthesisSupported } from "../../lib/speech.ts";

type Props = { text: string; voiceIndex?: number; rate?: number; label?: string; small?: boolean };

export function SpeakButton({ text, voiceIndex = 0, rate = 0.95, label = "Ouvir", small = false }: Props) {
  const [playing, setPlaying] = useState(false);
  const supported = isSpeechSynthesisSupported();
  useEffect(() => () => stopSpeaking(), []);

  const play = async () => {
    if (playing) { stopSpeaking(); setPlaying(false); return; }
    setPlaying(true);
    try {
      const voices = await loadVoices();
      await speak(text, { voice: pickVoice(voices, voiceIndex), rate });
    } finally {
      setPlaying(false);
    }
  };

  if (!supported) return null;
  return (
    <button type="button" onClick={play} title={label} className={`rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 ${small ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"}`}>
      {playing ? "◼" : "▶"} {small ? "" : label}
    </button>
  );
}
