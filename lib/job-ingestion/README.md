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
