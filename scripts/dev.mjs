// Sobe servidor (Hono) e cliente (Vite) juntos, com prefixo nas linhas, e encerra os dois no Ctrl+C.
import { spawn } from "node:child_process";

const ESC = String.fromCharCode(27);
const procs = [
  { name: "server", color: `${ESC}[36m`, cmd: "pnpm", args: ["dev:server"] },
  { name: "client", color: `${ESC}[35m`, cmd: "pnpm", args: ["dev:client"] },
];

const children = procs.map((p) => {
  const child = spawn(p.cmd, p.args, { stdio: ["ignore", "pipe", "pipe"], env: process.env });
  const prefix = `${p.color}[${p.name}]${ESC}[0m `;
  const pipe = (stream, out) => {
    let buf = "";
    stream.on("data", (chunk) => {
      buf += chunk.toString();
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) out.write(prefix + line + "\n");
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on("exit", (code) => {
    process.stdout.write(`${prefix}saiu com código ${code}\n`);
  });
  return child;
});

const shutdown = () => {
  for (const c of children) c.kill("SIGTERM");
  setTimeout(() => process.exit(0), 300);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
