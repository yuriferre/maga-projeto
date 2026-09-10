# Atalhos do projeto. `make` (sem alvo) lista tudo.
.DEFAULT_GOAL := help
SHELL := /bin/bash
COMPOSE := docker compose
DB := data/progress.sqlite

.PHONY: help install content dev build test typecheck check docker-build up down restart logs shell dev-up dev-down backup-db clean

help: ## Lista os alvos disponíveis
	@awk 'BEGIN {FS = ":.*##"; printf "Uso: make <alvo>\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-13s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# ---------- local (Node 25 + pnpm) ----------
install: ## Instala dependências e ativa os hooks de git
	pnpm install

content: ## Valida content/ e gera src/generated/content.json
	pnpm content:build

dev: content ## Sobe servidor (:3001) e cliente (:5173) localmente
	pnpm dev

build: ## content + typecheck + vite build
	pnpm build

test: ## Roda a suíte (vitest)
	pnpm test

typecheck: ## tsc --noEmit
	pnpm typecheck

check: test build ## O que os hooks de git rodam: suíte + content + typecheck + build

# ---------- Docker ----------
docker-build: ## Constrói a imagem de produção
	$(COMPOSE) build app

up: ## Sobe o container de produção: UI + API em http://localhost:3001 (banco em ./data)
	$(COMPOSE) up -d app
	@echo "→ http://localhost:3001"

down: ## Derruba os containers (produção e dev)
	$(COMPOSE) --profile dev down

restart: down up ## Reinicia o container de produção

logs: ## Acompanha os logs do container de produção
	$(COMPOSE) logs -f app

shell: ## Abre um shell no container de produção
	$(COMPOSE) exec app sh

dev-up: ## Container de desenvolvimento: Vite :5173 + API :3001 com hot reload (Ctrl+C para sair)
	$(COMPOSE) --profile dev up dev

dev-down: ## Derruba o container de desenvolvimento
	$(COMPOSE) --profile dev down

# ---------- dados ----------
backup-db: ## Copia data/progress.sqlite com data e hora no nome
	@test -f $(DB) || { echo "sem $(DB)"; exit 1; }
	cp $(DB) $(DB:.sqlite=)-$(shell date +%Y%m%d-%H%M%S).sqlite
	@ls -1 data/*.sqlite

clean: ## Remove dist/ e src/generated/
	rm -rf dist src/generated
