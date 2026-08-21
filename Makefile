.DEFAULT_GOAL := help

.PHONY: help install dev run check test build verify preview clean

help: ## Show available local development commands.
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install the locked dependency set.
	pnpm install --frozen-lockfile

dev: ## Start the Vite development server.
	pnpm dev

run: dev ## Alias for dev.

check: ## Run the TypeScript checker.
	pnpm check

test: ## Run all deterministic unit tests once.
	pnpm test

build: ## Create a production build.
	pnpm build

verify: ## Run type checks, unit tests, and the production build.
	pnpm check && pnpm test && pnpm build

preview: build ## Serve the production build locally.
	pnpm preview

clean: ## Remove local build and coverage artifacts.
	rm -rf dist coverage
