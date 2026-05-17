import { useEffect, useState } from "react";
import { loadEncryptionKey } from "../use-cases/loadEncryptionKey";
import { saveEncryptionKey } from "../use-cases/saveEncryptionKey";
import { updateEncryptionKey } from "../use-cases/updateEncryptionKey";
import { AppError } from "../../../shared/errors/AppError";
import styles from "./SettingsPage.module.css";

type Status = "idle" | "loading" | "success" | "error";

export function SettingsPage() {
  const [keyValue, setKeyValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const fetchKey = async () => {
      setStatus("loading");
      try {
        const stored = await loadEncryptionKey();
        setHasExistingKey(stored !== null);
        setStatus("idle");
      } catch {
        setStatus("idle");
      }
    };
    fetchKey();
  }, []);

  const isFormValid =
    keyValue.trim().length >= 8 &&
    confirmValue.trim().length >= 8 &&
    keyValue === confirmValue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) return;

    if (hasExistingKey && !showWarning) {
      setShowWarning(true);
      return;
    }

    await persistKey();
  };

  const persistKey = async () => {
    setStatus("loading");
    setMessage("");
    try {
      if (hasExistingKey) {
        await updateEncryptionKey(keyValue);
      } else {
        await saveEncryptionKey(keyValue);
      }
      setHasExistingKey(true);
      setKeyValue("");
      setConfirmValue("");
      setShowWarning(false);
      setStatus("success");
      setMessage(
        hasExistingKey
          ? "Llave actualizada correctamente. Las etiquetas generadas con la llave anterior ya no podrán leerse."
          : "Llave guardada correctamente.",
      );
    } catch (err) {
      setStatus("error");
      if (err instanceof AppError) {
        setMessage(err.message);
      } else {
        setMessage("Ocurrió un error al guardar la llave. Inténtalo de nuevo.");
      }
    }
  };

  const cancelWarning = () => {
    setShowWarning(false);
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.icon} aria-hidden="true">
            ⚙️
          </span>
          <h1 className={styles.title}>Configuración</h1>
        </div>

        <p className={styles.description}>
          Configura la llave de encriptación utilizada para generar y leer los
          códigos QR.
        </p>

        {hasExistingKey && (
          <div className={styles.statusBadge} role="status">
            <span className={styles.dot} aria-hidden="true" />
            Llave configurada
          </div>
        )}

        {!hasExistingKey && (
          <div
            className={`${styles.statusBadge} ${styles.statusBadgeWarning}`}
            role="status"
          >
            <span
              className={`${styles.dot} ${styles.dotWarning}`}
              aria-hidden="true"
            />
            Sin llave configurada
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <div className={styles.fieldGroup}>
            <label htmlFor="encryptionKey" className={styles.label}>
              {hasExistingKey ? "Nueva llave" : "Llave de encriptación"}
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="encryptionKey"
                type={showKey ? "text" : "password"}
                value={keyValue}
                onChange={(e) => {
                  setKeyValue(e.target.value);
                  setStatus("idle");
                  setMessage("");
                  setShowWarning(false);
                }}
                placeholder="Mínimo 8 caracteres"
                className={styles.input}
                autoComplete="new-password"
                minLength={8}
                required
                aria-describedby="keyHelp"
              />
              <button
                type="button"
                className={styles.toggleVisibility}
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? "Ocultar llave" : "Mostrar llave"}
              >
                {showKey ? "🙈" : "👁️"}
              </button>
            </div>
            <p id="keyHelp" className={styles.hint}>
              Usa una llave larga y única. No se enviará a ningún servidor.
            </p>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="confirmKey" className={styles.label}>
              Confirmar llave
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="confirmKey"
                type={showKey ? "text" : "password"}
                value={confirmValue}
                onChange={(e) => {
                  setConfirmValue(e.target.value);
                  setStatus("idle");
                  setMessage("");
                  setShowWarning(false);
                }}
                placeholder="Repite la llave"
                className={`${styles.input} ${
                  confirmValue && keyValue !== confirmValue
                    ? styles.inputError
                    : ""
                }`}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            {confirmValue && keyValue !== confirmValue && (
              <p className={styles.fieldError} role="alert">
                Las llaves no coinciden.
              </p>
            )}
          </div>

          {showWarning && (
            <div className={styles.warningBox} role="alert">
              <strong>⚠️ Advertencia</strong>
              <p>
                Estás a punto de cambiar la llave de encriptación. Los códigos
                QR generados con la llave anterior{" "}
                <strong>dejarán de funcionar</strong>. Se recomienda reimprimir
                todas las etiquetas existentes con la nueva llave.
              </p>
              <div className={styles.warningActions}>
                <button
                  type="button"
                  onClick={cancelWarning}
                  className={styles.btnSecondary}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={persistKey}
                  className={`${styles.btn} ${styles.btnDanger}`}
                  disabled={status === "loading"}
                >
                  {status === "loading"
                    ? "Guardando…"
                    : "Actualizar de todas formas"}
                </button>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className={styles.successBox} role="status">
              ✅ {message}
            </div>
          )}

          {status === "error" && (
            <div className={styles.errorBox} role="alert">
              ❌ {message}
            </div>
          )}

          {!showWarning && (
            <button
              type="submit"
              className={styles.btn}
              disabled={!isFormValid || status === "loading"}
            >
              {status === "loading"
                ? "Guardando…"
                : hasExistingKey
                  ? "Actualizar llave"
                  : "Guardar llave"}
            </button>
          )}
        </form>

        <section
          className={styles.infoSection}
          aria-label="Información de seguridad"
        >
          <h2 className={styles.infoTitle}>ℹ️ Información importante</h2>
          <ul className={styles.infoList}>
            <li>La llave no se envía a ningún servidor externo.</li>
            <li>
              Cambiar la llave invalidará todos los QR generados anteriormente.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
