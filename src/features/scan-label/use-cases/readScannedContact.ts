import { AppError } from "../../../shared/errors/AppError";
import { loadEncryptionKey } from "../../settings/use-cases/loadEncryptionKey";

export type ScannedContact = {
  nombre?: string;
  telefono: string;
};

const QR_VERSION_PREFIX = "v1.";
const SALT_BYTES = 16;
const IV_BYTES = 12;
const PBKDF2_ITERATIONS = 210_000;

function decodeBase64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  try {
    const decoded = atob(normalized);
    return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  } catch {
    throw new AppError(
      "INVALID_QR_PAYLOAD",
      "El QR leído no tiene un formato válido.",
    );
  }
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder().decode(bytes);
  } catch {
    throw new AppError(
      "INVALID_QR_PAYLOAD",
      "No fue posible decodificar el contenido del QR.",
    );
  }
}

async function decryptPayload(
  rawPayload: string,
  password: string,
): Promise<string> {
  const payloadBytes = decodeBase64UrlToBytes(rawPayload);
  if (payloadBytes.length <= SALT_BYTES + IV_BYTES) {
    throw new AppError(
      "INVALID_QR_PAYLOAD",
      "El payload del QR está incompleto o corrupto.",
    );
  }

  const salt = payloadBytes.slice(0, SALT_BYTES);
  const iv = payloadBytes.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = payloadBytes.slice(SALT_BYTES + IV_BYTES);

  try {
    const baseKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );

    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );
    return decodeUtf8(new Uint8Array(plainBuffer));
  } catch {
    throw new AppError(
      "DECRYPTION_FAILED",
      "No fue posible desencriptar. Verifica la llave en Settings.",
    );
  }
}

function parseContact(candidate: unknown): ScannedContact {
  if (!candidate || typeof candidate !== "object") {
    throw new AppError(
      "INVALID_QR_PAYLOAD",
      "No se pudo interpretar la información de contacto.",
    );
  }

  const record = candidate as Record<string, unknown>;
  const nombre =
    typeof record.nombre === "string" ? record.nombre.trim() : undefined;
  const telefono =
    typeof record.telefono === "string" ? record.telefono.trim() : "";

  if (!telefono || !/^\+\d{11,15}$/.test(telefono)) {
    throw new AppError(
      "INVALID_QR_PAYLOAD",
      "La información del contacto está incompleta o dañada.",
    );
  }

  return nombre ? { nombre, telefono } : { telefono };
}

export async function readScannedContact(
  rawQrValue: string,
): Promise<ScannedContact> {
  const value = rawQrValue.trim();

  if (!value) {
    throw new AppError(
      "INVALID_QR_PAYLOAD",
      "Primero debes escanear o pegar el contenido del QR.",
    );
  }

  if (!value.startsWith(QR_VERSION_PREFIX)) {
    throw new AppError(
      "INVALID_QR_PAYLOAD",
      "El QR leído usa una versión no compatible.",
    );
  }

  const payload = value.slice(QR_VERSION_PREFIX.length);
  const key = await loadEncryptionKey();
  if (!key) {
    throw new AppError(
      "KEY_NOT_FOUND",
      "No hay llave configurada. Define una en Settings.",
    );
  }

  const json = await decryptPayload(payload, key);

  try {
    const parsed = JSON.parse(json) as unknown;
    return parseContact(parsed);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      "INVALID_JSON",
      "No se pudo convertir el contenido desencriptado a JSON.",
    );
  }
}

export function formatPhoneLabel(phone: string): string {
  if (phone.startsWith("+52") && phone.length === 13) {
    return `+52 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
  }

  if (phone.startsWith("+1") && phone.length === 12) {
    return `+1 (${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
  }

  return phone;
}
