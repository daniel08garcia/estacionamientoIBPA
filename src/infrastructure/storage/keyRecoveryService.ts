import {
  loadKeyFromIndexedDB,
  saveKeyToIndexedDB,
} from './indexedDbKeyStore';
import {
  loadKeyFromLocalStorage,
  saveKeyToLocalStorage,
} from './localStorageKeyBackup';

/**
 * Attempts to recover the stored key from the available sources.
 *
 * Strategy:
 * 1. Try IndexedDB (primary).
 * 2. If IndexedDB fails or returns nothing, try LocalStorage (backup).
 * 3. If key is found in only one source, sync it to the other.
 *
 * Returns null if no key is found in either source.
 */
export async function recoverStoredKey(): Promise<string | null> {
  let idbKey: string | null = null;
  let idbAvailable = true;

  try {
    idbKey = await loadKeyFromIndexedDB();
  } catch {
    idbAvailable = false;
  }

  const lsKey = loadKeyFromLocalStorage();

  if (idbKey) {
    // Primary source has the key; ensure backup is in sync
    if (!lsKey || lsKey !== idbKey) {
      saveKeyToLocalStorage(idbKey);
    }
    return idbKey;
  }

  if (lsKey) {
    // Backup has the key; restore primary if available
    if (idbAvailable) {
      try {
        await saveKeyToIndexedDB(lsKey);
      } catch {
        // Best-effort restore; proceed with the key we have
      }
    }
    return lsKey;
  }

  return null;
}
