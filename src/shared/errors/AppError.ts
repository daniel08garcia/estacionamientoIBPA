export type AppErrorCode =
  | 'KEY_NOT_FOUND'
  | 'KEY_STORAGE_FAILED'
  | 'KEY_RECOVERY_FAILED'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'INVALID_QR_PAYLOAD'
  | 'INVALID_JSON'
  | 'INVALID_PHONE'
  | 'CAMERA_DENIED'
  | 'UNKNOWN';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly cause?: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

