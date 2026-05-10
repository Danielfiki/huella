import React, { useState } from 'react';
import { HABILIDADES_CATALOGO } from '../helpers';
import styles from './SelectorHabilidades.module.css';

const TAG_LABELS = {
  regulacion_emocional: 'Regulación emocional',
  berrinches: 'Berrinches',
  frustracion: 'Frustración',
  enojo: 'Enojo',
};
const TAG_ORDER = ['regulacion_emocional', 'berrinches', 'frustracion', 'enojo'];

function buildCategories() {
  const cats = {};
  for (const grupo of Object.values(HABILIDADES_CATALOGO)) {
    for (const item of grupo.items) {
      for (const tag of (item.tags || [])) {
        if (!cats[tag]) cats[tag] = [];
        if (!cats[tag].find((x) => x.id === item.id)) cats[tag].push(item);
      }
    }
  }
  return cats;
}

const CATEGORIES = buildCategories();

function resolveGrupo(it) {
  for (const [key, g] of Object.entries(HABILIDADES_CATALOGO)) {
    if (g.items.find((x) => x.id === it.id)) return { grupo: key, grupoNombre: g.nombre };
  }
  return { grupo: 'emocional', grupoNombre: '' };
}

export default function SelectorHabilidades({ seleccionada, onElegir, habilidadesEnPlanActivo }) {
  const [expandedCats, setExpandedCats] = useState({ berrinches: true });
  const [otra, setOtra] = useState(false);
  const [otraTexto, setOtraTexto] = useState('');
  const [msgBloqueada, setMsgBloqueada] = useState('');

  const visibleTags = TAG_ORDER.filter((tag) => CATEGORIES[tag]?.length > 0);

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

  const toggleCat = (tag) => {
    setExpandedCats((prev) => ({ ...prev, [tag]: !prev[tag] }));
  };

  return (
    <div className={styles.box}>
      <header className={styles.head}>
        <span className={styles.headTtl}>Elige una habilidad</span>
      </header>
      <p className={styles.intro}>Si vienes con algo específico en mente, busca por aquí.</p>
      {msgBloqueada && <p className={styles.bloqueadaMsg}>{msgBloqueada}</p>}

      {visibleTags.map((tag) => {
        const items = CATEGORIES[tag];
        const isExpanded = !!expandedCats[tag];
        return (
          <div key={tag} className={styles.cat}>
            <button
              className={`${styles.catHeader} ${isExpanded ? styles.catHeaderOpen : ''}`}
              onClick={() => toggleCat(tag)}
              aria-expanded={isExpanded}
            >
              <span className={styles.catName}>{TAG_LABELS[tag]}</span>
              {!isExpanded && (
                <span className={styles.catCount}>
                  {items.length} {items.length === 1 ? 'habilidad' : 'habilidades'}
                </span>
              )}
              <span className={styles.catChev} aria-hidden="true">{isExpanded ? '▲' : '▼'}</span>
            </button>
            {isExpanded && (
              <div className={styles.catContent}>
                <div className={styles.skills}>
                  {items.map((it) => {
                    const on = seleccionada === it.id;
                    const bloqueada = habilidadesEnPlanActivo?.has(it.label);
                    return (
                      <button
                        key={it.id}
                        className={`${styles.skill} ${on ? styles.on : ''} ${bloqueada ? styles.bloqueada : ''}`}
                        onClick={() => handleClickHabilidad(it)}
                      >
                        <span className={styles.e}>{it.emoji}</span>
                        {it.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
