import { useRef, useState } from "react";
import { api } from "../../lib/api.ts";
import { Button } from "../ui/Button.tsx";
import { Card } from "../ui/Card.tsx";

/** Backup completo: exporta todas as tabelas em JSON; importar substitui os dados atuais. */
export function DataCard({ onImported }: { onImported(): void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const doExport = async () => {
    setBusy(true); setMessage(null);
    try {
      const file = await api.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `maga-backup-${file.exportedAt.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMessage(`Falha ao exportar (${(e as Error).message}).`);
    } finally {
      setBusy(false);
    }
  };

  const doImport = async (file: File) => {
    if (!window.confirm("Importar substitui TODOS os dados atuais pelos do arquivo. Continuar?")) return;
    setBusy(true); setMessage(null);
    try {
      const { imported } = await api.importData(JSON.parse(await file.text()));
      const total = Object.values(imported).reduce((s, n) => s + n, 0);
      setMessage(`Importado: ${total} linha(s).`);
      onImported();
    } catch (e) {
      setMessage(`Falha ao importar (${(e as Error).message}).`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card>
      <h2 className="font-medium">Dados</h2>
      <p className="mt-1 text-sm text-slate-600">Backup em JSON de todo o progresso (tentativas, avaliações, cards, metas). Importar substitui os dados atuais.</p>
      <div className="mt-3 flex items-center gap-3">
        <Button variant="secondary" disabled={busy} onClick={doExport}>Exportar</Button>
        <Button variant="ghost" disabled={busy} onClick={() => fileRef.current?.click()}>Importar…</Button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); }} />
      </div>
      {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
    </Card>
  );
}
