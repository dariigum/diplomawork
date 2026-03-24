export const SAVED_VACANCIES_UPDATED_EVENT = 'saved-vacancies-updated';

export function emitSavedVacanciesUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SAVED_VACANCIES_UPDATED_EVENT));
}
