# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Express API server for building an AI knowledge base for Voiceflow assistants. It ingests content from URLs, sitemaps, PDFs, PowerPoint, text/markdown files, and images, creates embeddings with OpenAI via LangChain, stores them in a local OpenSearch vector store, and answers questions against those collections. Redis is used as an LLM response cache, and the Unstructured API container handles non-PDF file parsing (images, ppt, txt, md).

## Commands

```bash
cp .env.example .env      # required first — set OPENAI_API_KEY at minimum
yarn build                # docker-compose up -d --build, then yarn start
yarn start                # yarn install + node --no-warnings app.js
yarn test                 # run all Jest tests
yarn test:watch           # watch mode
yarn test:coverage        # with coverage
npx jest __tests__/sanitize.test.js           # run a single test file
npx jest -t "should sanitize collection names" # run tests matching a name
```

Docker services (from `docker-compose.yml`): `redis` (6379), `unstructured` (8000), `opensearch` (9200/9600), `opensearch-dashboards` (5601, dashboard at http://localhost:5601). The app itself runs on the host (port from `.env`, default 3000), not in Docker.

There is no linter configured.

## Architecture

### Two parallel code structures — read this first

The runtime entry point is **`app.js`, a self-contained monolith**. It defines all live API endpoints and its own helper functions, and imports **nothing** from `src/`.

`src/` contains a modular refactor (Phases 1–2) that is **not yet wired into the running app**: routers built via `initialize*Routes()` factories (`src/routes/`), service classes (`src/services/`), Express middleware (`src/middleware/`), and utilities (`src/utils/`). Helpers like `sanitize`, `cleanText`, `getFileType`, `getUrlFilename`, and `fetchAndSaveFile` exist in *both* `app.js` and `src/utils/`, and they have diverged — e.g. the `src/utils/textUtils.js` version of `sanitize()` lowercases the collection name while the `app.js` version does not.

Practical consequences:
- To change live endpoint behavior, edit `app.js`.
- If you change a helper, check for its duplicate in the other location and keep them consistent (or take the opportunity to wire `src/` into `app.js`).
- `app.js` has import-time side effects (connects to Redis, starts the HTTP server), so its functions cannot be imported into tests — which is why the root-level tests re-implement its helpers inline (see Testing below).

### Live endpoints (app.js)

- `GET /api/health`, `GET /api/clearcache`
- `POST /api/add` — main ingestion endpoint. Dispatches on `getFileType(url)`: plain URL/HTML → Cheerio loader; `sitemap.xml` → parses and iterates URLs (responds `"started"` while processing continues); `.pdf` → downloaded and parsed with PDFLoader; images/ppt/txt/md → downloaded and sent to the Unstructured API (`UNSTRUCTURED_URL`). All paths split text with `RecursiveCharacterTextSplitter`, strip metadata OpenSearch can't index (`loc`, `pdf`, etc.), and write to `OpenSearchVectorStore` under the sanitized collection name.
- `DELETE /api/collection` — deletes an OpenSearch index.
- `POST /api/question` — RAG query via `VectorDBQAChain` against a collection, returning the answer plus deduplicated `sources`; falls back to a plain LLM prompt if the collection doesn't exist.
- `POST /api/live` — answers using a live webpage as context via LangChain's `WebBrowser` tool.

Collection names are sanitized before any OpenSearch operation (special chars stripped, spaces → hyphens).

### Unwired src/ modules

- `src/routes/` + `src/services/` — collections CRUD/search/stats (`CollectionService` talks to the OpenSearch indices API directly), batch URL processing with in-memory job tracking (`BatchService`), and detailed dependency health checks (`HealthService`).
- `src/middleware/errorHandler.js` — global error handler and `asyncHandler` wrapper used by all `src/routes/`.
- `src/middleware/validation.js` + `src/utils/validationUtils.js` — per-endpoint request validation (URL format, collection name, chunk size/overlap, etc.).

### Module system

`package.json` has `"type": "module"` — all `.js` files are ESM. Jest configs are `.cjs` for this reason, and tests are transformed through `babel-jest` (`babel.config.cjs` targets current Node). LangChain is pinned to the legacy 0.1.x API (`langchain/llms/openai`, `langchain/vectorstores/opensearch` import paths).

## Testing

Tests live in `__tests__/` and follow two patterns:

1. **Root-level tests** (`sanitize.test.js`, `fileType.test.js`, etc.) test `app.js` helper logic by **re-implementing the functions inline**, because `app.js` can't be imported without starting the server. If you change a helper in `app.js`, update the corresponding inline copy in these tests.
2. **`__tests__/utils/`, `__tests__/services/`, `__tests__/api/`** import directly from `src/` modules and use `jest.mock()` for external dependencies (redis, opensearch, langchain).

Tests do not require the Docker services to be running.

## Environment Variables

Defined in `.env.example`: `PORT`, `OPENAI_API_KEY`, `UNSTRUCTURED_URL`, `REDIS_URL`, `OPENSEARCH_URL`, `OPENSEARCH_DEFAULT_INDEX` (default collection for add/question), `DOCS_DIRECTORY` (where downloaded files are saved).
