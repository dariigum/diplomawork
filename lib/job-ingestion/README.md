# Job ingestion (Stage 6A — skeleton)

Isolated contracts and a **documented** linear pipeline. There is **no** orchestration engine, cron, Telegram scraping, or browser automation in this folder.

## Intended flow (later stages wire each step)

1. **fetch** — obtain provider-specific raw payloads (HTTP, static JSON, mock module).
2. **normalize** — map to `NormalizedVacancyInput` (single shape for DB + AI).
3. **validate** — lightweight guards (required fields, length bounds, known `source`).
4. **save / upsert** — `createMongoIngestionPersistence()` / `upsertIngestionVacancy` (Stage 6C).
5. **embedding generation** — `applyIngestionVacancyEmbedding` / `persistIngestionVacancyWithEmbedding` (Stage 6D).

Earlier stages introduced interfaces only; 6C–6D wire Mongo + ML without orchestration.

## Demo without live HeadHunter

Use `mock/mock-normalized-vacancies.json` or `loadMockNormalizedVacancies()` from `lib/job-ingestion/mock`. For HH-shaped samples without network, use `mock/mock-raw-hh-vacancies.json` + `normalizeRawHhVacancy`.

## Stage 6B — minimal HH client (bounded)

- `fetchAndNormalizeHhItVacancies` in `hh/fetch-it-vacancies.ts`: paginated search + per-vacancy detail, hard caps (`maxPages`, `perPage`, `maxVacancies`), throttled requests, structured `{ ok, vacancies, skipped, meta }` (never throws).
- Configure via `resolveHhItFetchConfig` overrides or env: `HH_FETCH_MAX_PAGES`, `HH_FETCH_PER_PAGE`, `HH_FETCH_MAX_VACANCIES`, `HH_FETCH_SEARCH_QUERY`, `HH_FETCH_AREA_IDS`, `HH_API_BASE_URL`, `HH_USER_AGENT`, optional `HH_API_TOKEN`.
- Stable ids: normalized HH vacancies use `externalId` like `hh_<numericId>` from `hhStableExternalId`.

## Stage 6C — Mongo upsert (ingestion only)

- `createMongoIngestionPersistence()` in `persistence/ingestion-persistence.ts` implements `IngestionPersistencePort`.
- Upsert key: **`source` + `externalId`** (partial unique index on `Vacancy`). Manual employer rows omit these fields and are never matched.
- Updates use **`$set` only** — **`embedding` is never written**, so existing vectors stay intact.
- Optional env: `INGESTION_EMPLOYER_PASSWORD` (bcrypt source for synthetic employer accounts).

## Stage 6D — embeddings after ingestion

- `buildIngestionVacancyEmbeddingTextFull` — deterministic text (title, company, description, skills, location, work mode, employment, listing URL).
- `applyIngestionVacancyEmbedding` — loads ingestion row by id + `(source, externalId)`, optional skip if embedding exists, `getEmbedding` injectable for tests, validates vector, `$set`s `embedding` only on match. Outcomes: `embedded` | `skipped` | `failed` (never throws).
- `persistIngestionVacancyWithEmbedding` — upsert then embedding; ML failure does **not** remove the vacancy.
- `createMlVacancyEmbeddingPort` — implements `VacancyEmbeddingPort` using the same ML client (returns `null` on failure).
## Stage 6E — offline demo stability

### Dataset

- File: **`data/demo-ingestion-vacancies.json`** — realistic IT roles (ML/NLP, frontend, backend Go, DevOps/K8s, Flutter, data engineering, SRE, full-stack, appsec). All rows use **`source: "SEED"`** and stable **`externalId`** values (`SEED:…`) for idempotent re-seeding.
- Loader: **`loadOfflineDemoVacancyInputs()`** in `mock/load-offline-demo-dataset.ts`.

### Offline HH fetch (no `api.hh.ru`)

- Set **`JOBFLOW_OFFLINE_INGESTION=1`** or **`JOBFLOW_OFFLINE_DEMO=1`** (see `.env.example`).
- **`fetchAndNormalizeHhItVacancies`** then returns the same **`HhIngestionResult`** shape from local JSON (`meta.offlineDemo: true`) — **no HTTP** to HeadHunter.

### Seeding through the real ingestion pipeline

- Command: **`npm run ingestion:demo`**
- Flow: clear prior **`SEED`** vacancies (+ orphan synthetic `ing+*@jobflow.ingestion` employers) → **`persistIngestionVacancyWithEmbedding`** for each JSON row (Mongo upsert + **`getEmbedding`** when ML is reachable).
- For **recommendation / behaviour smoke**, run **`npm run seed:demo`** first (demo employee + resume + classic demo vacancies). Ingestion demo **adds** SEED vacancies without replacing manual `@demo.jobflow.local` accounts.

### Thesis / defence checklist

1. Start Mongo + ML embed service (same as production).  
2. `npm run seed:demo` — accounts + legacy demo vacancies + resume embeddings.  
3. `npm run ingestion:demo` — ingestion-architecture vacancies with vectors.  
4. With **`JOBFLOW_OFFLINE_INGESTION=1`**, any code path calling **`fetchAndNormalizeHhItVacancies`** stays usable without HH keys.

