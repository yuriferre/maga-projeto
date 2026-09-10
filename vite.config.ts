import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = env.PORT ?? "3001";
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // No container de dev o Vite precisa escutar em 0.0.0.0 (VITE_HOST); local fica em localhost.
      host: env.VITE_HOST || "localhost",
      proxy: { "/api": `http://localhost:${port}` },
    },
  };
});
