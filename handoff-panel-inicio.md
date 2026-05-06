# Handoff: Panel de Inicio · Acción primero

## Overview

Rediseño visual del Panel de Inicio de Huella (PWA móvil) priorizando **acción** sobre estado o insights. La pantalla resuelve la pregunta "¿qué quieres hacer ahora?" en los primeros 3 segundos: saludo breve → CTA primario tangerina (Registrar un momento) → CTA secundario (Pregúntale a Huella). Resumen semanal, gráficos y análisis IA bajan a contexto, accesibles vía scroll.

Mantiene **toda** la funcionalidad del panel actual (saludo, registro destacado, resumen semanal, frecuencia/intensidad/gatillos, análisis IA on-demand). Sólo cambia el orden y el peso visual.

## About the Design Files

Los archivos en `design/` son **referencias visuales en HTML** — prototipos del look-and-feel final, no código de producción para copiar directamente. La tarea es **recrear este diseño dentro del codebase existente de Huella** (React + TypeScript + Tailwind/CSS modules según el setup actual), usando los componentes y patrones ya establecidos.

Si encuentras un componente existente que cubre el comportamiento (por ejemplo, un `Card`, un `Button` con variante `primary`, un `BottomNav`) **úsalo y agrega variantes** en lugar de duplicar markup.

## Fidelity

**High-fidelity.** Colores, tipografía, espaciados, sombras y radios están definidos al pixel. Tokens en `design/colors_and_type.css` son la fuente de verdad — algunos ya viven en `src/index.css` del repo. Cualquier valor nuevo va listado en la sección **Tokens nuevos** abajo.

---

## Archivos React a crear o modificar

Asume la estructura convencional del repo (`src/pages/`, `src/components/`, `src/styles/`). Ajustar rutas si difieren.

### Modificar

| Ruta | Qué cambia |
|---|---|
| `src/pages/Panel.tsx` (o `src/pages/Inicio.tsx`) | Reescribir el árbol JSX completo con la nueva jerarquía. Mantener data-fetching y estado existentes. |
| `src/index.css` | Agregar tokens nuevos (ver sección Tokens). |

### Crear

| Ruta | Propósito |
|---|---|
| `src/components/panel/Hero.tsx` | Banda mocha superior · saludo dinámico + perfil + campana |
| `src/components/panel/CTAPrimary.tsx` | Botón tangerina grande "Registrar un momento" |
| `src/components/panel/CTAAskHuella.tsx` | Card secundaria "Pregúntale a Huella" |
| `src/components/panel/ResumenSemanal.tsx` | 3 tiles · episodios / intensidad / top gatillo |
| `src/components/panel/ChartFrecuencia.tsx` | Card · barras de frecuencia diaria |
| `src/components/panel/ChartIntensidad.tsx` | Card · sparkline de intensidad mocha |
| `src/components/panel/ChartGatillos.tsx` | Card · ranking de gatillos con barras horizontales |
| `src/components/panel/AnalisisIA.tsx` | Card crema/verde con titular y CTAs |
| `src/components/panel/SectionEyebrow.tsx` | Eyebrow tipográfico entre secciones |
| `src/components/panel/Delta.tsx` | Indicador de delta (↓18%, etc.) con color por dirección |
| `src/components/panel/panel.module.css` | Estilos compartidos del panel |

Si el repo usa Tailwind, traducir los `panel.module.css` a `@apply` o clases utilitarias. La sección **Spec por componente** abajo está en CSS plano para que sea trivial portar.

---

## Tokens nuevos en `src/index.css`

Agregar al bloque `:root`. Si ya existen con otro nombre, reusar el existente.

```css
:root {
  /* Sombras de elevación específicas del Panel */
  --shadow-card-soft: 0 4px 14px rgba(42, 26, 14, 0.05);
  --shadow-card-medium: 0 6px 18px rgba(42, 26, 14, 0.06);
  --shadow-cta-primary: 0 12px 28px rgba(229, 110, 38, 0.32);
  --shadow-fab: 0 8px 18px rgba(229, 110, 38, 0.4);

  /* Radios extendidos */
  --radius-cta: 22px;
  --radius-card-lg: 20px;

  /* Color de éxito ya existe (--color-success); confirmar valor #2D8B3D o similar */
}

@media (prefers-color-scheme: dark) {
  :root {
    --shadow-card-soft: 0 4px 14px rgba(0, 0, 0, 0.35);
    --shadow-card-medium: 0 6px 18px rgba(0, 0, 0, 0.4);
    --shadow-cta-primary: 0 12px 28px rgba(229, 110, 38, 0.45);
    --shadow-fab: 0 8px 18px rgba(229, 110, 38, 0.5);
  }
}
```

Todos los demás colores (mocha, tangerina, surface-alt, primary-bg, primary-border, accent-green, leaf-bg, pill-emocion-bg, success, info-bg, celebration-start) ya están en el design system y se referencian con `var(--color-...)`.

---

## Layout general

El componente raíz `Panel.tsx` es un stack vertical full-height con scroll vertical. La banda mocha del hero arranca pegada al status bar; el body tiene `padding: 20px 20px 28px` y `gap: 16px` entre cards. La bottom nav (que ya existe en el repo) queda sticky al pie.

```tsx
// src/pages/Panel.tsx
import { Hero } from '@/components/panel/Hero';
import { CTAPrimary } from '@/components/panel/CTAPrimary';
import { CTAAskHuella } from '@/components/panel/CTAAskHuella';
import { ResumenSemanal } from '@/components/panel/ResumenSemanal';
import { ChartFrecuencia } from '@/components/panel/ChartFrecuencia';
import { ChartIntensidad } from '@/components/panel/ChartIntensidad';
import { ChartGatillos } from '@/components/panel/ChartGatillos';
import { AnalisisIA } from '@/components/panel/AnalisisIA';
import { SectionEyebrow } from '@/components/panel/SectionEyebrow';
import styles from '@/components/panel/panel.module.css';

export default function Panel() {
  // hooks reales del repo: useUser(), useEpisodes(), useWeekSummary(), useTriggers(), usePatternAnalysis()
  const user = useUser();
  const week = useWeekSummary();
  const triggers = useTriggers({ days: 30 });
  const pattern = usePatternAnalysis();
  const navigate = useNavigate();

  return (
    <div className={styles.panel}>
      <Hero
        userName={user.firstName}
        childName={user.activeChild.firstName}
        date={new Date()}
        onBellClick={() => navigate('/notificaciones')}
        onProfileClick={() => navigate('/perfil')}
      />

      <main className={styles.body}>
        <CTAPrimary onClick={() => navigate('/registrar')} />
        <CTAAskHuella onClick={() => navigate('/huella/preguntar')} />

        <SectionEyebrow>Esta semana · contexto</SectionEyebrow>
        <ResumenSemanal data={week} />

        <SectionEyebrow>Cómo se ve la semana</SectionEyebrow>
        <ChartFrecuencia data={week.dailyCounts} />
        <ChartIntensidad data={week.dailyIntensity} />
        <ChartGatillos data={triggers.top3} />

        <SectionEyebrow>Análisis de patrones</SectionEyebrow>
        <AnalisisIA pattern={pattern} onAccept={() => navigate(`/estrategia/${pattern.suggestedStrategyId}`)} onDismiss={() => pattern.snooze()} />
      </main>
    </div>
  );
}
```

```css
/* panel.module.css */
.panel {
  background: var(--color-bg);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: var(--font-family);
  color: var(--color-text);
}
.body {
  padding: 20px 20px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

---

## Spec por componente

### 1. `Hero.tsx`

Banda mocha con perfil, fecha, nombre de marca, campana, saludo grande y subcopy.

```tsx
import styles from './hero.module.css';

interface HeroProps {
  userName: string;          // "María"
  childName: string;         // "Lucas"
  date: Date;
  onBellClick: () => void;
  onProfileClick: () => void;
  unreadCount?: number;
}

export function Hero({ userName, childName, date, onBellClick, onProfileClick, unreadCount = 0 }: HeroProps) {
  const greeting = getGreeting(date, userName, childName);

  return (
    <header className={styles.hero}>
      <div className={styles.row}>
        <button className={styles.profile} onClick={onProfileClick} aria-label="Perfil">
          {userName.charAt(0).toUpperCase()}
        </button>
        <div className={styles.nameWrap}>
          <div className={styles.dateLabel}>{formatHumanDate(date)}</div>
          <div className={styles.wordmark}>huella</div>
        </div>
        <button className={styles.bell} onClick={onBellClick} aria-label="Notificaciones">
          <BellIcon />
          {unreadCount > 0 && <span className={styles.dot} />}
        </button>
      </div>
      <h1 className={styles.greet}>{greeting.title}</h1>
      <p className={styles.greetSub}>{greeting.sub}</p>
    </header>
  );
}

function getGreeting(date: Date, userName: string, childName: string) {
  const h = date.getHours();
  const period =
    h < 6  ? 'madrugada' :
    h < 12 ? 'mañana'    :
    h < 19 ? 'tarde'     : 'noche';

  const titleByPeriod: Record<string, string> = {
    madrugada: `Hola, ${userName}.`,
    mañana:    `Buenos días, ${userName}.`,
    tarde:     `Buenas tardes, ${userName}.`,
    noche:     `Buenas noches, ${userName}.`,
  };

  const subByPeriod: Record<string, string> = {
    madrugada: `Estás temprano. ¿Qué quieres registrar?`,
    mañana:    `${childName} está empezando el día. ¿Qué quieres hacer ahora?`,
    tarde:     `¿Cómo va la tarde con ${childName}?`,
    noche:     `Cierre del día. ¿Algo que quieras anotar?`,
  };

  return { title: titleByPeriod[period], sub: subByPeriod[period] };
}

function formatHumanDate(d: Date) {
  // "Martes 14 nov"
  return new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'short' })
    .format(d)
    .replace(/^./, c => c.toUpperCase())
    .replace('.', '');
}
```

```css
/* hero.module.css */
.hero {
  background: var(--color-accent-mocha);
  color: #fff;
  padding: 8px 24px 24px;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.profile {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-light), var(--color-primary));
  border: 2px solid #fff;
  color: #fff;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 14px;
  letter-spacing: -0.01em;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  cursor: pointer;
}
.nameWrap { flex: 1; min-width: 0; }
.dateLabel {
  font-size: 12px;
  opacity: 0.8;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
}
.wordmark {
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin-top: 1px;
}
.bell {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.14);
  display: grid;
  place-items: center;
  color: #fff;
  flex-shrink: 0;
  position: relative;
  border: none;
  cursor: pointer;
}
.bell svg { width: 20px; height: 20px; }
.bell .dot {
  position: absolute;
  top: 9px;
  right: 9px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2px solid var(--color-accent-mocha);
}
.greet {
  font-family: var(--font-heading);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
}
.greetSub {
  font-size: 13.5px;
  opacity: 0.84;
  line-height: 1.5;
  margin-top: 6px;
  max-width: 32ch;
}
```

### 2. `CTAPrimary.tsx`

Botón tangerina dominante. Domina por color, sombra y tamaño.

```tsx
import styles from './ctaPrimary.module.css';

interface CTAPrimaryProps {
  onClick: () => void;
  label?: string;          // default: "Registrar un momento"
  sub?: string;            // default: "Difícil, logro o hito — toma 30 segundos."
}

export function CTAPrimary({
  onClick,
  label = 'Registrar un momento',
  sub = 'Difícil, logro o hito — toma 30 segundos.',
}: CTAPrimaryProps) {
  return (
    <button className={styles.cta} onClick={onClick}>
      <span className={styles.glyph}>
        <PlusIcon />
      </span>
      <span className={styles.copy}>
        <span className={styles.eyebrow}>Acción principal</span>
        <span className={styles.title}>{label}</span>
        <span className={styles.sub}>{sub}</span>
      </span>
      <span className={styles.arrow}>
        <ChevronRightIcon />
      </span>
    </button>
  );
}
```

```css
/* ctaPrimary.module.css */
.cta {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: #fff;
  border: none;
  border-radius: var(--radius-cta);
  padding: 22px 24px;
  box-shadow: var(--shadow-cta-primary);
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  width: 100%;
  font-family: inherit;
  text-align: left;
  position: relative;
  overflow: hidden;
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.cta:active {
  transform: scale(0.98);
  box-shadow: 0 6px 14px rgba(229, 110, 38, 0.28);
}
.cta::after {
  content: "";
  position: absolute;
  top: -40%;
  right: -20%;
  width: 220px;
  height: 220px;
  background: radial-gradient(closest-side, rgba(255,255,255,0.18), transparent);
  pointer-events: none;
}
.glyph {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: rgba(255,255,255,0.22);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  position: relative;
}
.glyph svg { width: 28px; height: 28px; stroke: currentColor; stroke-width: 2.5; fill: none; stroke-linecap: round; }
.copy { flex: 1; min-width: 0; position: relative; z-index: 1; }
.eyebrow {
  display: block;
  font-size: 11px;
  font-weight: 600;
  opacity: 0.86;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.title {
  display: block;
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.018em;
  line-height: 1.1;
  margin-top: 3px;
}
.sub {
  display: block;
  font-size: 12.5px;
  opacity: 0.84;
  margin-top: 4px;
  line-height: 1.4;
}
.arrow {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}
.arrow svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2.5; fill: none; stroke-linecap: round; stroke-linejoin: round; }
```

### 3. `CTAAskHuella.tsx`

Card secundaria. Mismo gesto (botón + título + flecha) pero sin protagonismo.

```tsx
import styles from './ctaAskHuella.module.css';

interface CTAAskHuellaProps {
  onClick: () => void;
  question?: string;       // default: "¿Qué patrón ves esta semana?"
}

export function CTAAskHuella({ onClick, question = '¿Qué patrón ves esta semana?' }: CTAAskHuellaProps) {
  return (
    <button className={styles.cta} onClick={onClick}>
      <span className={styles.brand}>h</span>
      <span className={styles.copy}>
        <span className={styles.eyebrow}>Pregúntale a Huella</span>
        <span className={styles.title}>{question}</span>
      </span>
      <span className={styles.arrow}>
        <ChevronRightIcon />
      </span>
    </button>
  );
}
```

```css
/* ctaAskHuella.module.css */
.cta {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-primary-border);
  border-radius: 16px;
  cursor: pointer;
  width: 100%;
  font-family: inherit;
  text-align: left;
  transition: border-color 120ms ease;
}
.cta:active { border-color: var(--color-primary); }
.brand {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--color-accent-green);
  display: grid;
  place-items: center;
  color: #fff;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 22px;
  line-height: 1;
  flex-shrink: 0;
}
.copy { flex: 1; min-width: 0; }
.eyebrow {
  display: block;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent-green);
}
.title {
  display: block;
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  margin-top: 1px;
  letter-spacing: -0.005em;
}
.arrow {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-primary-bg);
  display: grid;
  place-items: center;
  color: var(--color-primary-dark);
  flex-shrink: 0;
}
.arrow svg { width: 12px; height: 12px; stroke: currentColor; stroke-width: 2.5; fill: none; stroke-linecap: round; stroke-linejoin: round; }
```

### 4. `SectionEyebrow.tsx`

Etiqueta pequeña entre secciones.

```tsx
import styles from './sectionEyebrow.module.css';

export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <div className={styles.eyebrow}>{children}</div>;
}
```

```css
.eyebrow {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  padding: 0 4px;
  margin-top: 4px;
  margin-bottom: -6px;
}
```

### 5. `ResumenSemanal.tsx`

Tres tiles equivalentes en una card. Cada tile lleva número + label + opcional delta.

```tsx
import styles from './resumenSemanal.module.css';
import { Delta } from './Delta';

interface WeekSummary {
  rangeStart: Date;
  rangeEnd: Date;
  episodes: number;
  episodesDelta: number;        // diferencia vs semana anterior (-1 = uno menos)
  episodesDeltaPct: number;     // -0.18 = -18%
  intensityAvg: number;         // 0–5 con un decimal
  intensityDelta: number;       // -0.4
  topTriggerEmoji: string;      // "🍽"
  topTriggerLabel: string;      // "Comida"
}

export function ResumenSemanal({ data }: { data: WeekSummary }) {
  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h4>Resumen semanal</h4>
        <span className={styles.range}>{formatRange(data.rangeStart, data.rangeEnd)}</span>
      </header>
      <div className={styles.grid}>
        <div className={styles.cell}>
          <div className={styles.num}>{data.episodes}</div>
          <div className={styles.lbl}>Episodios</div>
          {data.episodesDelta !== 0 && <Delta direction={data.episodesDelta < 0 ? 'down' : 'up'} positiveDirection="down">{formatPct(data.episodesDeltaPct)}</Delta>}
        </div>
        <div className={styles.cell}>
          <div className={`${styles.num} ${styles.numTang}`}>{data.intensityAvg.toFixed(1)}</div>
          <div className={styles.lbl}>Intensidad media</div>
          {data.intensityDelta !== 0 && <Delta direction={data.intensityDelta < 0 ? 'down' : 'up'} positiveDirection="down">{formatSigned(data.intensityDelta, 1)}</Delta>}
        </div>
        <div className={styles.cell}>
          <div className={styles.emo} aria-label={data.topTriggerLabel}>{data.topTriggerEmoji}</div>
          <div className={styles.lbl}>Top gatillo</div>
        </div>
      </div>
    </section>
  );
}

function formatRange(a: Date, b: Date) {
  const fmt = (d: Date) => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(d).replace('.', '');
  return `${fmt(a)} → ${fmt(b)}`;
}
function formatPct(p: number) {
  const sign = p < 0 ? '↓' : '↑';
  return `${sign} ${Math.abs(Math.round(p * 100))}%`;
}
function formatSigned(n: number, digits: number) {
  const sign = n < 0 ? '↓' : '↑';
  return `${sign} ${Math.abs(n).toFixed(digits)}`;
}
```

```css
/* resumenSemanal.module.css */
.card {
  background: var(--color-surface);
  border-radius: 18px;
  padding: 16px 18px;
  box-shadow: var(--shadow-card-soft);
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
}
.head h4 {
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.range {
  font-size: 10.5px;
  color: var(--color-text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}
.cell {
  text-align: center;
  padding: 6px 4px;
  border-right: 1px solid var(--color-border);
}
.cell:last-child { border-right: none; }
.num {
  font-family: var(--font-heading);
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.025em;
  color: var(--color-text);
}
.numTang { color: var(--color-primary); }
.emo {
  font-size: 28px;
  line-height: 1;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.08));
}
.lbl {
  font-size: 9.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  font-weight: 600;
  margin-top: 6px;
  line-height: 1.3;
}
```

### 6. `Delta.tsx`

Indicador genérico de cambio. **`positiveDirection="down"`** indica que para esta métrica una bajada es buena (verde) — porque menos episodios o menos intensidad es bueno.

```tsx
import styles from './delta.module.css';

interface DeltaProps {
  direction: 'up' | 'down';
  positiveDirection: 'up' | 'down';   // qué dirección consideramos positiva
  children: React.ReactNode;
}

export function Delta({ direction, positiveDirection, children }: DeltaProps) {
  const isPositive = direction === positiveDirection;
  return (
    <span className={`${styles.delta} ${isPositive ? styles.good : styles.bad}`}>
      {children}
    </span>
  );
}
```

```css
.delta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-top: 2px;
}
.good { color: var(--color-success); }
.bad  { color: var(--color-warning); }
```

### 7. `ChartFrecuencia.tsx`

Barras verticales por día, peak destacado en gradiente tangerina.

```tsx
import styles from './chartFrecuencia.module.css';

interface ChartFrecuenciaProps {
  data: { day: 'L'|'M'|'M'|'J'|'V'|'S'|'D'; count: number }[];
  peakDay?: string;
  peakCaption?: string;
}

export function ChartFrecuencia({ data, peakCaption }: ChartFrecuenciaProps) {
  const max = Math.max(...data.map(d => d.count), 1);
  const peakIdx = data.findIndex(d => d.count === max);

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h5>Frecuencia diaria</h5>
        <span className={styles.meta}>7 días</span>
      </header>
      <div className={styles.bars}>
        {data.map((d, i) => {
          const heightPx = d.count === 0 ? 6 : 12 + (d.count / max) * 64;
          const cls = d.count === 0 ? styles.zero : i === peakIdx ? styles.peak : '';
          return (
            <div key={i} className={`${styles.col} ${cls}`}>
              <div className={styles.bar} style={{ height: heightPx }} />
            </div>
          );
        })}
      </div>
      <div className={styles.dayLabels}>
        {data.map((d, i) => (
          <span key={i} className={i === peakIdx ? styles.peakLabel : ''}>{d.day}</span>
        ))}
      </div>
      <div className={styles.counts}>
        {data.map((d, i) => (
          <span key={i} className={i === peakIdx ? styles.peakCount : ''}>{d.count}</span>
        ))}
      </div>
      {peakCaption && (
        <p className={styles.caption}><strong>{peakCaption}</strong></p>
      )}
    </section>
  );
}
```

```css
/* chartFrecuencia.module.css */
.card {
  background: var(--color-surface);
  border-radius: 18px;
  padding: 16px 18px;
  box-shadow: var(--shadow-card-soft);
}
.head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
.head h5 { font-family: var(--font-heading); font-size: 14.5px; font-weight: 700; letter-spacing: -0.005em; }
.meta { font-size: 10.5px; color: var(--color-text-muted); letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; }

.bars { display: flex; align-items: flex-end; gap: 6px; height: 80px; }
.col { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; }
.bar {
  background: var(--color-primary-bg);
  border-radius: 6px 6px 0 0;
  min-height: 6px;
}
.col.peak .bar {
  background: linear-gradient(180deg, var(--color-primary-light), var(--color-primary));
}
.col.zero .bar {
  background: var(--color-surface-alt);
  height: 6px;
}

.dayLabels, .counts { display: flex; gap: 6px; margin-top: 6px; }
.dayLabels span { flex: 1; text-align: center; font-size: 10px; color: var(--color-text-muted); font-weight: 600; letter-spacing: 0.04em; }
.dayLabels .peakLabel { color: var(--color-primary-dark); font-weight: 700; }
.counts { margin-top: 4px; }
.counts span { flex: 1; text-align: center; font-family: var(--font-heading); font-size: 11px; font-weight: 700; color: var(--color-text-light); }
.counts .peakCount { color: var(--color-primary); }

.caption {
  font-size: 11.5px;
  color: var(--color-text-muted);
  line-height: 1.45;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--color-border);
}
.caption strong { color: var(--color-text); font-weight: 600; }
```

### 8. `ChartIntensidad.tsx`

Sparkline mocha con punto resaltado en el peak.

```tsx
import styles from './chartIntensidad.module.css';

interface ChartIntensidadProps {
  data: { day: string; value: number }[];   // value 0–5
  peakIdx?: number;
  caption?: string;
}

export function ChartIntensidad({ data, peakIdx, caption }: ChartIntensidadProps) {
  const W = 320, H = 80, pad = 8;
  const xs = data.map((_, i) => (i * (W - pad * 2)) / (data.length - 1) + pad);
  const ys = data.map(d => H - pad - (d.value / 5) * (H - pad * 2));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const areaPath = `${path} L${xs[xs.length-1]},${H} L${xs[0]},${H} Z`;
  const pi = peakIdx ?? data.reduce((iMax, d, i, a) => d.value > a[iMax].value ? i : iMax, 0);

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h5>Intensidad en el tiempo</h5>
        <span className={styles.meta}>7 días</span>
      </header>
      <svg className={styles.spark} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="intFade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-mocha)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-accent-mocha)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="20" x2={W} y2="20" stroke="var(--color-border)" strokeDasharray="3,4" />
        <line x1="0" y1="50" x2={W} y2="50" stroke="var(--color-border)" strokeDasharray="3,4" />
        <path d={areaPath} fill="url(#intFade)" />
        <path d={path} fill="none" stroke="var(--color-accent-mocha)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={xs[pi]} cy={ys[pi]} r="9" fill="var(--color-primary)" fillOpacity="0.18" />
        <circle cx={xs[pi]} cy={ys[pi]} r="4" fill="var(--color-primary)" />
        <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="4" fill="var(--color-accent-mocha)" />
      </svg>
      <div className={styles.axis}>{data.map((d, i) => <span key={i}>{d.day}</span>)}</div>
      {caption && <p className={styles.caption}><strong>{caption}</strong></p>}
    </section>
  );
}
```

```css
/* chartIntensidad.module.css — comparte con frecuencia */
.card { background: var(--color-surface); border-radius: 18px; padding: 16px 18px; box-shadow: var(--shadow-card-soft); }
.head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
.head h5 { font-family: var(--font-heading); font-size: 14.5px; font-weight: 700; letter-spacing: -0.005em; }
.meta { font-size: 10.5px; color: var(--color-text-muted); letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; }
.spark { display: block; width: 100%; height: 80px; }
.axis { display: flex; justify-content: space-between; margin-top: 6px; font-size: 10px; color: var(--color-text-muted); font-weight: 600; letter-spacing: 0.06em; }
.caption { font-size: 11.5px; color: var(--color-text-muted); line-height: 1.45; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--color-border); }
.caption strong { color: var(--color-text); font-weight: 600; }
```

### 9. `ChartGatillos.tsx`

Ranking horizontal — emoji en chip + nombre + barra de progreso + conteo.

```tsx
import styles from './chartGatillos.module.css';

interface Trigger {
  emoji: string;
  label: string;
  count: number;
  bgToken: string;          // var token: 'pill-emocion-bg' | 'leaf-bg' | 'info-bg' | etc.
}

interface ChartGatillosProps {
  data: Trigger[];          // top 3 ya rankeado
}

export function ChartGatillos({ data }: ChartGatillosProps) {
  const max = Math.max(...data.map(t => t.count), 1);
  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h5>Gatillos más frecuentes</h5>
        <span className={styles.meta}>Últimos 30 días</span>
      </header>
      {data.map((t, i) => (
        <div key={i} className={styles.row}>
          <span className={styles.emoji} style={{ background: `var(--color-${t.bgToken})` }}>{t.emoji}</span>
          <div className={styles.info}>
            <div className={styles.name}>{t.label}</div>
            <div className={styles.meter}>
              <i style={{ width: `${(t.count / max) * 100}%` }} />
            </div>
          </div>
          <div className={styles.cnt}>
            {t.count}
            <small>veces</small>
          </div>
        </div>
      ))}
    </section>
  );
}
```

```css
/* chartGatillos.module.css */
.card { background: var(--color-surface); border-radius: 18px; padding: 16px 18px; box-shadow: var(--shadow-card-soft); }
.head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
.head h5 { font-family: var(--font-heading); font-size: 14.5px; font-weight: 700; letter-spacing: -0.005em; }
.meta { font-size: 10.5px; color: var(--color-text-muted); letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; }

.row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.row + .row { border-top: 1px solid var(--color-border); }
.emoji {
  width: 36px; height: 36px;
  border-radius: 11px;
  display: grid; place-items: center;
  font-size: 18px;
  flex-shrink: 0;
}
.info { flex: 1; min-width: 0; }
.name { font-family: var(--font-heading); font-size: 13.5px; font-weight: 700; letter-spacing: -0.005em; }
.meter { height: 5px; background: var(--color-surface-alt); border-radius: 3px; overflow: hidden; margin-top: 5px; }
.meter > i { display: block; height: 100%; background: linear-gradient(90deg, var(--color-accent-mocha), #B89A88); border-radius: 3px; }
.cnt { font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--color-text); width: 28px; text-align: right; letter-spacing: -0.01em; }
.cnt small {
  display: block;
  font-family: var(--font-family);
  font-size: 9px;
  color: var(--color-text-light);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
```

### 10. `AnalisisIA.tsx`

Card crema/verde con titular del patrón y dos CTAs.

```tsx
import styles from './analisisIa.module.css';

interface PatternAnalysis {
  id: string;
  detectedAt: Date;             // cuándo Huella generó este insight
  acknowledgedAt?: Date;        // cuándo el usuario lo vio por primera vez
  title: string;                // "El plato no es el plato — es el momento."
  body: string;
  suggestedStrategyId: string;
  status: 'new' | 'seen' | 'snoozed' | 'accepted' | 'dismissed';
}

interface AnalisisIAProps {
  pattern: PatternAnalysis;
  onAccept: () => void;
  onDismiss: () => void;
}

export function AnalisisIA({ pattern, onAccept, onDismiss }: AnalisisIAProps) {
  const isNew = shouldShowNewBadge(pattern);

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <div className={styles.logo}>h</div>
        <div className={styles.name}>
          Huella
          <small>Análisis semanal</small>
        </div>
        {isNew && <span className={styles.badge}>Nuevo</span>}
      </header>
      <h3 className={styles.title}>{pattern.title}</h3>
      <p className={styles.body}>{pattern.body}</p>
      <div className={styles.actions}>
        <button className={`${styles.btn} ${styles.primary}`} onClick={onAccept}>
          Ver estrategia sugerida
        </button>
        <button className={`${styles.btn} ${styles.ghost}`} onClick={onDismiss}>
          Más tarde
        </button>
      </div>
    </article>
  );
}

// Lógica del badge "Nuevo"
function shouldShowNewBadge(p: PatternAnalysis): boolean {
  if (p.status === 'accepted' || p.status === 'dismissed') return false;
  if (!p.acknowledgedAt) return true;                          // nunca lo vio
  const hoursSinceDetected = (Date.now() - p.detectedAt.getTime()) / 36e5;
  const hoursSinceAck = (Date.now() - p.acknowledgedAt.getTime()) / 36e5;
  return hoursSinceDetected < 48 && hoursSinceAck < 24;        // sigue siendo "nuevo" 24h post-vista, hasta 48h después de generado
}
```

```css
/* analisisIa.module.css */
.card {
  background: linear-gradient(180deg, var(--color-surface) 0%, var(--color-celebration-start) 100%);
  border: 1px solid var(--color-primary-border);
  border-left: 3px solid var(--color-accent-green);
  border-radius: var(--radius-card-lg);
  padding: 18px 20px;
  box-shadow: var(--shadow-card-medium);
}
.head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.logo {
  width: 28px; height: 28px;
  border-radius: 9px;
  background: var(--color-accent-green);
  display: grid; place-items: center;
  font-family: var(--font-heading);
  font-weight: 700;
  color: #fff;
  font-size: 17px;
  line-height: 1;
}
.name { font-size: 12px; font-weight: 700; }
.name small {
  display: block;
  font-weight: 500;
  font-size: 10px;
  color: var(--color-text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-top: 1px;
}
.badge {
  margin-left: auto;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 4px 9px;
  border-radius: 999px;
  background: var(--color-leaf-bg);
  color: var(--color-tag-green);
}
.title {
  font-family: var(--font-heading);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.018em;
  line-height: 1.18;
  margin-bottom: 8px;
}
.body {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--color-text);
  margin-bottom: 12px;
}
.actions { display: flex; gap: 8px; }
.btn {
  flex: 1;
  padding: 10px;
  border-radius: 12px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  border: none;
}
.primary { background: var(--color-primary-dark); color: #fff; }
.ghost {
  background: transparent;
  color: var(--color-primary-dark);
  border: 1.5px solid var(--color-primary-border);
}
```

---

## Tipografía · jerarquía completa

| Rol | Familia | Size / line-height | Weight | Tracking |
|---|---|---|---|---|
| Hero greeting | Fraunces | 28 / 1.15 | 700 | -0.02em |
| Wordmark + dateLabel chip | Fraunces 22 / Plus Jakarta 12 uppercase | mixto | 700 / 600 | -0.02em / 0.06em |
| CTA 1° title | Fraunces | 22 / 1.10 | 700 | -0.018em |
| CTA 1° eyebrow | Plus Jakarta | 11 uppercase | 600 | 0.10em |
| CTA 1° sub | Plus Jakarta | 12.5 / 1.40 | 400 | — |
| CTA 2° title | Fraunces | 15 / 1.20 | 700 | -0.005em |
| CTA 2° eyebrow | Plus Jakarta | 10.5 uppercase | 700 | 0.12em |
| Section eyebrow | Plus Jakarta | 10.5 uppercase | 700 | 0.18em |
| Card head h4 | Fraunces | 16 / 1.20 | 700 | -0.01em |
| Card head h5 | Fraunces | 14.5 / 1.20 | 700 | -0.005em |
| Stat number (resumen) | Fraunces | 32 / 1.0 | 700 | -0.025em |
| IA title | Fraunces | 19 / 1.18 | 700 | -0.018em |
| Body / IA copy | Plus Jakarta | 13.5 / 1.55 | 400 | — |
| Caption (chart pie) | Plus Jakarta | 11.5 / 1.45 | 400 (strong → 600) | — |
| Day label, count | Plus Jakarta / Fraunces | 10–11 | 600–700 | 0.04–0.06em |

---

## Spacing · jerarquía

| Espacio | Valor |
|---|---|
| Hero padding | `8px 24px 24px` |
| Hero row → greet (gap interno) | `14px` |
| Hero greet → subcopy | `6px` |
| Body padding | `20px 20px 28px` |
| Stack gap (entre cards y CTAs) | `16px` |
| Eyebrow margin-top / -bottom | `4px` / `-6px` (queda pegado al bloque siguiente) |
| Card padding | `16px 18px` (cards de contexto) · `18px 20px` (IA) |
| CTA 1° padding | `22px 24px` |
| CTA 2° padding | `14px 16px` |
| Bottom nav padding | `8px 4px 20px` (cubre safe-area inferior) |

## Radios

| Elemento | Token |
|---|---|
| CTA 1° | `var(--radius-cta)` = 22px |
| Card chart / resumen | `18px` (literal) |
| Card IA | `var(--radius-card-lg)` = 20px |
| CTA 2° | `16px` (literal) |
| Glyph CTA 1° | `18px` |
| Brand "h" CTA 2° | `12px` |
| Emoji chip gatillo | `11px` |
| Botones IA | `12px` |
| Profile, bell, FAB | `50%` |

## Sombras

| Elemento | Token |
|---|---|
| CTA 1° | `var(--shadow-cta-primary)` |
| Card resumen / charts | `var(--shadow-card-soft)` |
| Card IA | `var(--shadow-card-medium)` |
| FAB bottom nav | `var(--shadow-fab)` |
| CTA 2° | sin sombra |

---

## Notas de comportamiento

### Saludo dinámico
- Deriva del **nombre del padre/madre** (`user.firstName`) y **la hora del dispositivo**.
- Cuatro franjas: madrugada (0–6) / mañana (6–12) / tarde (12–19) / noche (19–24).
- Ver función `getGreeting()` en `Hero.tsx`. La subcopy también varía: en la mañana menciona al hijo por nombre ("Lucas está empezando el día"), en otras franjas usa fórmulas neutras.
- Internacionalizar a futuro: mover los strings a `i18n/es/panel.json`.

### Deltas verdes
- El `<Delta>` usa la prop `positiveDirection` para saber qué dirección es buena. Para episodios e intensidad: `positiveDirection="down"` (menos es mejor) → flecha abajo en verde, arriba en `--color-warning`.
- Ocultar el delta cuando `delta === 0` (no decir "0%").
- Cuando `episodes < 3` en la semana, **no** mostrar deltas: muestra estadísticamente inestable. En su lugar mostrar copy "—" en gris.
- Formato: `↓ 18%` (signo unicode + espacio + número absoluto). Decimal con 1 dígito para intensidad: `↓ 0.4`.

### Badge "NUEVO" del análisis IA
- Visible si:
  1. El patrón fue detectado hace **menos de 48h**, **y**
  2. El usuario nunca lo abrió (`acknowledgedAt == null`) **o** lo vio hace menos de 24h.
- Se oculta inmediatamente cuando `status` es `'accepted'` o `'dismissed'`.
- Cuando se monta el componente, si `acknowledgedAt == null`, disparar mutation `markPatternSeen(patternId)` para guardar el timestamp. El badge sigue mostrándose por 24h adicionales para que sea recuperable visualmente.
- Si no hay `pattern` (sin datos suficientes para análisis), **no renderizar `<AnalisisIA>` en absoluto** y omitir su `<SectionEyebrow>`. El panel termina en los charts.

### Microinteracciones
- **CTA 1° tap:** `transform: scale(0.98)` + sombra reducida durante el press (transición 120 ms ease).
- **CTA 2° tap:** borde pasa de `--color-primary-border` a `--color-primary` durante el press.
- **Cards:** sin estado hover en mobile. Ningún tap target dentro de las cards de contexto — son lectura.
- **Scroll:** scroll vertical normal, sin parallax ni efectos de header colapsable. El hero mocha hace scroll-out junto con el body. Si el repo ya tiene scroll-progress en el AppShell, respetar.
- **Charts:** sin animación de entrada por defecto. Si el repo usa Framer Motion, opcional un `initial={{opacity:0, y:8}} animate={{opacity:1, y:0}}` con `delay: index * 60ms` al montar.

### Estados de carga
- Mientras `useWeekSummary()` carga: skeleton del `<ResumenSemanal>` con tres tiles greyed out (`background: var(--color-surface-alt)`, números y labels en `--color-border`). No hacer skeleton del hero ni del CTA primario — éstos se renderizan inmediatamente con datos del usuario en cache.
- Si falla cualquier query: mostrar la card con `<EmptyState />` (componente que ya existe en el repo) en lugar del contenido. Mantener el resto del panel funcional.

### Estados de datos insuficientes
- **0 episodios esta semana:** ResumenSemanal muestra los tres tiles con número `—` (em-dash) y un único delta omitido. Charts ocultos. SectionEyebrow "Cómo se ve la semana" oculta. Análisis IA oculto.
- **Entre 1 y 6 episodios:** todos los componentes visibles, pero deltas ocultos (muestra inestable).
- **7+ episodios:** todo el panel completo (estado del mockup).

---

## Assets

### Iconos (lucide-react sirve; si el repo ya tiene un set propio reusarlo)

| Nombre en mockup | Equivalente lucide | Uso |
|---|---|---|
| `BellIcon` | `Bell` | Hero · campana de notificaciones |
| `PlusIcon` | `Plus` (stroke 2.5) | CTA 1° · glyph + FAB bottom nav |
| `ChevronRightIcon` | `ChevronRight` (stroke 2.5) | Flechas de CTA |
| Status bar (signal/wifi/battery) | (existentes en repo) | No tocar |
| Bottom nav (home, history, target, star) | (existentes en repo) | No tocar |

### Wordmark "huella"

Texto plano `huella` en Fraunces 700, no es un SVG — es un `<span>` con `font-family: var(--font-heading)`.

### "h" mark de Huella (verde)

Texto `h` en Fraunces 700 sobre fondo `var(--color-accent-green)`. Aparece en:
- CTA 2° (`brand` 38×38, font-size 22)
- AnalisisIA (`logo` 28×28, font-size 17)

No requiere SVG dedicado.

### Emojis

Unicode plano en chips. Emojis del mockup: 🍽 😴 🚪. El backend ya entrega `emoji` por categoría de gatillo — reusar.

---

## Files in this bundle

- `design/panel-inicio-final.html` — mockup hi-fi aprobado (referencia visual primaria)
- `design/panel-inicio-explore.html` — los 3 enfoques explorados (A/B/C). Contexto de por qué se eligió Acción primero
- `design/colors_and_type.css` — design tokens completos del sistema Huella (Mocha Mix)
- `design/screens.css` — estilos compartidos del UI kit móvil (botones, status bar, bottom nav)

Abrir `panel-inicio-final.html` en un navegador para inspeccionar el resultado final con scroll real. La columna derecha tiene las notas de jerarquía que ampliaron este handoff.
