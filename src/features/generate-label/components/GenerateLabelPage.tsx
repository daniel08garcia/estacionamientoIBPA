import styles from './PlaceholderPage.module.css';

export function GenerateLabelPage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <span className={styles.icon} aria-hidden="true">🏷️</span>
        <h1 className={styles.title}>Generar QR</h1>
        <p className={styles.subtitle}>Próximamente</p>
        <p className={styles.description}>
          Aquí podrás capturar la información de contacto, encriptarla y
          generar una etiqueta con código QR lista para imprimir.
        </p>
      </div>
    </main>
  );
}
