# Imagem de produção: um processo Node 25 serve a API e a UI compilada na porta 3001.
# Node 25 é obrigatório (executa .ts diretamente e traz node:sqlite).

FROM node:25-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@9.15.9
COPY package.json pnpm-lock.yaml ./
# `prepare` tenta configurar hooks de git; sem git na imagem, o `|| true` do script segura.
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm content:build && pnpm typecheck && pnpm exec vite build

FROM node:25-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3001 DB_PATH=/app/data/progress.sqlite STATIC_DIR=/app/dist
RUN npm install -g pnpm@9.15.9
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && pnpm store prune
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared
COPY content ./content
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3001
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1
CMD ["node", "server/index.ts"]
