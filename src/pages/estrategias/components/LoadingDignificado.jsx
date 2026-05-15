import React, { useState, useMemo, useEffect } from 'react';
import { fraseCarga } from '../../../lib/frases';
import styles from './LoadingDignificado.module.css';

const INTERVALO_MS = 4500;
const FADE_MS = 300;

// Construye un pool contextualizado muestreando fraseCarga con la
// habilidad y la edad reales del hijo. No toca frases.js. Dedup por
// texto. Si queda pobre (habilidadId/edad desconocidos), insiste con
// las fases generales (0 y 3, que no dependen de habilidad ni edad).
function construirPool(habilidadId, hijoEdad) {
  const vistas = new Set();
  const pool = [];
  const agregar = (f) => {
    if (f && f.texto && !vistas.has(f.texto)) {
      vistas.add(f.texto);
      pool.push(f);
    }
  };
  for (let intento = 0; intento < 10; intento++) {
    for (const fase of [0, 1, 2, 3]) agregar(fraseCarga(fase, habilidadId, hijoEdad));
  }
  let guard = 0;
  while (pool.length < 8 && guard < 40) {
    agregar(fraseCarga(0, habilidadId, hijoEdad));
    agregar(fraseCarga(3, habilidadId, hijoEdad));
    guard++;
  }
  return pool;
}

function barajar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function LoadingDignificado({ titulo, sub, pasos, pasoActual, habilidadId, hijoEdad }) {
  // Pool fijo durante toda la carga (una sola construcción al montar).
  const frases = useMemo(
    () => barajar(construirPool(habilidadId, hijoEdad)),
    [habilidadId, hijoEdad]
  );

  const [indice, setIndice] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (frases.length <= 1) return;
    const id = setInterval(() => {
      setVisible(false); // fade out
      setTimeout(() => {
        setIndice((i) => (i + 1) % frases.length); // recorre el pool barajado: sin repetición inmediata
        setVisible(true); // fade in
      }, FADE_MS);
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [frases.length]);

  const frase = frases[indice] ?? frases[0];

  return (
    <div className={styles.card}>
      <div className={styles.pulse}>h</div>
      <div className={styles.ttl}>{titulo}</div>
      <p className={styles.sub}>{sub}</p>
      {frase && (
        <div className={styles.fraseWrap} style={{ opacity: visible ? 1 : 0 }}>
          <p className={styles.fraseTexto}>"{frase.texto}"</p>
          <span className={styles.fraseAutor}>— {frase.autor}</span>
        </div>
      )}
      <ol className={styles.steps}>
        {pasos.map((txt, i) => {
          const cls = i < pasoActual ? styles.done : i === pasoActual ? styles.now : styles.next;
          return (
            <li key={i} className={cls}>
              <span className={styles.ic}>{i < pasoActual ? '✓' : '·'}</span>
              <span className={styles.copy}>{txt}</span>
            </li>
          );
        })}
      </ol>
      <div className={styles.barra} role="progressbar" aria-label="Generando tu plan">
        <span className={styles.barraFill} />
      </div>
    </div>
  );
}
