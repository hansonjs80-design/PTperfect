
import { useState, useCallback, useEffect } from 'react';

const LOCAL_STORAGE_CHANGE_EVENT = 'physio-local-storage-change';
const LOCAL_STORAGE_BACKUP_SUFFIX = '__backup';

interface LocalStorageChangeDetail<T> {
  key: string;
  value: T;
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const backupKey = `${key}${LOCAL_STORAGE_BACKUP_SUFFIX}`;

  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key) ?? window.localStorage.getItem(backupKey);
      if (!item || item === "undefined" || item === "null" || item.trim() === "") {
        return initialValue;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncFromStorage = (raw: string | null) => {
      const nextRaw = raw ?? window.localStorage.getItem(backupKey);
      if (!nextRaw || nextRaw === 'undefined' || nextRaw === 'null' || nextRaw.trim() === '') {
        setStoredValue(initialValue);
        return;
      }

      try {
        setStoredValue(JSON.parse(nextRaw) as T);
      } catch (error) {
        console.warn(`Error syncing localStorage key “${key}”:`, error);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      syncFromStorage(event.newValue);
    };

    const onLocalStorageChange = (event: Event) => {
      const customEvent = event as CustomEvent<LocalStorageChangeDetail<T>>;
      if (!customEvent.detail || customEvent.detail.key !== key) return;
      setStoredValue(customEvent.detail.value);
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(LOCAL_STORAGE_CHANGE_EVENT, onLocalStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LOCAL_STORAGE_CHANGE_EVENT, onLocalStorageChange as EventListener);
    };
  }, [initialValue, key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue((oldValue) => {
        const valueToStore = value instanceof Function ? value(oldValue) : value;

        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
            window.localStorage.setItem(backupKey, JSON.stringify(valueToStore));
            window.dispatchEvent(new CustomEvent<LocalStorageChangeDetail<T>>(LOCAL_STORAGE_CHANGE_EVENT, {
              detail: { key, value: valueToStore }
            }));
          } catch (writeError) {
            console.error(`Error writing to localStorage key “${key}”:`, writeError);
          }
        }

        return valueToStore;
      });
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  }, [backupKey, key]);

  return [storedValue, setValue];
}
