import React, { useState } from 'react';
import styles from './SeccionColapsable.module.css';

// Cuadro de encabezado de sección colapsable, reutilizable.
// - Modo NO controlado: usa estado interno (defaultOpen).
// - Modo CONTROLADO: si se pasan `open` y `onToggle`, manda el padre.
//   Así "Lo que Huella ve" conserva su lógica de expanded / handleToggle /
//   auto-expand / persistencia sin reescribirla — acá solo cambia su look.
// `variant` mapea a un par de tokens pill (bg/text) en el CSS module.
// `headerExtra` se inyecta entre la etiqueta y el chevron (ej. el badge).
export default function SeccionColapsable({
  id,
  titulo,
  variant = 'tangerine',
  defaultOpen = false,
  open: openProp,
  onToggle,
  headerExtra = null,
  children,
}) {
  const isControlled = openProp !== undefined;
  const [openInterno, setOpenInterno] = useState(defaultOpen);
  const open = isControlled ? openProp : openInterno;

  const handleClick = () => {
    if (onToggle) onToggle();
    if (!isControlled) setOpenInterno((v) => !v);
  };

  return (
    <section id={id} className={styles.section}>
      <button
        type="button"
        className={`${styles.header} ${styles[variant]}`}
        onClick={handleClick}
        aria-expanded={open}
      >
        <span className={styles.label}>{titulo}</span>
        {headerExtra}
        <span
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && children}
    </section>
  );
}
