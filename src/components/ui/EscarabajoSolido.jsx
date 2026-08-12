// ──────────────────────────────────────────────────────────────────────
// EL ESCARABAJO PARA TAMAÑOS CHICOS
//
// El Escarabajo de marca tiene patas de 4px de radio, antenas y la costura
// de los élitros dibujada al detalle. Eso se ve precioso grande y se
// convierte en una mancha bajo los ~24px, que es justo el tamaño al que
// vive en los avatares del hilo.
//
// Esta versión conserva la silueta —cabeza, antenas, dos élitros, tres pares
// de patas— con trazos gruesos y redondeados que sobreviven al tamaño chico.
// No reemplaza al de marca: el original sigue mandando donde hay espacio.
//
// Los élitros van separados por un espacio en vez de una línea divisoria,
// porque una línea necesitaría el color del fondo y esto se pinta con
// currentColor sobre discos de colores distintos.
// ──────────────────────────────────────────────────────────────────────

export default function EscarabajoSolido({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      role="img"
      aria-label="Huella"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      >
        {/* Antenas */}
        <path d="M10.7 3.4 8.5 1.5" />
        <path d="M13.3 3.4 15.5 1.5" />
        {/* Patas: tres pares, abriéndose hacia afuera */}
        <path d="M6.7 10.2 2.9 7.6" />
        <path d="M6.2 14.6 2.3 14.6" />
        <path d="M6.7 19 3.1 21.5" />
        <path d="M17.3 10.2 21.1 7.6" />
        <path d="M17.8 14.6 21.7 14.6" />
        <path d="M17.3 19 20.9 21.5" />
      </g>

      {/* Cabeza */}
      <circle cx="12" cy="5.1" r="2.7" fill="currentColor" />

      {/* Élitros: dos mitades con un canal entre medio */}
      <path
        fill="currentColor"
        d="M11.35 7.5c-3.5.7-5.15 3.5-5.15 6.9 0 3.5 2 6.6 5.15 7.4z"
      />
      <path
        fill="currentColor"
        d="M12.65 7.5c3.5.7 5.15 3.5 5.15 6.9 0 3.5-2 6.6-5.15 7.4z"
      />
    </svg>
  )
}
