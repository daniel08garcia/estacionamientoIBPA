import { saveKeyToIndexedDB } from '../../../infrastructure/storage/indexedDbKeyStore';
import { saveKeyToLocalStorage } from '../../../infrastructure/storage/localStorageKeyBackup';
import { AppError } from '../../../shared/errors/AppError';

export async function saveEncryptionKey(key: string): Promise<void> {
  if (!key || key.trim().length === 0) {
    throw new AppError('KEY_NOT_FOUND', 'La llave no puede estar vacía.');
  }

  await saveKeyToIndexedDB(key);
  saveKeyToLocalStorage(key);
}
