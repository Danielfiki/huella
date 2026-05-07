# Handoff · Historial · Cronológico denso

Implementación del rediseño aprobado del **Historial**. Mismo enfoque "Acción primero" que el Panel de Inicio: cards densas, color con propósito, picos visibles a 3 segundos, IA accesible inline.

Stack: React (JS), Vite, react-router. CSS Modules + tokens de `src/index.css`. **No usar TypeScript.**

---

## 1 · Archivos a crear / modificar

```
src/
├── index.css                                  ← MODIFICAR · agregar tokens (sección §3)
├── pages/
│   └── historial/
│       ├── HistorialPage.jsx                  ← REESCRIBIR
│       └── HistorialPage.module.css           ← REESCRIBIR
└── components/
    └── historial/
        ├── HistorialHeader.jsx                ← NUEVO
        ├── HistorialHeader.module.css         ← NUEVO
        ├── FiltroChips.jsx                    ← NUEVO
        ├── FiltroChips.module.css             ← NUEVO
        ├── DaySeparator.jsx                   ← NUEVO
        ├── DaySeparator.module.css            ← NUEVO
        ├── EpisodioCard.jsx                   ← NUEVO
        ├── EpisodioCard.module.css            ← NUEVO
        ├── IntensidadDots.jsx                 ← NUEVO
        ├── IntensidadDots.module.css          ← NUEVO
        ├── OrientacionIA.jsx                  ← NUEVO  (panel expandible)
        ├── OrientacionIA.module.css           ← NUEVO
        └── helpers.js                         ← NUEVO  (groupByDay, intensityColor, etc.)
```

---

## 2 · Tokens CSS — agregar a `src/index.css`

Solo los **nuevos**. Asume que ya existen los del Panel de Inicio (`--shadow-card-soft`, `--radius-cta`, `--color-accent-mocha`, `--color-celebration-start`, paleta primary/leaf/info, etc.).

```css
:root {
  /* ═══ Pills saturadas · Historial ═══ */
  --color-pill-tangerine-bg:   #FAD3B8;
  --color-pill-tangerine-text: #6E3416;

  --color-pill-lavender-bg:    #DCCFEC;
  --color-pill-lavender-text:  #3E2E5C;

  --color-pill-gold-bg:        #F2D88A;
  --color-pill-gold-text:      #5A3E0A;

  --color-pill-blue-bg:        #C8DAEA;
  --color-pill-blue-text:      #1F3F5F;

  --color-pill-green-bg:       #C9DDB1;
  --color-pill-green-text:     #2F4D1E;

  /* ═══ Intensity dots ═══ */
  --color-int-empty:   var(--color-surface-alt);
  --color-int-low:     var(--color-primary-light);   /* niveles 1-3 */
  --color-int-peak:    var(--color-error);           /* dot 4-5 */
  --color-int-calm:    var(--color-accent-green);    /* logros */

  /* ═══ Header stats numbers ═══ */
  --color-stat-calm:   #A8C99B;     /* intensidad media < 2 */
  --color-stat-warm:   var(--color-primary-light);  /* 2 – 3.5 */
  --color-stat-alert:  #E8967D;     /* > 3.5 */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-pill-tangerine-bg:   #4A2715;
    --color-pill-tangerine-text: #FAD3B8;

    --color-pill-lavender-bg:    #2D2244;
    --color-pill-lavender-text:  #DCCFEC;

    --color-pill-gold-bg:        #3F2E0A;
    --color-pill-gold-text:      #F2D88A;

    --color-pill-blue-bg:        #1A2D44;
    --color-pill-blue-text:      #C8DAEA;

    --color-pill-green-bg:       #1F3318;
    --color-pill-green-text:     #C9DDB1;

    --color-int-empty:   #2A2018;
    --color-int-low:     var(--color-primary-light);
    --color-int-peak:    #E8967D;
    --color-int-calm:    #A8C99B;

    --color-stat-calm:   #A8C99B;
    --color-stat-warm:   var(--color-primary-light);
    --color-stat-alert:  #E8967D;
  }
}
```

---

## 3 · Mapeo de gatillantes → pill color

`src/components/historial/helpers.js`:

```js
// Categoría de gatillante → token de pill
// Si gatillante no está en el mapa, usa "tangerine" (default).
export const PILL_BY_CATEGORIA = {
  // Tangerina · frustración / social / general
  frustracion: 'tangerine',
  enojo: 'tangerine',
  resistencia: 'tangerine',
  social: 'tangerine',
  rabieta: 'tangerine',

  // Lavanda · sueño / cansancio / estado interno
  cansado: 'lavender',
  sueno: 'lavender',
  somnolencia: 'lavender',
  estado: 'lavender',

  // Oro · comida / hambre / sed
  hambre: 'gold',
  comida: 'gold',
  sed: 'gold',
  hito: 'gold',           // hitos también van en oro

  // Azul · transición / cambio / miedo
  transicion: 'blue',
  cambio: 'blue',
  miedo: 'blue',
  ansiedad: 'blue',
  separacion: 'blue',

  // Verde · logros / positivo
  logro: 'green',
  bueno: 'green',
  empatia: 'green',
  cooperacion: 'green',
};

export function pillClassFor(gatillante) {
  const slug = String(gatillante || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return PILL_BY_CATEGORIA[slug] || 'tangerine';
}

// ─── Intensidad media · color del número ───
export function statColorFor(value) {
  if (value < 2)   return 'calm';
  if (value > 3.5) return 'alert';
  return 'warm';
}

// ─── Agrupación de días ───
// Hasta el 4° día: separador individual ("Hoy", "Ayer", "Domingo", "Sábado")
// Desde el 5° día: agrupa todos en un bloque "Vie 10 — Mar 7 nov · N momentos"
export function groupEpisodios(episodios, today = new Date()) {
  // Asume episodios ya ordenados desc por fecha
  const grupos = [];
  const dayMs = 86400000;
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const t0 = startOfDay(today).getTime();

  const buckets = new Map();
  const overflow = [];

  for (const ep of episodios) {
    const epDay = startOfDay(new Date(ep.fecha)).getTime();
    const diffDays = Math.round((t0 - epDay) / dayMs);
    if (diffDays < 4) {
      const key = epDay;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(ep);
    } else {
      overflow.push(ep);
    }
  }

  // Buckets individuales
  const sortedKeys = [...buckets.keys()].sort((a, b) => b - a);
  for (const key of sortedKeys) {
    const date = new Date(key);
    const diffDays = Math.round((t0 - key) / dayMs);
    let label;
    if (diffDays === 0) label = 'Hoy';
    else if (diffDays === 1) label = 'Ayer';
    else label = date.toLocaleDateString('es-ES', { weekday: 'long' });
    grupos.push({
      type: 'day',
      label: label.charAt(0).toUpperCase() + label.slice(1),
      meta: date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) +
            ` · ${buckets.get(key).length}`,
      isToday: diffDays === 0,
      episodios: buckets.get(key),
    });
  }

  // Bloque overflow (5° día en adelante)
  if (overflow.length > 0) {
    const oldest = new Date(overflow[overflow.length - 1].fecha);
    const newest = new Date(overflow[0].fecha);
    const fmt = (d) => d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
    grupos.push({
      type: 'range',
      label: `${fmt(newest)} — ${fmt(oldest)}`,
      meta: `${overflow.length} momento${overflow.length === 1 ? '' : 's'}`,
      isToday: false,
      episodios: overflow,
    });
  }

  return grupos;
}

// ─── Intensidad dots · qué encender ───
// Logro: 1 dot calmo (verde), resto vacíos
// Niveles 1-3: dots 1..N en "low" (tangerina-light)
// Niveles 4-5: dots 1..3 en "low", dot 4 en "peak" (rojo), dot 5 según nivel
export function intensityDots({ tipo, nivel }) {
  if (tipo === 'logro' || tipo === 'hito') {
    return ['calm', 'empty', 'empty', 'empty', 'empty'];
  }
  const result = ['empty', 'empty', 'empty', 'empty', 'empty'];
  for (let i = 0; i < Math.min(nivel, 3); i++) result[i] = 'low';
  if (nivel >= 4) result[3] = 'peak';
  if (nivel >= 5) result[4] = 'peak';
  return result;
}

// ─── Emoji tile · color de fondo según tipo ───
export function emoTileClass(tipo) {
  switch (tipo) {
    case 'logro':       return 'green';
    case 'hito':        return 'gold';
    case 'sueno':
    case 'cansancio':   return 'lavender';
    case 'miedo':
    case 'transicion':  return 'blue';
    default:            return 'tangerine';   // frustración, rabieta, default
  }
}
```

---

## 4 · `HistorialPage.jsx`

```jsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import HistorialHeader from '../../components/historial/HistorialHeader';
import FiltroChips from '../../components/historial/FiltroChips';
import DaySeparator from '../../components/historial/DaySeparator';
import EpisodioCard from '../../components/historial/EpisodioCard';
import { groupEpisodios } from '../../components/historial/helpers';
import styles from './HistorialPage.module.css';

export default function HistorialPage({ episodios = [], hijo, onExportPDF }) {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('todos');

  const filtered = useMemo(() => {
    if (filtro === 'todos') return episodios;
    if (filtro === 'dificiles') return episodios.filter(e => e.nivel >= 3 && e.tipo !== 'logro' && e.tipo !== 'hito');
    if (filtro === 'logros') return episodios.filter(e => e.tipo === 'logro');
    if (filtro === 'hitos') return episodios.filter(e => e.tipo === 'hito');
    return episodios;
  }, [episodios, filtro]);

  const grupos = useMemo(() => groupEpisodios(filtered), [filtered]);

  const promedio = useMemo(() => {
    const vals = episodios.filter(e => e.nivel != null).map(e => e.nivel);
    if (vals.length === 0) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }, [episodios]);

  return (
    <div className={styles.page}>
      <HistorialHeader
        count={episodios.length}
        promedio={promedio}
        rango="Últ. 14 días"
        onBack={() => navigate(-1)}
        onSearch={() => navigate('/historial/buscar')}
        onExportPDF={onExportPDF}
        hasNewExport={true}
      />
      <FiltroChips
        active={filtro}
        onChange={setFiltro}
        counts={{
          todos: episodios.length,
          dificiles: episodios.filter(e => e.nivel >= 3 && e.tipo !== 'logro' && e.tipo !== 'hito').length,
          logros: episodios.filter(e => e.tipo === 'logro').length,
          hitos: episodios.filter(e => e.tipo === 'hito').length,
        }}
        hijo={hijo}
      />
      <div className={styles.body}>
        {grupos.map((g, i) => (
          <React.Fragment key={i}>
            <DaySeparator label={g.label} meta={g.meta} isToday={g.isToday} />
            {g.episodios.map(ep => (
              <EpisodioCard key={ep.id} episodio={ep} />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
```

`HistorialPage.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--color-bg);
}

.body {
  padding: 0 20px 20px;
}
```

---

## 5 · `HistorialHeader.jsx`

```jsx
import React from 'react';
import { statColorFor } from './helpers';
import styles from './HistorialHeader.module.css';

export default function HistorialHeader({
  count = 0,
  promedio = 0,
  rango = 'Últ. 14 días',
  onBack,
  onSearch,
  onExportPDF,
  hasNewExport = false,
}) {
  const statColor = statColorFor(promedio);
  return (
    <header className={styles.topBar}>
      <div className={styles.row}>
        <button className={styles.iconBtn} onClick={onBack} aria-label="Volver">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <h1 className={styles.title}>Historial</h1>
        <button className={styles.iconBtn} onClick={onSearch} aria-label="Buscar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </button>
        <button className={`${styles.iconBtn} ${styles.pdfBtn}`} onClick={onExportPDF} aria-label="Exportar PDF clínico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <path d="M9 13h6"/>
            <path d="M9 17h4"/>
          </svg>
          {hasNewExport && <span className={styles.pdfDot} />}
          <span className={styles.pdfLbl}>PDF</span>
        </button>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.num}>{count}</span>
          <span className={styles.lbl}>Momentos</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.num} ${styles[`num_${statColor}`]}`}>{promedio.toFixed(1)}</span>
          <span className={styles.lbl}>Intensidad media</span>
        </div>
        <span className={styles.range}>{rango}</span>
      </div>
    </header>
  );
}
```

`HistorialHeader.module.css`:

```css
.topBar {
  background: var(--color-accent-mocha);
  color: #fff;
  padding: 6px 20px 22px;
  position: relative;
  overflow: hidden;
}

.topBar::after {
  content: "";
  position: absolute;
  left: -10%; right: -10%;
  top: -20%; bottom: -10%;
  background:
    radial-gradient(55% 70% at 20% 110%, rgba(255, 200, 150, 0.28) 0%, rgba(255,200,150,0) 60%),
    radial-gradient(45% 60% at 90% 0%, rgba(229,110,38,0.32) 0%, rgba(229,110,38,0) 65%),
    radial-gradient(70% 90% at 50% 130%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 70%);
  pointer-events: none;
}

.topBar::before {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 22px;
  background:
    radial-gradient(80% 22px at 25% 100%, rgba(255,255,255,0.14), transparent 70%),
    radial-gradient(80% 22px at 75% 100%, rgba(229,110,38,0.20), transparent 70%);
  pointer-events: none;
}

.row, .stats { position: relative; z-index: 1; }
.row { display: flex; align-items: center; gap: 10px; }

.iconBtn {
  width: 38px; height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  display: grid; place-items: center;
  color: #fff;
  flex-shrink: 0;
  border: none;
  cursor: pointer;
}
.iconBtn svg { width: 18px; height: 18px; }

.pdfBtn {
  width: 44px; height: 44px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow:
    0 4px 14px rgba(229, 110, 38, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.32);
  position: relative;
  flex-shrink: 0;
}
.pdfBtn svg {
  width: 20px; height: 20px;
  color: #fff;
}
.pdfDot {
  position: absolute;
  top: 4px; right: 4px;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #FFD89C;
  box-shadow:
    0 0 0 2px var(--color-accent-mocha),
    0 0 6px rgba(255, 216, 156, 0.8);
}
.pdfLbl {
  position: absolute;
  bottom: -6px; left: 50%;
  transform: translate(-50%, 100%);
  font-size: 8.5px; font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--color-primary-light);
  text-transform: uppercase;
  white-space: nowrap;
}

.title {
  flex: 1;
  font-family: var(--font-heading);
  font-size: 24px; font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.stats {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  margin-top: 14px;
  align-items: end;
}
.stat { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.num {
  font-family: var(--font-heading);
  font-size: 26px; font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1;
  color: var(--color-stat-warm);
}
.num_calm  { color: var(--color-stat-calm); }
.num_warm  { color: var(--color-stat-warm); }
.num_alert { color: var(--color-stat-alert); }

.lbl {
  font-size: 9.5px; opacity: 0.78;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  white-space: nowrap;
}
.range {
  align-self: end;
  font-size: 10.5px; opacity: 0.72;
  letter-spacing: 0.08em; font-weight: 600;
  text-transform: uppercase;
  padding-bottom: 2px;
}
```

**Comportamiento del PDF button:**
- `onClick` → invoca `onExportPDF()`. La página padre maneja el flujo (modal de configuración / generación / share sheet).
- `pdfDot` aparece cuando `hasNewExport === true`. La regla recomendada: hay `>= 1` episodio nuevo desde el último export. La página padre calcula y pasa el flag.
- Mantener `aria-label`. El label visual "PDF" debajo cumple doble función (clarifica acción + diferencia de la lupa neutra).

---

## 6 · `FiltroChips.jsx`

```jsx
import React from 'react';
import styles from './FiltroChips.module.css';

const TIPOS = [
  { key: 'todos', label: 'Todos' },
  { key: 'dificiles', label: 'Difíciles' },
  { key: 'logros', label: 'Logros' },
  { key: 'hitos', label: 'Hitos' },
];

export default function FiltroChips({ active, onChange, counts = {}, hijo, rango = '14 días' }) {
  return (
    <nav className={styles.bar} aria-label="Filtros del historial">
      {TIPOS.map(t => (
        <button
          key={t.key}
          className={`${styles.chip} ${active === t.key ? styles.on : ''}`}
          onClick={() => onChange(t.key)}>
          {t.label}{typeof counts[t.key] === 'number' ? ` · ${counts[t.key]}` : ''}
        </button>
      ))}
      {hijo && (
        <span className={`${styles.chip} ${styles.context}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="9" cy="9" r="3"/>
            <path d="M9 12v6"/>
          </svg>
          {hijo}
        </span>
      )}
      <span className={`${styles.chip} ${styles.context}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
        </svg>
        {rango}
      </span>
    </nav>
  );
}
```

`FiltroChips.module.css`:

```css
.bar {
  display: flex;
  gap: 6px;
  padding: 12px 20px 14px;
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
  background: var(--color-bg);
  position: sticky;
  top: 0;
  z-index: 3;
  border-bottom: 1px solid var(--color-border);
}
.bar::-webkit-scrollbar { display: none; }

.chip {
  flex-shrink: 0;
  padding: 7px 13px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  color: var(--color-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  cursor: pointer;
  font-family: inherit;
}
.chip svg { width: 12px; height: 12px; stroke: currentColor; stroke-width: 2; fill: none; }

.on {
  background: var(--color-text);
  color: #fff;
  border-color: var(--color-text);
}

.context {
  background: var(--color-primary-bg);
  border-color: var(--color-primary-border);
  color: var(--color-primary-dark);
}
```

---

## 7 · `DaySeparator.jsx`

```jsx
import React from 'react';
import styles from './DaySeparator.module.css';

export default function DaySeparator({ label, meta, isToday = false }) {
  return (
    <div className={`${styles.sep} ${isToday ? styles.today : ''}`}>
      <span className={styles.lbl}>{label}</span>
      {meta && <span className={styles.meta}>{meta}</span>}
      <span className={styles.line} />
    </div>
  );
}
```

`DaySeparator.module.css`:

```css
.sep {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 18px 4px 10px;
}
.lbl {
  font-family: var(--font-heading);
  font-size: 15px; font-weight: 700;
  letter-spacing: -0.005em;
  color: var(--color-text);
}
.meta {
  font-size: 10.5px;
  color: var(--color-text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
}
.line {
  flex: 1;
  height: 1px;
  background: var(--color-border);
}
.today .lbl { color: var(--color-primary-dark); }
.today::before {
  content: "";
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  margin-right: -2px;
}
```

---

## 8 · `EpisodioCard.jsx`

```jsx
import React, { useState } from 'react';
import IntensidadDots from './IntensidadDots';
import OrientacionIA from './OrientacionIA';
import { pillClassFor, emoTileClass } from './helpers';
import styles from './EpisodioCard.module.css';

function formatHora(fecha) {
  const d = new Date(fecha);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function EpisodioCard({ episodio }) {
  const [iaOpen, setIaOpen] = useState(false);
  const tipoClass = emoTileClass(episodio.tipo);
  const hasIA = !!episodio.orientacionIA;

  return (
    <article className={styles.ep}>
      <div className={`${styles.emo} ${styles[`emo_${tipoClass}`]}`} aria-hidden="true">
        {episodio.emoji}
      </div>
      <div className={styles.body}>
        <div className={styles.top}>
          <h3 className={styles.ttl}>{episodio.titulo}</h3>
          <span className={styles.time}>{formatHora(episodio.fecha)}</span>
        </div>
        {episodio.descripcion && (
          <p className={styles.desc}>{episodio.descripcion}</p>
        )}
        <div className={styles.row3}>
          {(episodio.gatillantes || []).map((g, i) => (
            <span key={i} className={`${styles.pill} ${styles[`pill_${pillClassFor(g)}`]}`}>{g}</span>
          ))}
          {hasIA && !iaOpen && (
            <button
              className={styles.iaInline}
              onClick={() => setIaOpen(true)}
              aria-expanded={iaOpen}>
              <span className={styles.iaH} aria-hidden="true">h</span>
              Ver orientación
            </button>
          )}
          <IntensidadDots tipo={episodio.tipo} nivel={episodio.nivel || 0} />
        </div>
      </div>
      {hasIA && iaOpen && (
        <OrientacionIA
          orientacion={episodio.orientacionIA}
          onClose={() => setIaOpen(false)}
        />
      )}
    </article>
  );
}
```

`EpisodioCard.module.css`:

```css
.ep {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 2px 10px rgba(42, 26, 14, 0.05);
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 14px;
  align-items: start;
  position: relative;
}
.ep + .ep { margin-top: 10px; }

.emo {
  width: 40px; height: 40px;
  border-radius: 12px;
  background: var(--color-pill-emocion-bg);
  display: grid; place-items: center;
  font-size: 19px;
  flex-shrink: 0;
}
.emo_tangerine { background: var(--color-pill-tangerine-bg); }
.emo_lavender  { background: var(--color-pill-lavender-bg); }
.emo_gold      { background: var(--color-pill-gold-bg); }
.emo_blue      { background: var(--color-pill-blue-bg); }
.emo_green     { background: var(--color-pill-green-bg); }

.body { min-width: 0; }

.top {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}
.ttl {
  flex: 1;
  min-width: 0;
  font-family: var(--font-heading);
  font-size: 15px; font-weight: 700;
  letter-spacing: -0.005em;
  line-height: 1.2;
  color: var(--color-text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.time {
  font-size: 11.5px;
  color: var(--color-text-light);
  font-weight: 600;
  letter-spacing: -0.005em;
  flex-shrink: 0;
}

.desc {
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--color-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}

.row3 {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.pill {
  font-size: 10px;
  padding: 3px 9px;
  border-radius: 999px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.pill_tangerine { background: var(--color-pill-tangerine-bg); color: var(--color-pill-tangerine-text); }
.pill_lavender  { background: var(--color-pill-lavender-bg);  color: var(--color-pill-lavender-text); }
.pill_gold      { background: var(--color-pill-gold-bg);      color: var(--color-pill-gold-text); }
.pill_blue      { background: var(--color-pill-blue-bg);      color: var(--color-pill-blue-text); }
.pill_green     { background: var(--color-pill-green-bg);     color: var(--color-pill-green-text); }

.iaInline {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-accent-green);
  letter-spacing: 0.02em;
  cursor: pointer;
}
.iaH {
  width: 14px; height: 14px;
  border-radius: 4px;
  background: var(--color-accent-green);
  color: #fff;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 9px;
  display: grid; place-items: center;
  line-height: 1;
}
```

---

## 9 · `IntensidadDots.jsx`

```jsx
import React from 'react';
import { intensityDots } from './helpers';
import styles from './IntensidadDots.module.css';

export default function IntensidadDots({ tipo, nivel }) {
  const dots = intensityDots({ tipo, nivel });
  const aria = tipo === 'logro' || tipo === 'hito'
    ? 'Episodio positivo'
    : `Intensidad ${nivel} de 5`;
  return (
    <span className={styles.dots} role="img" aria-label={aria}>
      {dots.map((kind, i) => (
        <i key={i} className={styles[kind]} />
      ))}
    </span>
  );
}
```

`IntensidadDots.module.css`:

```css
.dots {
  display: flex;
  gap: 3px;
  margin-left: auto;
  align-items: center;
  padding-left: 6px;
}
.dots i {
  width: 6px; height: 6px;
  border-radius: 50%;
  display: block;
}
.empty { background: var(--color-int-empty); }
.low   { background: var(--color-int-low); }
.peak  { background: var(--color-int-peak); }
.calm  { background: var(--color-int-calm); }
```

---

## 10 · `OrientacionIA.jsx`

```jsx
import React from 'react';
import styles from './OrientacionIA.module.css';

export default function OrientacionIA({ orientacion, onClose, onOpenFull }) {
  const { titulo, resumen } = orientacion;
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.h} aria-hidden="true">h</span>
        <span className={styles.lbl}>Orientación de Huella</span>
        {onClose && (
          <button className={styles.close} onClick={onClose} aria-label="Cerrar orientación">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
      <h4 className={styles.ttl}>{titulo}</h4>
      <p className={styles.body}>{resumen}</p>
      {onOpenFull && (
        <button className={styles.more} onClick={onOpenFull}>
          Ver completo
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 6 15 12 9 18"/>
          </svg>
        </button>
      )}
    </div>
  );
}
```

`OrientacionIA.module.css`:

```css
.panel {
  grid-column: 1 / -1;
  margin-top: 10px;
  padding: 14px 16px;
  background: linear-gradient(180deg, var(--color-celebration-start) 0%, var(--color-bg) 100%);
  border: 1px solid var(--color-primary-border);
  border-left: 3px solid var(--color-accent-green);
  border-radius: 14px;
}
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.h {
  width: 22px; height: 22px;
  border-radius: 7px;
  background: var(--color-accent-green);
  color: #fff;
  font-family: var(--font-heading);
  font-weight: 700; font-size: 13px;
  display: grid; place-items: center;
  line-height: 1;
}
.lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-tag-green);
}
.close {
  margin-left: auto;
  width: 24px; height: 24px;
  border: none; background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  display: grid; place-items: center;
}
.close svg { width: 14px; height: 14px; }
.ttl {
  font-family: var(--font-heading);
  font-size: 14.5px; font-weight: 700;
  letter-spacing: -0.005em;
  line-height: 1.2;
  margin: 0;
}
.body {
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--color-text);
  margin: 6px 0 0;
}
.more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-primary-dark);
  letter-spacing: 0.04em;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}
.more svg {
  width: 11px; height: 11px;
  stroke: currentColor;
  stroke-width: 2.5;
  fill: none;
}
```

---

## 11 · Specs · referencia rápida

### Tipografía
| Elemento | Familia | Tamaño | Peso | Tracking |
|---|---|---|---|---|
| H1 header | `var(--font-heading)` | 24 | 700 | -0.02em |
| Stat número | `var(--font-heading)` | 26 | 700 | -0.025em |
| Stat label | inherit | 9.5 | 700 | 0.12em UPPER |
| Day label | `var(--font-heading)` | 15 | 700 | -0.005em |
| Day meta | inherit | 10.5 | 600 | 0.08em UPPER |
| Card title | `var(--font-heading)` | 15 | 700 | -0.005em |
| Card desc | inherit | 12.5 | 400 | normal |
| Card hora | inherit | 11.5 | 600 | -0.005em |
| Pill | inherit | 10 | 700 | 0.02em |
| IA inline link | inherit | 11 | 700 | 0.02em |
| Filter chip | inherit | 12 | 600 | normal |

### Spacing
- Page padding: `0 20px 20px`
- Filter bar padding: `12px 20px 14px`
- Day separator: padding `18px 4px 10px`, gap `10px`
- Card padding: `14px 16px`, gap `14px` entre emoji y body
- Card gap: `10px` entre cards
- Row 3 (pills + dots): gap `6px`, margin-top `8px`
- IA panel: padding `14px 16px`, margin-top `10px`

### Radios
- Card: `16px`
- Emoji tile: `12px`
- IA panel: `14px`
- Pills / chips: `999px`
- Icon button: `50%` (38px y 44px)

### Sombras
- Card: `0 2px 10px rgba(42, 26, 14, 0.05)`
- PDF button: `0 4px 14px rgba(229, 110, 38, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.32)`
- PDF dot halo: `0 0 0 2px var(--color-accent-mocha), 0 0 6px rgba(255, 216, 156, 0.8)`

---

## 12 · Comportamientos

| Regla | Detalle |
|---|---|
| **Color del número Intensidad media** | `< 2` → `--color-stat-calm` (verde) · `2 – 3.5` → `--color-stat-warm` (tangerina) · `> 3.5` → `--color-stat-alert` (rojo apagado). Helper: `statColorFor(value)`. |
| **PDF dot indicator** | Aparece cuando `hasNewExport === true`. Regla: `>= 1` episodio nuevo desde el último export. Padre calcula con `lastExportAt` vs `episodios[0].fecha`. |
| **Intensity dots por episodio** | Logros / hitos: `[calm, empty, empty, empty, empty]`. Niveles 1-3: dots 1..N en `low`. Nivel 4: dots 1-3 `low` + dot 4 `peak`. Nivel 5: dots 1-3 `low` + dots 4-5 `peak`. |
| **Agrupación de días** | Hasta el 4° día (diff ≤ 3): separadores individuales con label localizada (`"Hoy"`, `"Ayer"`, día de la semana). Desde el 5° día (diff ≥ 4): bloque rango `"Vie 10 — Mar 7 nov · N momentos"`. Helper: `groupEpisodios(episodios)`. |
| **Pill por gatillante** | Helper `pillClassFor(slug)` mapea string normalizado a uno de 5 tonos. Default: `tangerine`. Mapa completo en `helpers.js` §3. |
| **Emoji tile color** | Helper `emoTileClass(tipo)` → `green` (logro), `gold` (hito), `lavender` (sueño/cansancio), `blue` (miedo/transición), `tangerine` (default). |
| **PDF flow** | `onClick` invoca `onExportPDF()` que el padre define. Sugerido: modal con (a) rango de fechas, (b) selección de hijo si aplica, (c) toggle "incluir orientaciones IA", (d) botón generar → genera blob PDF → share sheet (`navigator.share` si disponible) o descarga directa. |
| **IA expand / collapse** | Estado local `iaOpen` por card. Cerrado: link inline en row 3. Abierto: panel reemplaza el link y ocupa fila completa (`grid-column: 1 / -1`). Botón × cierra. Botón "Ver completo" navega a `/historial/:id/orientacion`. |
| **Filtros** | Estado controlado por la página. `todos`, `dificiles` (nivel ≥ 3 sin logros/hitos), `logros`, `hitos`. Chips de contexto (hijo, rango) son visuales — abren modal de filtro al tap. |

---

## 13 · Forma del objeto `episodio`

```js
{
  id: 'string',
  fecha: '2026-05-07T18:42:00Z',   // ISO
  emoji: '😡',
  titulo: 'Rabieta antes de cenar',
  descripcion: '15 min llorando por el plato azul...',
  tipo: 'frustracion',             // ver emoTileClass + intensityDots
  nivel: 4,                         // 1-5; null si tipo es logro/hito
  gatillantes: ['Frustración', 'Cansado'],
  orientacionIA: {                  // null si no se pidió IA
    titulo: 'El plato no era el plato.',
    resumen: 'A esta edad lo concreto se vuelve simbólico...',
    completa: '...',                // texto largo · solo se carga al abrir "Ver completo"
  },
  hijoId: 'string',
}
```

---

## 14 · Assets

Todos los iconos son **SVG inline** (lucide-react también es opción). Lista completa:
- Back arrow · `arrow-left`
- Search · `search`
- PDF · `file-text` (con dos `<path>` interiores como líneas)
- Hijo chip · combo `circle` + `path`
- Calendario chip · `calendar`
- IA expand chevron · `chevron-right`
- Close · `x`
- Persona child profile (si se usa en futuro chip)

No hay imágenes nuevas. Ningún asset adicional requerido.

---

## 15 · Diseño de referencia

- `design/historial-final.html` — mockup aprobado, abrir en navegador para revisar visual
- `design/historial-explore.html` — 3 enfoques explorados, contexto histórico
- `design/tokens-reference.css` — referencia completa de tokens del Design System
