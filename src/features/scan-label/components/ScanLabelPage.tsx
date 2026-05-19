import { useEffect, useMemo, useRef, useState } from "react";
import { AppError } from "../../../shared/errors/AppError";
import {
  formatPhoneLabel,
  readScannedContact,
  type ScannedContact,
} from "../use-cases/readScannedContact";
import styles from "./ScanLabelPage.module.css";

type ReadStatus = "idle" | "error" | "success";

type BarcodeDetectorLike = {
  new (options?: { formats?: string[] }): DetectorWithFormats;
};

type DetectorWithFormats = {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>;
};

export function ScanLabelPage() {
  const [status, setStatus] = useState<ReadStatus>("idle");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState<ScannedContact | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanRafRef = useRef<number | null>(null);

  const formattedPhone = useMemo(
    () => (contact ? formatPhoneLabel(contact.telefono) : ""),
    [contact],
  );

  const handleRead = async (candidate: string) => {
    setStatus("idle");
    setMessage("");
    setContact(null);

    try {
      const parsedContact = await readScannedContact(candidate);
      setContact(parsedContact);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      if (error instanceof AppError) {
        setMessage(error.message);
      } else {
        setMessage("No fue posible leer el código QR. Intenta nuevamente.");
      }
    }
  };

  const stopCamera = () => {
    if (scanRafRef.current) {
      cancelAnimationFrame(scanRafRef.current);
      scanRafRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    if (!("BarcodeDetector" in window)) {
      setStatus("error");
      setMessage(
        "Tu navegador no soporta lectura QR por cámara (BarcodeDetector).",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      mediaStreamRef.current = stream;

      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsCameraActive(true);

      const detectorFactory = (
        window as Window & { BarcodeDetector: BarcodeDetectorLike }
      ).BarcodeDetector;
      const detector = new detectorFactory({ formats: ["qr_code"] });
      const scan = async () => {
        if (!videoRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          const qrValue = barcodes
            .find((item: { rawValue?: string }) => item.rawValue)
            ?.rawValue?.trim();
          if (qrValue) {
            await handleRead(qrValue);
            stopCamera();
            return;
          }
        } catch {
          setStatus("error");
          setMessage("No se pudo procesar la imagen de la cámara.");
          stopCamera();
          return;
        }
        scanRafRef.current = requestAnimationFrame(() => {
          void scan();
        });
      };

      scanRafRef.current = requestAnimationFrame(() => {
        void scan();
      });
    } catch {
      setStatus("error");
      setMessage("Permiso de cámara denegado o cámara no disponible.");
      stopCamera();
    }
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <main className={styles.page}>
      <div className={styles.backdropGlow} aria-hidden="true" />
      <section className={styles.layout}>
        <article className={styles.panel}>
          <header className={styles.header}>
            <p className={styles.kicker}>IBPA · Scan Label</p>
            <h1>Leer QR</h1>
            <p>
              Apunta la cámara al código QR para desencriptar el contacto y
              mostrarlo de forma clara y accionable.
            </p>
          </header>

          <div className={styles.readerCard}>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => {
                  if (isCameraActive) {
                    stopCamera();
                    setMessage("Cámara detenida.");
                    return;
                  }
                  void startCamera();
                }}
              >
                {isCameraActive ? "Detener cámara" : "Escanear QR"}
              </button>
            </div>

            <video
              ref={videoRef}
              className={isCameraActive ? styles.preview : styles.previewHidden}
              muted
              playsInline
              aria-label="Vista previa de cámara"
            />

            {message && (
              <p
                className={status === "error" ? styles.error : styles.info}
                role="status"
              >
                {status === "error" ? "❌ " : "ℹ️ "}
                {message}
              </p>
            )}
          </div>
        </article>

        <aside className={styles.resultCard}>
          <h2>Resultado</h2>
          {!contact && (
            <p className={styles.pending}>Aún no hay datos desencriptados.</p>
          )}

          {contact && (
            <dl className={styles.contactList}>
              {contact.nombre && (
                <div>
                  <dt>Nombre</dt>
                  <dd>{contact.nombre}</dd>
                </div>
              )}
              <div>
                <dt>Teléfono</dt>
                <dd>
                  <a
                    href={`tel:${contact.telefono}`}
                    className={styles.phoneLink}
                  >
                    {formattedPhone}
                  </a>
                </dd>
              </div>
            </dl>
          )}
        </aside>
      </section>
    </main>
  );
}
