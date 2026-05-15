import { useMemo, useState } from 'react';
import styles from './PlaceholderPage.module.css';

type CountryCode = '+52' | '+1';

export function GenerateLabelPage() {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [placa, setPlaca] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('+52');
  const [generated, setGenerated] = useState(false);

  const phoneDigits = telefono.replace(/\D/g, '').slice(0, 10);
  const isPhoneValid = phoneDigits.length === 10;
  const fullPhone = `${countryCode}${phoneDigits}`;

  const payload = useMemo(
    () => JSON.stringify({ nombre: nombre.trim(), telefono: fullPhone }, null, 2),
    [nombre, fullPhone],
  );

  const qrData = useMemo(() => {
    const compact = btoa(unescape(encodeURIComponent(payload))).replace(/=/g, '');
    return `v1.${compact}`;
  }, [payload]);

  const handleGenerate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!nombre.trim() || !placa.trim() || !isPhoneValid) {
      setGenerated(false);
      return;
    }
    setGenerated(true);
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
              Captura nombre, teléfono y placa para construir la etiqueta. El QR se
              prepara con información de contacto y la placa queda visible en texto plano.
            </p>
          </header>

          <form className={styles.form} onSubmit={handleGenerate}>
            <label className={styles.field}>
              <span>Nombre</span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Juan Pérez"
                required
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
                  className={`${styles.switch} ${countryCode === '+1' ? styles.switchUs : ''}`}
                  onClick={() => setCountryCode((prev) => (prev === '+52' ? '+1' : '+52'))}
                  aria-label="Cambiar país"
                >
                  <span className={styles.switchThumb} />
                  <span className={styles.switchOption}>🇲🇽 +52</span>
                  <span className={styles.switchOption}>🇺🇸 +1</span>
                </button>
              </div>
            </div>

            <div className={styles.actions}>
              <button className={styles.generateBtn} type="submit">Generar vista previa</button>
              <p className={styles.helper}>
                Teléfono final: <strong>{fullPhone}</strong>
              </p>
            </div>
          </form>
        </article>

        <aside className={styles.previewCard}>
          <p className={styles.previewLabel}>Vista previa · 2x3 in</p>
          <div className={styles.printLabel}>
            <div className={styles.qrBox} aria-label="Código QR simulado">
              <div className={styles.qrPattern} />
            </div>

            <div className={styles.info}>
              <h2>{placa || 'PLACA-000'}</h2>
              <p>{nombre || 'Nombre del contacto'}</p>
              <small>{isPhoneValid ? fullPhone : 'Teléfono pendiente'}</small>
            </div>
          </div>

          {generated ? (
            <pre className={styles.payload}>{qrData}</pre>
          ) : (
            <p className={styles.pending}>Completa los datos para generar el contenido del QR.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
