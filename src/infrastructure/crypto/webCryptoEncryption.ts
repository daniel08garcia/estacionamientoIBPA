import { AppError } from "../../shared/errors/AppError";

export const QR_VERSION_PREFIX = "v1.";
export const QR_SALT_BYTES = 16;
export const QR_IV_BYTES = 12;
export const PBKDF2_ITERATIONS = 210_000;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function utf8ToBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function deriveAesKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(utf8ToBytes(password)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function createCompactEncryptedQrValue(
  plainText: string,
  password: string,
): Promise<string> {
  if (!password.trim()) {
    throw new AppError(
      "KEY_NOT_FOUND",
      "No hay llave configurada. Define una en Settings.",
    );
  }

  try {
    const salt = crypto.getRandomValues(new Uint8Array(QR_SALT_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(QR_IV_BYTES));
    const key = await deriveAesKey(password, salt);
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(utf8ToBytes(plainText)),
    );

    const cipherBytes = new Uint8Array(cipherBuffer);
    const payload = new Uint8Array(
      salt.length + iv.length + cipherBytes.length,
    );
    payload.set(salt, 0);
    payload.set(iv, salt.length);
    payload.set(cipherBytes, salt.length + iv.length);

    return `${QR_VERSION_PREFIX}${bytesToBase64Url(payload)}`;
  } catch (error) {
    throw new AppError(
      "ENCRYPTION_FAILED",
      "No fue posible encriptar el contenido del QR.",
      error,
    );
  }
}
