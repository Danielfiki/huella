import React from 'react';
import styles from './EstrategiaActivaCard.module.css';

export default function EstrategiaActivaCard({
  plan,
  hijo,
  ciclosAnteriores = [],
  onAbrir,
}) {
  const totalSem = plan.total_semanas || 4;
  const semActual = plan.semana_actual || 1;
  const cicloActual = ciclosAnteriores.length + 1;
  const inicial = (hijo?.nombre || '·').charAt(0).toUpperCase();

  const totalCiclos = ciclosAnteriores.length + 1;
  let lineasPrevias = ciclosAnteriores;
  let resumen = null;
  if (totalCiclos >= 4) {
    const aColapsar = ciclosAnteriores.slice(0, -1);
    lineasPrevias = ciclosAnteriores.slice(-1);
    resumen = {
      desde: aColapsar[0].numero,
      hasta: aColapsar[aColapsar.length - 1].numero,
      semanas: aColapsar.reduce(
        (acc, c) => acc + (c.semanas_completadas || 0),
        0,
      ),
    };
  }

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <div className={styles.top}>
          <div className={styles.child}>{inicial}</div>
          <div className={styles.childMeta}>
            <div className={styles.nm}>{hijo?.nombre}</div>
            <div className={styles.age}>{hijo?.edad ? `${hijo.edad} años` : ''}</div>
          </div>
        </div>

        <div className={styles.ttl}>{plan.habilidad_nombre}</div>

        <div className={styles.thread}>
          {resumen && (
            <div className={styles.roll}>
              <span className={styles.l}>
                {resumen.desde === resumen.hasta
                  ? `Ciclo ${resumen.desde}`
                  : `Ciclos ${resumen.desde}–${resumen.hasta}`}
              </span>
              <span className={styles.bar} />
              <span className={styles.r}>{resumen.semanas} sem</span>
            </div>
          )}

          {lineasPrevias.map((c) => (
            <CycleLine key={c.numero} ciclo={c} />
          ))}

          <CycleLine
            ciclo={{
              numero: cicloActual,
              total_semanas: totalSem,
              semana_actual: semActual,
              estado: 'activo',
            }}
            esCicloUnico={cicloActual === 1}
          />
        </div>
      </div>

      <button type="button" className={styles.cta} onClick={onAbrir}>
        Ver tu semana {semActual}
        <span className={styles.arr} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </span>
      </button>
    </article>
  );
}

function CycleLine({ ciclo, esCicloUnico = false }) {
  const total = ciclo.total_semanas || 4;
  let cls = styles.done;
  let label = `Ciclo ${ciclo.numero}`;
  let right = `${ciclo.semanas_completadas || 0}/${total}`;

  if (ciclo.estado === 'activo') {
    cls = styles.now;
    label = esCicloUnico ? 'En curso' : `Ciclo ${ciclo.numero}`;
    right = `Sem ${ciclo.semana_actual}/${total}`;
  } else if (ciclo.estado === 'abandonado') {
    cls = styles.aban;
  }

  return (
    <div className={`${styles.cycleLine} ${cls}`}>
      <span className={styles.l}>{label}</span>
      <div className={styles.dots}>
        {Array.from({ length: total }).map((_, i) => {
          const idx = i + 1;
          let dotCls = '';
          if (ciclo.estado === 'activo') {
            if (idx < ciclo.semana_actual) dotCls = styles.dDone;
            else if (idx === ciclo.semana_actual) dotCls = styles.dNow;
          } else {
            if (idx <= (ciclo.semanas_completadas || 0)) dotCls = styles.dDone;
          }
          return <span key={i} className={`${styles.d} ${dotCls}`} />;
        })}
      </div>
      <span className={styles.r}>{right}</span>
    </div>
  );
}
