import React, { useState } from 'react';
import { HABILIDADES_CATALOGO } from '../helpers';
import styles from './SelectorHabilidades.module.css';

const FILTER_CHIPS = [
  { label: 'Todos',      slug: null },
  { label: 'Berrinches', slug: 'berrinches' },
  { label: 'Enojo',      slug: 'enojo' },
  { label: 'Frustración',slug: 'frustracion' },
  { label: 'Miedos',     slug: 'miedos' },
  { label: 'Sociales',   slug: 'sociales' },
  { label: 'Atención',   slug: 'atencion' },
  { label: 'Rutinas',    slug: 'rutinas' },
  { label: 'Autonomía',  slug: 'autonomia' },
  { label: 'Autoestima', slug: 'autoestima' },
  { label: 'Colegio',    slug: 'colegio' },
];

const TAG_DISPLAY = {
  berrinches: 'Berrinches', enojo: 'Enojo', frustracion: 'Frustración',
  miedos: 'Miedos', sociales: 'Sociales', atencion: 'Atención',
  rutinas: 'Rutinas', autonomia: 'Autonomía', autoestima: 'Autoestima', colegio: 'Colegio',
};

const GROUPS = [
  { key: 'emocional',  label: 'REGULACIÓN EMOCIONAL',    items: HABILIDADES_CATALOGO.emocional.items },
  { key: 'desarrollo', label: 'DESARROLLO Y APRENDIZAJE', items: HABILIDADES_CATALOGO.desarrollo.items },
];

function resolveGrupo(it) {
  for (const [key, g] of Object.entries(HABILIDADES_CATALOGO)) {
    if (g.items.find((x) => x.id === it.id)) return { grupo: key, grupoNombre: g.nombre };
  }
  return { grupo: 'emocional', grupoNombre: '' };
}

export default function SelectorHabilidades({ seleccionada, onElegir, onCasoLibre, habilidadesEnPlanActivo }) {
  const [activeFilter, setActiveFilter] = useState(null);
  const [casoTexto, setCasoTexto] = useState('');
  const [casoError, setCasoError] = useState('');
  const [otra, setOtra] = useState(false);
  const [otraTexto, setOtraTexto] = useState('');
  const [msgBloqueada, setMsgBloqueada] = useState('');

  const handleClickHabilidad = (it) => {
    const bloqueada = habilidadesEnPlanActivo?.has(it.label);
    if (bloqueada) {
      setMsgBloqueada(`Ya tienes un plan activo de "${it.label}".`);
      setTimeout(() => setMsgBloqueada(''), 3000);
      return;
    }
    const { grupo, grupoNombre } = resolveGrupo(it);
    onElegir({ ...it, grupo, grupoNombre });
  };

  const handleCasoLibreClick = () => {
    if (!casoTexto.trim()) {
      setCasoError('Cuéntanos un poco para poder armar tu plan.');
      return;
    }
    setCasoError('');
    onCasoLibre?.(casoTexto.trim());
  };

  const filterItem = (it) => !activeFilter || (it.tags || []).includes(activeFilter);

  return (
    <div className={styles.box}>
      {/* Card "Cuéntame tu caso" */}
      <div className={styles.casoCard}>
        <div className={styles.casoEyebrow}>CUÉNTAME TU CASO</div>
        <h4 className={styles.casoTitulo}>Describe tu situación</h4>
        <p className={styles.casoSub}>En tus palabras. Armamos un plan único para ti.</p>
        <textarea
          className={styles.casoTextarea}
          rows={4}
          placeholder="Mi hijo se frustra cuando le digo que apague el celular..."
          value={casoTexto}
          onChange={(e) => { setCasoTexto(e.target.value); if (casoError) setCasoError(''); }}
        />
        {casoError && <p className={styles.casoErrorMsg}>{casoError}</p>}
        <button className={styles.casoCta} onClick={handleCasoLibreClick}>
          Empecemos juntos →
        </button>
      </div>

      {/* Divider */}
      <div className={styles.divider}><span>o busca por aquí</span></div>

      {/* Filter chips */}
      <div className={styles.filters} role="group" aria-label="Filtrar por tema">
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilter === chip.slug;
          return (
            <button
              key={chip.slug ?? 'todos'}
              className={`${styles.filterChip} ${isActive ? styles.filterChipActive : ''}`}
              onClick={() => setActiveFilter(chip.slug)}
              aria-pressed={isActive}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {msgBloqueada && <p className={styles.bloqueadaMsg}>{msgBloqueada}</p>}

      {/* Flat list with visual group dividers */}
      {GROUPS.map((group) => {
        const visibles = group.items.filter(filterItem);
        if (visibles.length === 0) return null;
        return (
          <div key={group.key} className={styles.group}>
            <div className={styles.groupDivider}>{group.label}</div>
            {visibles.map((it) => {
              const bloqueada = habilidadesEnPlanActivo?.has(it.label);
              return (
                <button
                  key={it.id}
                  className={`${styles.row} ${bloqueada ? styles.rowBloqueada : ''}`}
                  onClick={() => handleClickHabilidad(it)}
                >
                  <span className={styles.rowEmoji} aria-hidden="true">{it.emoji}</span>
                  <span className={styles.rowBody}>
                    <span className={styles.rowLabel}>{it.label}</span>
                    {(it.tags || []).length > 0 && (
                      <span className={styles.rowTags}>
                        {(it.tags || []).map((t) => (
                          <span key={t} className={styles.tagChip}>{TAG_DISPLAY[t] || t}</span>
                        ))}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}

      {!otra ? (
        <button className={styles.other} onClick={() => setOtra(true)}>
          + Otra situación · escríbelo en tus palabras
        </button>
      ) : (
        <div className={styles.otraBox}>
          <textarea
            placeholder="Describí la situación en tus palabras…"
            value={otraTexto}
            onChange={(e) => setOtraTexto(e.target.value)}
          />
          <button
            disabled={otraTexto.trim().length < 10}
            onClick={() => onElegir({ id: 'otra', label: otraTexto.trim(), grupo: 'otra', grupoNombre: 'Otra' })}
          >
            Usar este texto
          </button>
        </div>
      )}
    </div>
  );
}
