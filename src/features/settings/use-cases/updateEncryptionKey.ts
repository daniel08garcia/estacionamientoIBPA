import { saveEncryptionKey } from './saveEncryptionKey';

/**
 * Updates the encryption key used for QR generation and scanning.
 *
 * WARNING: Updating the key will cause previously generated QR labels
 * to become unreadable. It is assumed that old labels will be replaced
 * if this occurs.
 */
export async function updateEncryptionKey(newKey: string): Promise<void> {
  await saveEncryptionKey(newKey);
}
