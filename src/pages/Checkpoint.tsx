import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, type CheckpointState } from "../lib/api.ts";
import { Card } from "../components/ui/Card.tsx";
import { PlacementFlow } from "../components/placement/PlacementFlow.tsx";

/** Checkpoint de 4 semanas: mesmo formato do teste inicial, para comparação direta na linha do tempo. */
export function Checkpoint() {
  const [state, setState] = useState<CheckpointState | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.checkpointState().then(setState).catch((e: Error) => setError(e.message)); }, []);

  if (error) return <p className="text-rose-700">Servidor não respondeu ({error}).</p>;
  if (!state) return <p className="text-slate-500">Carregando…</p>;

  if (!state.due && !state.latest) {
    return (
      <Card>
        <h1 className="text-xl font-semibold">Checkpoint de 4 semanas</h1>
        <p className="mt-1 text-sm text-slate-600">
          {state.lastAt === null
            ? "O checkpoint abre 4 semanas depois do teste inicial — faça o teste primeiro."
            : `Próximo checkpoint em ${state.nextAt ? new Date(state.nextAt).toLocaleDateString("pt-BR") : "—"}.`}
        </p>
        <Link to={state.lastAt === null ? "/placement" : "/"} className="mt-3 inline-block text-sm text-indigo-700 hover:underline">
          {state.lastAt === null ? "Ir para o teste inicial" : "Voltar ao painel"}
        </Link>
      </Card>
    );
  }

  return (
    <PlacementFlow
      refId="checkpoint"
      title="Checkpoint de 4 semanas"
      flowApi={{
        state: api.checkpointState,
        submitWriting: api.submitCheckpointWriting,
        submitSpeaking: api.submitCheckpointSpeaking,
        finish: api.finishCheckpoint,
      }}
    />
  );
}
