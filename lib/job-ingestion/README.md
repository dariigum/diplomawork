# Job ingestion (Stage 6A — skeleton)

Isolated contracts and a **documented** linear pipeline. There is **no** orchestration engine, cron, Telegram scraping, or browser automation in this folder.

## Intended flow (later stages wire each step)

1. **fetch** — obtain provider-specific raw payloads (HTTP, static JSON, mock module).
2. **normalize** — map to `NormalizedVacancyInput` (single shape for DB + AI).
3. **validate** — lightweight guards (required fields, length bounds, known `source`).
4. **save / upsert** — `IngestionPersistencePort` (implemented later; Mongo or other store).
5. **embedding generation** — `VacancyEmbeddingPort` (implemented later; calls existing ML stack).

Stages 4–5 are **interfaces / placeholders** in 6A so recommendation and semantic search code can stay untouched until persistence and ML are hooked up deliberately.

## Demo without live HeadHunter

Use `mock/mock-normalized-vacancies.json` or `loadMockNormalizedVacancies()` from `lib/job-ingestion/mock`. For HH-shaped samples without network, use `mock/mock-raw-hh-vacancies.json` + `normalizeRawHhVacancy`.

## Stage 6B — minimal HH client (bounded)

- `fetchAndNormalizeHhItVacancies` in `hh/fetch-it-vacancies.ts`: paginated search + per-vacancy detail, hard caps (`maxPages`, `perPage`, `maxVacancies`), throttled requests, structured `{ ok, vacancies, skipped, meta }` (never throws).
- Configure via `resolveHhItFetchConfig` overrides or env: `HH_FETCH_MAX_PAGES`, `HH_FETCH_PER_PAGE`, `HH_FETCH_MAX_VACANCIES`, `HH_FETCH_SEARCH_QUERY`, `HH_FETCH_AREA_IDS`, `HH_API_BASE_URL`, `HH_USER_AGENT`, optional `HH_API_TOKEN`.
## Stage 6C — Mongo upsert (ingestion only)

- `createMongoIngestionPersistence()` in `persistence/ingestion-persistence.ts` implements `IngestionPersistencePort`.
- Upsert key: **`source` + `externalId`** (partial unique index on `Vacancy`). Manual employer rows omit these fields and are never matched.
- Updates use **`$set` only** — **`embedding` is never written**, so existing vectors stay intact.
- Optional env: `INGESTION_EMPLOYER_PASSWORD` (bcrypt source for synthetic employer accounts).
