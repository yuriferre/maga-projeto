import { useEffect } from "react";
import { api } from "./api.ts";

const INTERVAL_MS = 60_000;

/** Mantém a sessão de estudo viva enquanto a aba está visível. Erros de rede são silenciosos. */
export function useStudyHeartbeat(): void {
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      api.heartbeat().catch((err: Error) => console.warn("heartbeat falhou:", err.message));
    };
    beat();
    const timer = window.setInterval(beat, INTERVAL_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);
}
