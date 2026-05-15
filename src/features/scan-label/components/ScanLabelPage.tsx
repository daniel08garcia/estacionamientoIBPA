import { useMemo, useState } from 'react';
import { AppError } from '../../../shared/errors/AppError';
import { formatPhoneLabel, readScannedContact, type ScannedContact } from '../use-cases/readScannedContact';
import styles from './ScanLabelPage.module.css';

type ReadStatus = 'idle' | 'error' | 'success';

const DEMO_PAYLOAD = 'v1.eyJub21icmUiOiJKdWFuIFDDqXJleiIsInRlbGVmb25vIjoiKzUyNjY0MTIzNDU2NyJ9';

export function ScanLabelPage() {
  const [rawValue, setRawValue] = useState('');
  const [status, setStatus] = useState<ReadStatus>('idle');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState<ScannedContact | null>(null);

  const formattedPhone = useMemo(
    () => (contact ? formatPhoneLabel(contact.telefono) : ''),
    [contact],
  );

  const handleRead = () => {
    setStatus('idle');
    setMessage('');
    setContact(null);

    try {
      const parsedContact = readScannedContact(rawValue);
      setContact(parsedContact);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      if (error instanceof AppError) {
        setMessage(error.message);
      } else {
        setMessage('No fue posible leer el código QR. Intenta nuevamente.');
      }
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.backdropGlow} aria-hidden="true" />
      <section className={styles.layout}>
        <article className={styles.panel}>
          <header className={styles.header}>
            <p className={styles.kicker}>IBPA · Scan Label</p>
            <h1>Leer QR</h1>
            <p>
              Escanea o pega el contenido del QR para desencriptar el contacto y
              mostrarlo de forma clara y accionable.
            </p>
          </header>

          <div className={styles.readerCard}>
            <label htmlFor="qrRawValue" className={styles.label}>
              Contenido del QR
            </label>
            <textarea
              id="qrRawValue"
              className={styles.input}
              placeholder="v1.xxxxxxxxx"
              value={rawValue}
              onChange={(event) => {
                setRawValue(event.target.value);
                setStatus('idle');
                setMessage('');
              }}
              rows={4}
            />

            <div className={styles.actions}>
              <button type="button" className={styles.primaryBtn} onClick={handleRead}>
                Leer información
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => {
                  setRawValue(DEMO_PAYLOAD);
                  setStatus('idle');
                  setMessage('Demo cargada. Presiona "Leer información".');
                }}
              >
                Cargar demo
              </button>
            </div>

            {message && (
              <p className={status === 'error' ? styles.error : styles.info} role="status">
                {status === 'error' ? '❌ ' : 'ℹ️ '}
                {message}
              </p>
            )}
          </div>
        </article>

        <aside className={styles.resultCard}>
          <h2>Resultado</h2>
          {!contact && <p className={styles.pending}>Aún no hay datos desencriptados.</p>}

          {contact && (
            <dl className={styles.contactList}>
              <div>
                <dt>Nombre</dt>
                <dd>{contact.nombre}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>
                  <a href={`tel:${contact.telefono}`} className={styles.phoneLink}>
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
