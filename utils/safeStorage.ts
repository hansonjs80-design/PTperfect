const warnStorageError = (action: string, key?: string, error?: unknown) => {
  const suffix = key ? ` for "${key}"` : '';
  console.warn(`localStorage ${action} failed${suffix}`, error);
};

export const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    warnStorageError('read', key, error);
    return null;
  }
};

export const safeSetItem = (key: string, value: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    warnStorageError('write', key, error);
    return false;
  }
};

export const safeRemoveItem = (key: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    warnStorageError('remove', key, error);
    return false;
  }
};

export const safeKeys = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    return Object.keys(window.localStorage);
  } catch (error) {
    warnStorageError('enumeration', undefined, error);
    return [];
  }
};
