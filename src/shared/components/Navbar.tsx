import { NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';

const NAV_ITEMS = [
  { to: '/', label: 'Generar QR', icon: '🏷️', end: true },
  { to: '/leer', label: 'Leer QR', icon: '📷', end: false },
  { to: '/configuracion', label: 'Configuración', icon: '⚙️', end: false },
] as const;

export function Navbar() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="/" className={styles.brand} aria-label="IBPA Estacionamiento - Inicio">
          <span className={styles.brandIcon} aria-hidden="true">🚗</span>
          <span className={styles.brandName}>IBPA</span>
        </a>

        <nav className={styles.nav} aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
