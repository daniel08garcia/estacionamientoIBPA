import { AppError } from '../../../shared/errors/AppError';

export type ScannedContact = {
  nombre: string;
  telefono: string;
};

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

  try {
    return decodeURIComponent(escape(atob(normalized)));
  } catch {
    throw new AppError('INVALID_QR_PAYLOAD', 'El QR leído no tiene un formato válido.');
  }
}

function parseContact(candidate: unknown): ScannedContact {
  if (!candidate || typeof candidate !== 'object') {
    throw new AppError('INVALID_QR_PAYLOAD', 'No se pudo interpretar la información de contacto.');
  }

  const record = candidate as Record<string, unknown>;
  const nombre = typeof record.nombre === 'string' ? record.nombre.trim() : '';
  const telefono = typeof record.telefono === 'string' ? record.telefono.trim() : '';

  if (!nombre || !/^\+\d{11,15}$/.test(telefono)) {
    throw new AppError('INVALID_QR_PAYLOAD', 'La información del contacto está incompleta o dañada.');
  }

  return { nombre, telefono };
}

export function readScannedContact(rawQrValue: string): ScannedContact {
  const value = rawQrValue.trim();

  if (!value) {
    throw new AppError('INVALID_QR_PAYLOAD', 'Primero debes escanear o pegar el contenido del QR.');
  }

  if (!value.startsWith('v1.')) {
    throw new AppError('INVALID_QR_PAYLOAD', 'El QR leído usa una versión no compatible.');
  }

  const payload = value.slice(3);
  const json = decodeBase64Url(payload);

  try {
    const parsed = JSON.parse(json) as unknown;
    return parseContact(parsed);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('INVALID_JSON', 'No se pudo convertir el contenido desencriptado a JSON.');
  }
}

export function formatPhoneLabel(phone: string): string {
  if (phone.startsWith('+52') && phone.length === 13) {
    return `+52 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
  }

  if (phone.startsWith('+1') && phone.length === 12) {
    return `+1 (${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
  }

  return phone;
}
