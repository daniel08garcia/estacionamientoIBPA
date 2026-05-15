import { recoverStoredKey } from '../../../infrastructure/storage/keyRecoveryService';

export async function loadEncryptionKey(): Promise<string | null> {
  return recoverStoredKey();
}
