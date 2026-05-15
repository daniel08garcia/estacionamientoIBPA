import { AppError } from '../../shared/errors/AppError';

const DB_NAME = 'ibpa-parking-db';
const DB_VERSION = 1;
const STORE_NAME = 'config';
const KEY_RECORD_ID = 'encryption-key';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new AppError('KEY_STORAGE_FAILED', 'Failed to open IndexedDB', request.error),
      );
  });
}

export async function saveKeyToIndexedDB(key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put({ id: KEY_RECORD_ID, value: key });

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(
        new AppError('KEY_STORAGE_FAILED', 'Failed to save key to IndexedDB', request.error),
      );
    tx.oncomplete = () => db.close();
  });
}

export async function loadKeyFromIndexedDB(): Promise<string | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(KEY_RECORD_ID);

    request.onsuccess = () => {
      const record = request.result as { id: string; value: string } | undefined;
      resolve(record?.value ?? null);
    };
    request.onerror = () =>
      reject(
        new AppError('KEY_STORAGE_FAILED', 'Failed to load key from IndexedDB', request.error),
      );
    tx.oncomplete = () => db.close();
  });
}

export async function deleteKeyFromIndexedDB(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(KEY_RECORD_ID);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(
        new AppError('KEY_STORAGE_FAILED', 'Failed to delete key from IndexedDB', request.error),
      );
    tx.oncomplete = () => db.close();
  });
}
