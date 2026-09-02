// SelectorFechaNacimiento.jsx
// Fecha de nacimiento de un hijo, con tres <select> nativos: Dia / Mes / Anio.
//
// Path: src/components/ui/SelectorFechaNacimiento.jsx
//
// POR QUE EXISTE (QA del 2 sep 2026): el onboarding usaba <input type="date">
// y el calendario de Chrome Android abre en el mes actual. Para un hijo de 3
// anios eso son ~36 toques al boton de "mes anterior". Tres <select> nativos
// abren la rueda de iOS y el dropdown de Android: el anio se elige de una.
//
// CONTRATO — el mismo que tenia el input nativo, para no tocar nada aguas
// abajo (el persistor, la RPC `upsert_family_child` y `hijos.fecha_nacimiento`
// siguen recibiendo lo mismo):
//   value     string · 'YYYY-MM-DD' o '' si esta incompleta
//   onChange  (iso: string) => void · emite '' mientras falte cualquiera de
//             los tres, y 'YYYY-MM-DD' recien cuando estan los tres.
//
// Reemplaza al `max={hoy}` del input nativo filtrando las opciones: en el anio
// en curso no se ofrecen meses futuros, y en el mes en curso no se ofrecen
// dias futuros. No se puede elegir una fecha que todavia no ocurre.

import React, { useState, useEffect, useMemo, useCallback, forwardRef } from 'react';
import styles from './SelectorFechaNacimiento.module.css';

// Rango de anios: de hoy hacia atras, 0 a 18 anios (19 opciones). Huella es
// una app de crianza; sobre los 18 el hijo ya no es el sujeto del producto.
const ANIOS_ATRAS = 18;

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Dias del mes con bisiesto real (regla completa: /4 si, /100 no, /400 si).
// `new Date(anio, mes, 0).getDate()` la resuelve sola, pero solo si el anio
// esta completo; mientras falta, asumimos 31 para no esconder opciones.
function diasDelMes(anio, mes) {
  if (!mes) return 31;
  if (!anio) return mes === '02' ? 29 : new Date(2024, Number(mes), 0).getDate();
  return new Date(Number(anio), Number(mes), 0).getDate();
}

const pad = (n) => String(n).padStart(2, '0');

function parseIso(iso) {
  if (!iso || typeof iso !== 'string') return { dia: '', mes: '', anio: '' };
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { dia: '', mes: '', anio: '' };
  return { anio: m[1], mes: m[2], dia: m[3] };
}

function toIso({ dia, mes, anio }) {
  if (!dia || !mes || !anio) return '';
  return `${anio}-${mes}-${dia}`;
}

/**
 * Props
 *   value     string  · 'YYYY-MM-DD' | ''
 *   onChange  (iso: string) => void
 *   idPrefix  string  · opcional, para que convivan dos selectores en una
 *                       misma pantalla sin colisionar los ids de los labels
 *
 * El ref se reenvia al <select> del dia (el primero). El onboarding enfoca el
 * campo de cada paso al entrar, y sin esto el paso de la fecha seria el unico
 * que no recibe foco.
 */
const SelectorFechaNacimiento = forwardRef(function SelectorFechaNacimiento(
  { value = '', onChange, idPrefix = 'fnac' },
  ref
) {
  const [partes, setPartes] = useState(() => parseIso(value));

  // Resync con el padre solo cuando trae una fecha COMPLETA distinta de la
  // nuestra (caso tipico: PerfilPage cargando el hijo que ya existe). No
  // reaccionamos al '' para no borrar una seleccion a medias mientras el
  // usuario todavia esta eligiendo.
  useEffect(() => {
    if (value && value !== toIso(partes)) setPartes(parseIso(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const hoy = useMemo(() => new Date(), []);
  const anioActual = hoy.getFullYear();
  const mesActual = pad(hoy.getMonth() + 1);
  const diaActual = hoy.getDate();

  // Anios del mas reciente hacia atras: el recien nacido es el caso mas
  // frecuente al registrarse, asi que va primero y no al final de la lista.
  const anios = useMemo(
    () => Array.from({ length: ANIOS_ATRAS + 1 }, (_, i) => String(anioActual - i)),
    [anioActual]
  );

  // En el anio en curso no existen los meses que todavia no llegan.
  const mesesVisibles = useMemo(() => {
    const tope = partes.anio === String(anioActual) ? Number(mesActual) : 12;
    return MESES.slice(0, tope).map((nombre, i) => ({ valor: pad(i + 1), nombre }));
  }, [partes.anio, anioActual, mesActual]);

  // Y en el mes en curso, tampoco los dias que no han pasado.
  const diasVisibles = useMemo(() => {
    let tope = diasDelMes(partes.anio, partes.mes);
    if (partes.anio === String(anioActual) && partes.mes === mesActual) {
      tope = Math.min(tope, diaActual);
    }
    return Array.from({ length: tope }, (_, i) => pad(i + 1));
  }, [partes.anio, partes.mes, anioActual, mesActual, diaActual]);

  // Cambiar mes o anio puede dejar el dia fuera de rango (31 de enero → marzo
  // esta bien, pero 31 → febrero no existe). Lo recortamos al ultimo dia
  // valido en vez de borrarlo: el valor queda a la vista en el propio select,
  // asi que el ajuste no es silencioso.
  const emitir = useCallback((siguiente) => {
    let { dia, mes, anio } = siguiente;
    if (dia && (mes || anio)) {
      let tope = diasDelMes(anio, mes);
      if (anio === String(anioActual) && mes === mesActual) {
        tope = Math.min(tope, diaActual);
      }
      if (Number(dia) > tope) dia = pad(tope);
    }
    // Mismo recorte para el mes cuando se salta al anio en curso.
    if (mes && anio === String(anioActual) && Number(mes) > Number(mesActual)) {
      mes = mesActual;
    }
    const final = { dia, mes, anio };
    setPartes(final);
    onChange?.(toIso(final));
  }, [onChange, anioActual, mesActual, diaActual]);

  const campo = (clave, etiqueta, opciones, render) => (
    <span className={styles.campo}>
      <select
        ref={clave === 'dia' ? ref : undefined}
        id={`${idPrefix}-${clave}`}
        className={styles.select}
        value={partes[clave]}
        onChange={(e) => emitir({ ...partes, [clave]: e.target.value })}
        aria-label={etiqueta}
      >
        <option value="">{etiqueta}</option>
        {opciones.map(render)}
      </select>
    </span>
  );

  return (
    <div className={styles.fila} role="group" aria-label="Fecha de nacimiento">
      {campo('dia', 'Día', diasVisibles, (d) => (
        <option key={d} value={d}>{Number(d)}</option>
      ))}
      {campo('mes', 'Mes', mesesVisibles, (m) => (
        <option key={m.valor} value={m.valor}>{m.nombre}</option>
      ))}
      {campo('anio', 'Año', anios, (a) => (
        <option key={a} value={a}>{a}</option>
      ))}
    </div>
  );
});

export default SelectorFechaNacimiento;
