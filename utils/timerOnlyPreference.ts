const BULK_TIMER_MINUTES_KEY = 'physio-bulk-timer-minutes';
const bedTimerOnlyKey = (bedId: number) => `physio-bed-${bedId}-timer-only`;
const TIMER_ONLY_PREF_CHANGED_EVENT = 'physio:timer-only-pref-changed';

export const DEFAULT_TIMER_ONLY_MINUTES = 11;
export const DEFAULT_BED_COUNT = 11;

const emitTimerOnlyPrefChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(TIMER_ONLY_PREF_CHANGED_EVENT));
};

export const getTimerOnlyPrefChangedEventName = () => TIMER_ONLY_PREF_CHANGED_EVENT;

export const getBulkTimerMinutes = (fallback: number = DEFAULT_TIMER_ONLY_MINUTES): number => {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(BULK_TIMER_MINUTES_KEY);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.round(parsed);
};

export const getBedTimerOnlyPreference = (bedId: number): boolean => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(bedTimerOnlyKey(bedId)) === '1';
};

export const setBedTimerOnlyPreference = (bedId: number, enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(bedTimerOnlyKey(bedId), enabled ? '1' : '0');
  emitTimerOnlyPrefChanged();
};

export const setAllBedsTimerOnlyPreference = (enabled: boolean, maxBedId: number = DEFAULT_BED_COUNT): void => {
  if (typeof window === 'undefined') return;
  for (let bedId = 1; bedId <= maxBedId; bedId += 1) {
    window.localStorage.setItem(bedTimerOnlyKey(bedId), enabled ? '1' : '0');
  }
  emitTimerOnlyPrefChanged();
};

export const setBulkTimerMinutes = (minutes: number): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BULK_TIMER_MINUTES_KEY, String(Math.max(1, Math.round(minutes))));
};
