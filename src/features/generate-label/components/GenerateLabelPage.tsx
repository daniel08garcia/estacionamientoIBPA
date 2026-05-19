import { useState } from "react";
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
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"idle" | "error" | "success">(
    "idle",
  );

  const phoneDigits = telefono.replace(/\D/g, "").slice(0, 10);
  const isPhoneValid = phoneDigits.length === 10;
  const fullPhone = `${countryCode}${phoneDigits}`;

  const generateEncryptedQr = async () => {
    setMessage("");
    setMessageKind("idle");

    if (!placa.trim() || !isPhoneValid) {
      setMessage("Completa placa y un teléfono válido de 10 dígitos.");
      setMessageKind("error");
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

      return { qrSrc: generatedQrSrc };
    } catch (error) {
      if (error instanceof AppError) {
        setMessage(error.message);
      } else {
        setMessage("No fue posible generar el QR encriptado.");
      }
      setMessageKind("error");
      return null;
    }
  };

  const handlePrint = async () => {
    const generatedData = await generateEncryptedQr();
    if (!generatedData) return;
    const printableQrSrc = generatedData.qrSrc;

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

      // Professional monochrome layout: QR on the left and plate text vertical on the right.
      const margin = 18;
      const textStripWidth = Math.max(Math.round(W * 0.16), 120);
      const gutter = 12;
      const qrAreaWidth = W - margin * 2 - textStripWidth - gutter;
      const qrSize = Math.min(H - margin * 2, qrAreaWidth);
      const qrX = margin + Math.round((qrAreaWidth - qrSize) / 2);
      const qrY = Math.round((H - qrSize) / 2);

      // QR code with high contrast, no background fills.
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Divider line between QR and plate strip.
      const dividerX = qrX + qrSize + Math.round(gutter / 2);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dividerX, margin);
      ctx.lineTo(dividerX, H - margin);
      ctx.stroke();

      // Vertical plate text fitted to available space.
      const plateText = (placa || "SIN-PLACA").trim().toUpperCase();
      const textMaxLength = H - margin * 2 - 12;
      let plateFontSize = Math.round(textStripWidth * 0.58);

      ctx.font = `900 ${plateFontSize}px Arial, Helvetica, sans-serif`;
      while (
        ctx.measureText(plateText).width > textMaxLength &&
        plateFontSize > 30
      ) {
        plateFontSize -= 2;
        ctx.font = `900 ${plateFontSize}px Arial, Helvetica, sans-serif`;
      }

      const textStripLeft = W - margin - textStripWidth;
      const textCenterX = textStripLeft + textStripWidth / 2;
      const textCenterY = H / 2;

      ctx.save();
      ctx.translate(textCenterX, textCenterY);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#000000";
      ctx.fillText(plateText, 0, 0, textMaxLength);
      ctx.restore();

      // Outer frame.
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

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

          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              void handlePrint();
            }}
          >
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
                Imprimir etiqueta
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
      </section>
    </main>
  );
}
