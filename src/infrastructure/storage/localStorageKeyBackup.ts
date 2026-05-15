const STORAGE_KEY = 'ibpa_enc_key_backup';

export function saveKeyToLocalStorage(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // LocalStorage may be unavailable (private mode / storage full); fail silently
  }
}

export function loadKeyFromLocalStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function deleteKeyFromLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Fail silently
  }
}
