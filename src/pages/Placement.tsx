import { api } from "../lib/api.ts";
import { PlacementFlow } from "../components/placement/PlacementFlow.tsx";

export function Placement() {
  return (
    <PlacementFlow
      refId="placement"
      title="Teste inicial"
      flowApi={{
        state: api.placementState,
        submitWriting: api.submitPlacementWriting,
        submitSpeaking: api.submitPlacementSpeaking,
        finish: api.finishPlacement,
      }}
    />
  );
}
