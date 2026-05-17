import { useEffect, useState } from "react";
import { AppError } from "../../../shared/errors/AppError";
import { createCompactEncryptedQrValue } from "../../../infrastructure/crypto/webCryptoEncryption";
import { loadEncryptionKey } from "../../settings/use-cases/loadEncryptionKey";
import styles from "./PlaceholderPage.module.css";

const LABEL_DPI = 300;
const LABEL_WIDTH_IN = 3;
const LABEL_HEIGHT_IN = 2;
const QR_IMAGE_SIZE = 260;

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

  const generateEncryptedQr = async () => {
    setMessage("");
    setMessageKind("idle");
    setGenerated(false);
    setQrSrc("");
    setQrValue("");

    if (!placa.trim() || !isPhoneValid) {
      setMessage("Completa placa y un teléfono válido de 10 dígitos.");
      setMessageKind("error");
      setGenerated(false);
      return null;
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
      const encoded = encodeURIComponent(encryptedQrValue);
      const generatedQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${QR_IMAGE_SIZE}x${QR_IMAGE_SIZE}&format=png&data=${encoded}`;

      setQrValue(encryptedQrValue);
      setQrSrc(generatedQrSrc);
      setGenerated(true);
      setMessage("QR encriptado generado correctamente.");
      setMessageKind("success");
      return { qrValue: encryptedQrValue, qrSrc: generatedQrSrc };
    } catch (error) {
      setGenerated(false);
      if (error instanceof AppError) {
        setMessage(error.message);
      } else {
        setMessage("No fue posible generar el QR encriptado.");
      }
      setMessageKind("error");
      return null;
    }
  };

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    await generateEncryptedQr();
  };

  const handlePrint = async () => {
    let printableQrSrc = qrSrc;
    if (!generated || !printableQrSrc) {
      const generatedData = await generateEncryptedQr();
      if (!generatedData) return;
      printableQrSrc = generatedData.qrSrc;
    }

    const W = Math.round(LABEL_WIDTH_IN * LABEL_DPI); // 900 px
    const H = Math.round(LABEL_HEIGHT_IN * LABEL_DPI); // 600 px

    try {
      // Fetch QR image as blob to allow drawing on canvas (avoids CORS taint)
      const response = await fetch(printableQrSrc);
      if (!response.ok) throw new Error("fetch_qr");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const qrImg = new Image();
      qrImg.src = objectUrl;
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject(new Error("img_load"));
      });
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no_ctx");

      // White background (thermal printing = black on white)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);

      // Layout constants
      const margin = 24;
      const qrSize = H - margin * 2; // 552 px – fills the full height with margin
      const qrX = margin;
      const qrY = margin;

      // QR code
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Vertical separator
      const sepX = qrX + qrSize + margin;
      ctx.strokeStyle = "#bbbbbb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sepX, margin * 2);
      ctx.lineTo(sepX, H - margin * 2);
      ctx.stroke();

      // Text area geometry
      const textAreaLeft = sepX + margin;
      const textAreaRight = W - margin;
      const textAreaW = textAreaRight - textAreaLeft;
      const textCenterX = textAreaLeft + textAreaW / 2;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // "PLACA" caption
      const captionFontSize = Math.round(H * 0.07);
      ctx.font = `600 ${captionFontSize}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = "#777777";
      ctx.fillText("PLACA", textCenterX, H * 0.3);

      // Thin rule under caption
      const ruleY = H * 0.38;
      ctx.strokeStyle = "#cccccc";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(textAreaLeft, ruleY);
      ctx.lineTo(textAreaRight, ruleY);
      ctx.stroke();

      // Plate value – largest font that fits the text area
      const plateFontSize = Math.min(
        Math.round(H * 0.22),
        Math.round(textAreaW * 0.9),
      );
      ctx.font = `900 ${plateFontSize}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = "#000000";
      ctx.fillText(placa, textCenterX, H * 0.6, textAreaW);

      // Outer border
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, W - 4, H - 4);

      // Export label as PNG automatically on click.
      const safePlate = (placa || "sin-placa")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^A-Z0-9-_]/gi, "")
        .slice(0, 24);
      const fileName = `etiqueta-${safePlate || "sin-placa"}.png`;

      const labelBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), "image/png");
      });

      if (labelBlob) {
        const downloadUrl = URL.createObjectURL(labelBlob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(downloadUrl);
      } else {
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = fileName;
        a.click();
      }

      setMessage("Etiqueta exportada correctamente.");
      setMessageKind("success");
    } catch {
      setMessage("No fue posible generar la imagen de impresión.");
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
            <p>Captura nombre, teléfono y placa para construir la etiqueta.</p>
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
              <div className={styles.actionButtons}>
                <button className={styles.generateBtn} type="submit">
                  Generar vista previa
                </button>
                <button
                  type="button"
                  className={styles.printBtn}
                  onClick={handlePrint}
                >
                  Imprimir etiqueta
                </button>
              </div>
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
