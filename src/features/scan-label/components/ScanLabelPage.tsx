import styles from './PlaceholderPage.module.css';

export function ScanLabelPage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <span className={styles.icon} aria-hidden="true">📷</span>
        <h1 className={styles.title}>Leer QR</h1>
        <p className={styles.subtitle}>Próximamente</p>
        <p className={styles.description}>
          Aquí podrás escanear un código QR con la cámara, desencriptar la
          información y ver los datos de contacto.
        </p>
      </div>
    </main>
  );
}
