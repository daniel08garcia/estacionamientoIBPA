import { useEffect, useState } from "react";
import { AppError } from "../../../shared/errors/AppError";
import { createCompactEncryptedQrValue } from "../../../infrastructure/crypto/webCryptoEncryption";
import { loadEncryptionKey } from "../../settings/use-cases/loadEncryptionKey";
import styles from "./PlaceholderPage.module.css";

type CountryCode = "+52" | "+1";

export function GenerateLabelPage() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [placa, setPlaca] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode>("+52");
  const [generated, setGenerated] = useState(false);
  const [qrSrc, setQrSrc] = useState("");
  const [qrValue, setQrValue] = useState("");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"idle" | "error" | "success">(
    "idle",
  );

  const phoneDigits = telefono.replace(/\D/g, "").slice(0, 10);
  const isPhoneValid = phoneDigits.length === 10;
  const fullPhone = `${countryCode}${phoneDigits}`;

  useEffect(() => {
    let cancelled = false;

    async function buildQr() {
      if (!generated || !qrValue) {
        setQrSrc("");
        return;
      }

      try {
        const encoded = encodeURIComponent(qrValue);
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&format=png&data=${encoded}`;
        if (!cancelled) {
          setQrSrc(url);
        }
      } catch {
        if (!cancelled) {
          setQrSrc("");
        }
      }
    }

    void buildQr();

    return () => {
      cancelled = true;
    };
  }, [generated, qrValue]);

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setMessageKind("idle");
    setGenerated(false);
    setQrSrc("");
    setQrValue("");

    if (!placa.trim() || !isPhoneValid) {
      setMessage("Completa placa y un teléfono válido de 10 dígitos.");
      setMessageKind("error");
      setGenerated(false);
      return;
    }

    try {
      const encryptionKey = await loadEncryptionKey();
      if (!encryptionKey) {
        throw new AppError(
          "KEY_NOT_FOUND",
          "No hay llave configurada. Define una en Settings.",
        );
      }

      const contactPayload = JSON.stringify({
        nombre: nombre.trim(),
        telefono: fullPhone,
      });
      const encryptedQrValue = await createCompactEncryptedQrValue(
        contactPayload,
        encryptionKey,
      );

      setQrValue(encryptedQrValue);
      setGenerated(true);
      setMessage("QR encriptado generado correctamente.");
      setMessageKind("success");
    } catch (error) {
      setGenerated(false);
      if (error instanceof AppError) {
        setMessage(error.message);
      } else {
        setMessage("No fue posible generar el QR encriptado.");
      }
      setMessageKind("error");
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.backdropGlow} aria-hidden="true" />
      <section className={styles.layout}>
        <article className={styles.panel}>
          <header className={styles.header}>
            <p className={styles.kicker}>IBPA · Contact Label</p>
            <h1>Generar QR</h1>
            <p>
              Captura nombre, teléfono y placa para construir la etiqueta. El QR
              se prepara con información de contacto y la placa queda visible en
              texto plano.
            </p>
          </header>

          <form className={styles.form} onSubmit={handleGenerate}>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>Teléfono (10 dígitos)</span>
                <input
                  value={phoneDigits}
                  onChange={(e) => setTelefono(e.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  placeholder="6641234567"
                  required
                />
              </label>

              <div className={styles.countrySwitch}>
                <span>País</span>
                <button
                  type="button"
                  className={`${styles.switch} ${countryCode === "+1" ? styles.switchUs : ""}`}
                  onClick={() =>
                    setCountryCode((prev) => (prev === "+52" ? "+1" : "+52"))
                  }
                  aria-label="Cambiar país"
                >
                  <span className={styles.switchThumb} />
                  <span className={styles.switchOption}>🇲🇽 +52</span>
                  <span className={styles.switchOption}>🇺🇸 +1</span>
                </button>
              </div>
            </div>

            <label className={styles.field}>
              <span>Nombre</span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Juan Pérez"
              />
            </label>

            <label className={styles.field}>
              <span>Placa</span>
              <input
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="Ej. ABC-123-A"
                required
              />
            </label>

            <div className={styles.actions}>
              <button className={styles.generateBtn} type="submit">
                Generar vista previa
              </button>
              <p className={styles.helper}>
                Teléfono final: <strong>{fullPhone}</strong>
              </p>
            </div>
            {message && (
              <p
                className={
                  messageKind === "error"
                    ? styles.errorMessage
                    : styles.successMessage
                }
                role="status"
              >
                {message}
              </p>
            )}
          </form>
        </article>

        <aside className={styles.previewCard}>
          <p className={styles.previewLabel}>Vista previa · 2x3 in</p>
          <div className={styles.printLabel}>
            <div className={styles.qrBox} aria-label="Código QR generado">
              {generated && qrSrc ? (
                <img
                  src={qrSrc}
                  alt="Código QR de contacto encriptado"
                  className={styles.qrImage}
                />
              ) : (
                <div className={styles.qrPattern} />
              )}
            </div>

            <div className={styles.info}>
              <h2>{placa || "PLACA-000"}</h2>
            </div>
          </div>

          {generated ? (
            <pre className={styles.payload}>{qrValue}</pre>
          ) : (
            <p className={styles.pending}>
              Completa los datos para generar el contenido del QR.
            </p>
          )}
        </aside>
      </section>
    </main>
  );
}
