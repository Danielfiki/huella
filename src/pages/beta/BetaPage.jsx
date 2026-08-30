import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

// Colores: tokens reales de src/index.css (así la página es theme-aware).
const C = {
  crema: "var(--color-bg)",
  surface: "var(--color-surface)",
  surfaceAlt: "var(--color-surface-alt)",
  border: "var(--color-border)",
  terracota: "var(--color-primary)",
  terracotaDark: "var(--color-primary-dark)",
  mocha: "var(--color-accent-mocha)",
  pistacho: "var(--color-accent-green)",
  pistachoBg: "var(--color-success-bg)",
  fresa: "var(--color-strawberry)",
  fresaBg: "var(--color-danger-bg)",
  lavanda: "var(--color-accent-blue)",
  text: "var(--color-text)",
  muted: "var(--color-text-muted)",
  light: "var(--color-text-light)",
};

const KEY = "huella-beta-operacion";
const GUARDADO_MS = 900;   // espera antes de subir, para no escribir en cada tecla
const META_CORREOS = 20;   // meta ideal: lo que se muestra en el contador y en los textos
const MIN_CORREOS = 15;    // minimo para poder lanzar; los 20 son colchon, no requisito
const MIN_INSTALADOS = 12;
const DIAS = 14;
const LINK = "https://play.google.com/apps/testing/lat.huella.app";
const CODIGOS = Array.from({ length: 20 }, (_, i) => `HUELLA-${String(i + 1).padStart(2, "0")}`);

const M = {
  historia: `Slide 1
Llevo meses construyendo algo y hoy necesito ayuda.
Se llama Huella.

Slide 2
Son las 8 de la noche. Tu hijo está en el suelo llorando y tú ya no sabes si abrazarlo, retarlo o esperar.
Y al otro día pasa de nuevo.

Huella es para esos momentos. Anotas lo que pasó en 30 segundos y te dice qué había detrás, qué evitar y qué hacer la próxima vez. Con estrategias basadas en evidencia. Y afinadas a tu hijo, no a "los niños".

Slide 3 (con caja de preguntas: "Tu correo Gmail")
Busco ${META_CORREOS} papás y mamás para probarla antes de que salga.

Necesito que sea:
· Android (iPhone va en una segunda ronda)
· con cuenta Gmail
· y que la dejes instalada 14 días

Acceso completo gratis. Déjame tu Gmail acá abajo.`,

  dm: `¡Gracias [nombre]!

Anoté tu correo. Voy a juntar el grupo completo y les mando todo junto el mismo día, así partimos todos a la vez.

¿Me pasas tu WhatsApp? Te agrego a un grupo chico donde te paso el paso a paso y me puedes contar cómo te va.`,

  dmIphone: `¡Gracias [nombre]! Esta primera ronda es solo Android por un tema de la tienda de apps.

Te anoto para la ronda de iPhone, que viene después. Te aviso apenas esté.`,

  bienvenida: `¡Bienvenidos!

Este grupo es para pasarles las instrucciones y para que me cuenten cómo les va.

Estoy juntando al grupo completo. Apenas estemos todos les mando el paso a paso y arrancamos el mismo día.

Cualquier cosa me escriben por acá o por privado, como prefieran.`,

  lanzamiento: `Llego el dia! Aca va todo. Son 3 pasos, 5 minutos.

1. Unete a la prueba
Abre este link desde tu telefono, con la misma cuenta Gmail que me diste:
${LINK}
Vas a ver una pantalla de Google Play. Toca el boton para aceptar ser tester.

2. Instala Huella
En esa misma pantalla toca "descargala en Google Play" y luego Instalar.
Si te dice que no esta disponible, espera unos minutos y vuelve a entrar. Google se demora un poco en darte el acceso.

3. Crea tu cuenta y activa tu acceso
Abre la app y registrate con el mismo Gmail que me diste.
Al entrar la app te va a pedir unos datos tuyos y de tu hijo o hija: completa eso primero.
Despues, abajo a la derecha toca "Tú". Baja un poco y vas a encontrar el bloque que dice "¿Tienes un código de invitación?": pega ahi el codigo que te mando por privado ahora y toca "Activar".

Eso es todo. Despues usala cuando pase algo con tu hijo o hija, sin apuro.

Un favor importante: dejala instalada estos 14 dias aunque no la uses mucho. Google cuenta eso, y es lo que me permite publicarla.

Si algo se traba, me escriben y lo vemos.`,

  codigo: `[nombre], tu codigo es: HUELLA-XX

Lo activas dentro de la app: abajo a la derecha toca "Tú", baja hasta el bloque que dice "¿Tienes un código de invitación?", pega el codigo ahi y toca "Activar". Te deja el acceso completo listo.`,

  noInstalo: `Hola [nombre], ¿lograste instalarla? Si se trabó en algún paso me dices y lo vemos.`,

  pregunta: `Chiquillos, una pregunta y los dejo tranquilos: ¿hubo algo confuso al empezar? Cualquier detalle me sirve.`,

  postmortem: `Hola [nombre], vi que no la seguiste usando y quiero pedirte un favor raro: cuentame por que. En serio, eso me sirve mucho mas que si la hubieras usado por compromiso.

Se te olvido, no le viste el sentido, te costo algo? Lo que sea.`,
};

const inicial = {
  historia: [false, false, false],
  grupoCreado: false,
  lanz: { verificado: false, decidido: false, grupoGoogle: false, codigos: false, mensaje: false, privados: false },
  fechaInicio: "",
  dias: { revisado: false, pregunta: false, clasificado: false, postmortem: false },
  cierre: { agradecido: false, feedback: false, v4: false },
  testers: [],
  iphone: [],
};

const id = () => `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

function diaDe(fecha) {
  if (!fecha) return 0;
  const a = new Date(`${fecha}T00:00:00`);
  const b = new Date();
  b.setHours(0, 0, 0, 0);
  return Math.floor((b - a) / 86400000) + 1;
}

// Decide la única cosa que toca hacer ahora.
function calcularHoy(e) {
  const correos = e.testers.length;
  const conWsp = e.testers.filter((t) => t.whatsapp).length;
  const instalados = e.testers.filter((t) => t.instalo).length;
  const sinCodigo = e.testers.filter((t) => !t.codigo).length;
  const dia = diaDe(e.fechaInicio);

  if (!e.historia[0])
    return {
      k: "h0",
      titulo: "Publica la historia",
      porque: "Es lo único que separa a Huella de tener usuarios reales. Historia, no reel.",
      msg: M.historia,
      msgLabel: "Los tres slides",
      cta: "Ya la publiqué",
      hacer: (s) => ({ ...s, historia: [true, s.historia[1], s.historia[2]] }),
    };

  if (correos < META_CORREOS && !e.historia[1])
    return {
      k: "h1",
      titulo: "Repite la historia",
      porque: "La primera vez no la ve todo el mundo. Van dos de tres.",
      msg: M.historia,
      msgLabel: "Los tres slides",
      cta: "Repetida",
      hacer: (s) => ({ ...s, historia: [true, true, s.historia[2]] }),
      extra: correos > 0 ? `Llevas ${correos} correos. Responde los DM que lleguen.` : null,
      extraMsg: M.dm,
      extraLabel: "Respuesta por DM",
    };

  if (correos >= 5 && conWsp >= 5 && !e.grupoCreado)
    return {
      k: "g",
      titulo: "Crea el grupo de WhatsApp",
      porque: `Ya tienes 5 con número. No esperes a los ${META_CORREOS}: el grupo sirve para soltar el link a todos a la vez.`,
      msg: M.bienvenida,
      msgLabel: "Mensaje de bienvenida · grupo \"Huella · Beta\"",
      cta: "Grupo creado",
      hacer: (s) => ({ ...s, grupoCreado: true }),
    };

  if (correos < META_CORREOS && !e.historia[2])
    return {
      k: "h2",
      titulo: "Última repetición de la historia",
      porque: `Llevas ${correos} de ${META_CORREOS}. La meta son ${META_CORREOS} para tener colchón: siempre se cae alguien.`,
      msg: M.historia,
      msgLabel: "Los tres slides",
      cta: "Repetida",
      hacer: (s) => ({ ...s, historia: [true, true, true] }),
      extraMsg: M.dm,
      extraLabel: "Respuesta por DM",
    };

  if (correos < MIN_CORREOS)
    return {
      k: "esperar",
      titulo: "Junta los correos que faltan",
      porque: `Llevas ${correos} de ${META_CORREOS}. Con ${MIN_CORREOS} ya puedes partir, porque Google exige ${MIN_INSTALADOS} instalados a la vez; el resto es colchón.`,
      msg: M.dm,
      msgLabel: "Respuesta por DM",
      nota: "No sueltes el link todavía. Rebota hasta que agregues a la persona al grupo de Google.",
    };

  if (correos < META_CORREOS && !e.lanz.decidido)
    return {
      k: "listo",
      titulo: "Ya puedes lanzar cuando quieras",
      porque: `Llevas ${correos} de ${META_CORREOS} correos. Con eso ya cubres los ${MIN_INSTALADOS} instalados que exige Google, así que puedes partir cuando quieras. Los que faltan son colchón por si alguien no instala. Puedes seguir sumando gente o lanzar el día que decidas.`,
      cta: "Lanzo ahora",
      hacer: (s) => ({ ...s, lanz: { ...s.lanz, decidido: true } }),
      nota: "El día que lances haces todo junto en una hora: correos al grupo de Google, esperar 20 minutos, paso a paso al grupo, códigos por privado. El link no se manda de a poco.",
    };

  if (!e.lanz.grupoGoogle)
    return {
      k: "l1",
      titulo: "Agrega los Gmail al grupo de Google",
      porque: "Sin esto el link rebota. groups.google.com → Testers huella → Personas → Miembros → Añadir miembros.",
      cta: "Todos agregados",
      hacer: (s) => ({ ...s, lanz: { ...s.lanz, grupoGoogle: true } }),
      nota: "Verifica que \"Añadir miembros directamente\" esté marcado. Si alguno rebota, sácalo y agrégalo aparte.",
      copiarGmails: true,
    };

  if (!e.lanz.codigos)
    return {
      k: "l2",
      titulo: "Asigna un código a cada persona",
      porque:
        sinCodigo > 0
          ? `Te faltan ${sinCodigo} por asignar. Son de uso único: si dos reciben el mismo, el segundo se queda afuera.`
          : "Ya están todos asignados. Revísalos una vez más y sigue.",
      cta: "Códigos listos",
      hacer: (s) => ({ ...s, lanz: { ...s.lanz, codigos: true } }),
    };

  if (!e.lanz.mensaje)
    return {
      k: "l3",
      titulo: "Manda el paso a paso al grupo",
      porque: "Todos el mismo día. Acá parte el reloj de 14 días.",
      msg: M.lanzamiento,
      msgLabel: "Mensaje de 3 pasos",
      cta: "Mensaje enviado",
      hacer: (s) => ({ ...s, lanz: { ...s.lanz, mensaje: true } }),
    };

  if (!e.lanz.privados)
    return {
      k: "l4",
      titulo: "Manda el código por privado a cada uno",
      porque: "Uno por persona, sin repetir. Los tienes en la lista de abajo.",
      msg: M.codigo,
      msgLabel: "Mensaje privado",
      cta: "Todos enviados",
      hacer: (s) => ({ ...s, lanz: { ...s.lanz, privados: true } }),
    };

  if (!e.fechaInicio)
    return {
      k: "fecha",
      titulo: "Anota el día que llegaste a 12 instalados",
      porque: "El reloj corre desde ahí, y vas a necesitar la fecha para saber cuándo puedes publicar.",
      fecha: true,
      nota: "Revisa las instalaciones reales en Play Console → Estadísticas.",
    };

  if (instalados < MIN_INSTALADOS)
    return {
      k: "caido",
      titulo: "El reloj está detenido",
      porque: `Tienes ${instalados} instalados y Google pide ${MIN_INSTALADOS} al mismo tiempo. Estos días no cuentan.`,
      msg: M.noInstalo,
      msgLabel: "Mensaje suave por privado",
      alerta: true,
    };

  if (!e.dias.revisado)
    return {
      k: "d1",
      titulo: "Revisa quién instaló de verdad",
      porque: "Play Console → Estadísticas → instalaciones. Si alguien no aparece, escríbele por privado.",
      msg: M.noInstalo,
      msgLabel: "Mensaje suave por privado",
      cta: "Revisado",
      hacer: (s) => ({ ...s, dias: { ...s.dias, revisado: true } }),
    };

  if (dia >= 3 && !e.dias.pregunta)
    return {
      k: "d3",
      titulo: "La única pregunta que sí haces",
      porque: "Una sola vez, al grupo. Después no preguntas nada más.",
      msg: M.pregunta,
      msgLabel: "Al grupo",
      cta: "Preguntado",
      hacer: (s) => ({ ...s, dias: { ...s.dias, pregunta: true } }),
    };

  if (dia >= 7 && !e.dias.clasificado)
    return {
      k: "d7",
      titulo: "Clasifica a tus testers",
      porque:
        "Mira quién registró y quién no. Marca el toggle Registro de los que sí están usando la app. Eso te dice a quién escribirle el día 10 y a quién dejar tranquilo.",
      cta: "Clasificado",
      hacer: (s) => ({ ...s, dias: { ...s.dias, clasificado: true } }),
      nota: "Corre la consulta de métricas en Supabase para saber quién registró de verdad. No preguntes por WhatsApp.",
    };

  if (dia >= 10 && !e.dias.postmortem)
    return {
      k: "d10",
      titulo: "Escríbele a los que se cayeron",
      porque:
        "Solo a los que NO tienen el toggle Registro marcado. A los que sí están usando la app no les escribas nada hasta el final.",
      msg: M.postmortem,
      msgLabel: "Privado a cada caído",
      cta: "Enviados",
      hacer: (s) => ({ ...s, dias: { ...s.dias, postmortem: true } }),
      nota: "Un solo mensaje por persona. Si no responde, lo dejas.",
    };

  if (dia <= DIAS)
    return {
      k: "obs",
      titulo: "Observa, no empujes",
      porque:
        "Respondes si te escriben. Nunca preguntas \"¿cómo vas?\". Un tester presionado te da feedback de compromiso, que es peor que ninguno.",
      nota: "Anota cada cosa que te digan, aunque parezca menor. Ojo con la pantalla de invitar a la pareja y con el retrato del hijo al principio.",
    };

  if (!e.cierre.agradecido)
    return {
      k: "c1",
      titulo: "Agradece al grupo",
      porque: "Se cumplieron los 14 días. Mensaje personal, no plantilla.",
      cta: "Agradecido",
      hacer: (s) => ({ ...s, cierre: { ...s.cierre, agradecido: true } }),
    };

  if (!e.cierre.feedback)
    return {
      k: "c2",
      titulo: "Junta el feedback y decide qué se arregla",
      porque: "Todo en un solo lugar, antes de tocar código.",
      cta: "Listo",
      hacer: (s) => ({ ...s, cierre: { ...s.cierre, feedback: true } }),
    };

  if (!e.cierre.v4)
    return {
      k: "c3",
      titulo: "Sube la v4 a producción",
      porque: "Recién acá se cierra la advertencia de Google del 31 de agosto.",
      cta: "Publicada",
      hacer: (s) => ({ ...s, cierre: { ...s.cierre, v4: true } }),
    };

  return {
    k: "fin",
    titulo: "La beta terminó",
    porque: "Huella está en producción. Lo que sigue es la ronda de iPhone y el feedback que juntaste.",
  };
}

export default function BetaPage() {
  const { user } = useAuth();
  const [e, setE] = useState(inicial);
  const [cargando, setCargando] = useState(true);
  const [falloGuardar, setFalloGuardar] = useState(false);
  const [falloNube, setFalloNube] = useState(false);
  const [copiado, setCopiado] = useState("");
  const [nom, setNom] = useState("");
  const [mail, setMail] = useState("");
  const [ip, setIp] = useState("");
  const [verMensajes, setVerMensajes] = useState(false);

  const timerRef = useRef(null);
  const pendienteRef = useRef(null);
  const montadoRef = useRef(true);
  useEffect(() => () => { montadoRef.current = false; }, []);

  // ── Lectura al montar, en dos fases ─────────────────────────────────────
  // Fase 1 — cache local: pinta de inmediato, sin esperar la red. Es lo que
  // evita que el tablero se vea vacio mientras carga. Se fusiona con `inicial`
  // por si el guardado viejo no tiene todas las claves.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setE({ ...inicial, ...JSON.parse(raw) });
    } catch {
      /* primera vez o localStorage no disponible */
    } finally {
      setCargando(false);
    }
  }, []);

  // Fase 2 — la nube manda: si hay fila guardada, reemplaza lo local. Asi el
  // celular se pone al dia con lo que se hizo en el PC. Regla de conflicto
  // acordada: al abrir la pagina gana lo que esta en Supabase.
  useEffect(() => {
    if (!user) return;
    let vivo = true;
    (async () => {
      const { data, error } = await supabase
        .from("tablero_beta")
        .select("estado")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!vivo) return;
      if (error) {
        setFalloNube(true);
        return;
      }
      if (data?.estado) {
        const remoto = { ...inicial, ...data.estado };
        setE(remoto);
        try {
          localStorage.setItem(KEY, JSON.stringify(remoto));
        } catch {
          /* cache best-effort: si no se puede escribir, igual seguimos */
        }
      }
    })();
    return () => {
      vivo = false;
    };
  }, [user]);

  // ── Escritura ───────────────────────────────────────────────────────────
  // Sube a Supabase lo ultimo que quedo pendiente. Se llama con debounce, al
  // desmontar y cuando la pestana pasa a segundo plano (clave en el celular).
  // Es un upsert sobre la misma fila (user_id es PK): nunca borra nada.
  const subir = useCallback(async () => {
    const sig = pendienteRef.current;
    if (!sig || !user) return;
    pendienteRef.current = null;
    const { error } = await supabase
      .from("tablero_beta")
      .upsert(
        { user_id: user.id, estado: sig, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (montadoRef.current) setFalloNube(!!error);
  }, [user]);

  // Escritura en cada cambio. El guardado local sigue siendo inmediato y en
  // try/catch (aviso `falloGuardar`); la subida a la nube va con debounce y
  // tiene su propio aviso (`falloNube`), porque son fallas distintas: si la
  // nube falla, el cambio SI quedo guardado en este dispositivo.
  const set = (sig) => {
    setE(sig);
    // 1. Cache local: inmediata. Si se cae la red, el cambio no se pierde.
    try {
      localStorage.setItem(KEY, JSON.stringify(sig));
      setFalloGuardar(false);
    } catch {
      setFalloGuardar(true);
    }
    // 2. Nube: con debounce, para no escribir una fila por cada tecla del nombre.
    pendienteRef.current = sig;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(subir, GUARDADO_MS);
  };

  // Nada se pierde al salir: lo pendiente se sube al cerrar la pestana o al
  // mandarla a segundo plano.
  useEffect(() => {
    const alOcultar = () => {
      if (document.visibilityState === "hidden") subir();
    };
    document.addEventListener("visibilitychange", alOcultar);
    return () => {
      document.removeEventListener("visibilitychange", alOcultar);
      clearTimeout(timerRef.current);
      subir();
    };
  }, [subir]);

  const copiar = async (texto, etiqueta) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(etiqueta);
      setTimeout(() => setCopiado(""), 1800);
    } catch {
      setCopiado("nope");
      setTimeout(() => setCopiado(""), 1800);
    }
  };

  if (cargando)
    return (
      <div style={{ background: C.crema, padding: 24, color: C.muted, fontFamily: "var(--font-family)" }}>Cargando...</div>
    );

  const hoy = calcularHoy(e);
  const correos = e.testers.length;
  const instalados = e.testers.filter((t) => t.instalo).length;
  const dia = diaDe(e.fechaInicio);
  const relojVivo = e.fechaInicio && instalados >= MIN_INSTALADOS;
  const usados = {};
  e.testers.forEach((t) => t.codigo && (usados[t.codigo] = (usados[t.codigo] || 0) + 1));
  const repetido = Object.values(usados).some((n) => n > 1);

  const css = `
    .f { font-family: var(--font-heading); }
    .j { font-family: var(--font-family); }
    .eb { letter-spacing: .14em; text-transform: uppercase; }
    .bt:focus-visible, .in:focus-visible { outline: 2px solid ${C.terracota}; outline-offset: 2px; }
    .bt { transition: opacity .15s ease; }
    .bt:hover { opacity: .88; }
    @media (prefers-reduced-motion: reduce) { .bt { transition: none; } }
  `;

  return (
    <div className="j" style={{ background: C.crema, minHeight: "100%", color: C.text }}>
      <style>{css}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "26px 16px 60px" }}>
        <div className="eb" style={{ fontSize: 10, fontWeight: 700, color: C.light, marginBottom: 12 }}>
          Huella · Beta Android
        </div>

        {/* ── LO QUE TOCA AHORA ── */}
        <div
          style={{
            background: hoy.alerta ? C.fresaBg : C.surface,
            border: `1px solid ${hoy.alerta ? C.fresa : C.border}`,
            borderLeft: `5px solid ${hoy.alerta ? C.fresa : C.terracota}`,
            borderRadius: 18,
            padding: "20px 20px 22px",
            boxShadow: "0 8px 22px rgba(42,26,14,0.07)",
          }}
        >
          <div className="eb" style={{ fontSize: 9.5, fontWeight: 700, color: hoy.alerta ? C.fresa : C.terracota }}>
            {hoy.alerta ? "Antes de seguir" : "Lo que toca ahora"}
          </div>

          <h1 className="f" style={{ fontSize: 25, fontWeight: 700, lineHeight: 1.2, margin: "8px 0 0" }}>
            {hoy.titulo}
          </h1>

          <p style={{ fontSize: 14, lineHeight: 1.55, color: C.muted, marginTop: 8 }}>{hoy.porque}</p>

          {hoy.nota && (
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: C.muted,
                background: C.surfaceAlt,
                borderRadius: 10,
                padding: "10px 12px",
                marginTop: 12,
              }}
            >
              {hoy.nota}
            </p>
          )}

          {hoy.msg && (
            <Mensaje
              label={hoy.msgLabel}
              texto={hoy.msg}
              copiado={copiado === hoy.msgLabel}
              onCopiar={() => copiar(hoy.msg, hoy.msgLabel)}
            />
          )}

          {hoy.extraMsg && (
            <Mensaje
              label={hoy.extraLabel}
              texto={hoy.extraMsg}
              copiado={copiado === hoy.extraLabel}
              onCopiar={() => copiar(hoy.extraMsg, hoy.extraLabel)}
            />
          )}

          {hoy.copiarGmails && e.testers.length > 0 && (
            <button
              className="bt j"
              onClick={() => copiar(e.testers.map((t) => t.gmail).filter(Boolean).join(", "), "gmails")}
              style={{
                marginTop: 12,
                background: C.surfaceAlt,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 600,
                color: C.text,
                cursor: "pointer",
                width: "100%",
              }}
            >
              {copiado === "gmails" ? "Copiados" : "Copiar los Gmail separados por coma"}
            </button>
          )}

          {hoy.fecha && (
            <input
              className="in j"
              type="date"
              value={e.fechaInicio}
              onChange={(ev) => set({ ...e, fechaInicio: ev.target.value })}
              style={{
                marginTop: 14,
                background: C.surface,
                border: `1.5px solid ${C.border}`,
                borderRadius: 12,
                padding: "11px 13px",
                fontSize: 15,
                color: C.text,
                width: "100%",
                maxWidth: 220,
              }}
            />
          )}

          {hoy.cta && (
            <button
              className="bt j"
              onClick={() => set(hoy.hacer(e))}
              style={{
                marginTop: 16,
                width: "100%",
                background: C.terracota,
                color: "var(--color-white)",
                border: "none",
                borderRadius: 14,
                padding: "14px 18px",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 5px 14px rgba(229,110,38,0.28)",
              }}
            >
              {hoy.cta}
            </button>
          )}
        </div>

        {copiado === "nope" && (
          <p style={{ fontSize: 12.5, color: C.fresa, marginTop: 8 }}>
            No se pudo copiar. Selecciona el texto a mano.
          </p>
        )}
        {falloGuardar && (
          <p style={{ fontSize: 12.5, color: C.fresa, marginTop: 8 }}>No se guardó el cambio. Vuelve a tocarlo.</p>
        )}
        {falloNube && (
          <p style={{ fontSize: 12.5, color: C.fresa, marginTop: 8 }}>
            Se guardó en este dispositivo, pero no se pudo sincronizar. Revisa tu conexión.
          </p>
        )}

        {/* ── RELOJ ── */}
        {e.fechaInicio && (
          <div
            style={{
              marginTop: 12,
              background: C.mocha,
              borderRadius: 16,
              padding: "16px 18px 18px",
              color: "var(--color-on-mocha)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="f" style={{ fontSize: 19, fontWeight: 700 }}>
                {relojVivo
                  ? dia > DIAS
                    ? "Los 14 días se cumplieron"
                    : `Día ${Math.min(dia, DIAS)} de ${DIAS}`
                  : "Reloj detenido"}
              </span>
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                {instalados}/{MIN_INSTALADOS} instalados
              </span>
            </div>
            <div style={{ display: "flex", gap: 3, marginTop: 12 }}>
              {Array.from({ length: DIAS }, (_, i) => {
                const n = i + 1;
                const act = relojVivo && n === Math.min(dia, DIAS) && dia <= DIAS;
                const pas = relojVivo && (n < dia || dia > DIAS);
                return (
                  <div
                    key={n}
                    style={{
                      flex: 1,
                      height: act ? 22 : 14,
                      alignSelf: "flex-end",
                      borderRadius: 3,
                      background: act
                        ? C.terracota
                        : pas
                        ? "rgba(250,243,236,.85)"
                        : "rgba(250,243,236,.2)",
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── TESTERS ── */}
        <div style={{ marginTop: 26 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 className="f" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              Testers
            </h2>
            <span style={{ fontSize: 12.5, color: C.light, marginLeft: "auto" }}>
              {correos}/{META_CORREOS} correos · {instalados} instalados
            </span>
          </div>

          {repetido && (
            <div
              style={{
                marginTop: 10,
                background: C.fresaBg,
                border: `1px solid ${C.fresa}`,
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              Hay un código repetido. Son de uso único: el segundo se queda afuera.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {e.testers.map((t) => (
              <div
                key={t.id}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 13, padding: 11 }}
              >
                <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                  <input
                    className="in j"
                    value={t.nombre}
                    placeholder="Nombre"
                    onChange={(ev) =>
                      set({ ...e, testers: e.testers.map((x) => (x.id === t.id ? { ...x, nombre: ev.target.value } : x)) })
                    }
                    style={campo(1)}
                  />
                  <button
                    className="bt"
                    onClick={() => set({ ...e, testers: e.testers.filter((x) => x.id !== t.id) })}
                    aria-label="Borrar"
                    style={{ background: "none", border: "none", color: C.light, fontSize: 19, cursor: "pointer" }}
                  >
                    ×
                  </button>
                </div>
                <input
                  className="in j"
                  value={t.gmail}
                  placeholder="correo@gmail.com"
                  onChange={(ev) =>
                    set({ ...e, testers: e.testers.map((x) => (x.id === t.id ? { ...x, gmail: ev.target.value } : x)) })
                  }
                  style={{ ...campo(0), marginTop: 6, width: "100%" }}
                />
                <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
                  <select
                    className="in j"
                    value={t.codigo}
                    onChange={(ev) =>
                      set({
                        ...e,
                        testers: e.testers.map((x) => (x.id === t.id ? { ...x, codigo: ev.target.value } : x)),
                      })
                    }
                    style={{
                      background: usados[t.codigo] > 1 ? C.fresaBg : C.surfaceAlt,
                      border: `1px solid ${usados[t.codigo] > 1 ? C.fresa : C.border}`,
                      borderRadius: 999,
                      padding: "6px 9px",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: C.text,
                    }}
                  >
                    <option value="">Sin código</option>
                    {CODIGOS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {[
                    ["whatsapp", "WhatsApp", C.mocha],
                    ["optIn", "Aceptó", C.lavanda],
                    ["instalo", "Instaló", C.pistacho],
                    ["registro", "Registro", C.terracota],
                  ].map(([k, label, col]) => (
                    <button
                      key={k}
                      className="bt j"
                      aria-pressed={!!t[k]}
                      onClick={() =>
                        set({ ...e, testers: e.testers.map((x) => (x.id === t.id ? { ...x, [k]: !x[k] } : x)) })
                      }
                      style={{
                        background: t[k] ? col : "transparent",
                        color: t[k] ? "var(--color-white)" : C.muted,
                        border: `1px solid ${t[k] ? col : C.border}`,
                        borderRadius: 999,
                        padding: "6px 11px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* Nota libre por tester: lo que dijo, para no perderlo en el chat. */}
                <input
                  className="in j"
                  value={t.nota || ""}
                  placeholder="Anota lo que te diga"
                  onChange={(ev) =>
                    set({ ...e, testers: e.testers.map((x) => (x.id === t.id ? { ...x, nota: ev.target.value } : x)) })
                  }
                  style={{ ...campo(0), marginTop: 8, width: "100%" }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
            <input
              className="in j"
              value={nom}
              placeholder="Nombre"
              onChange={(ev) => setNom(ev.target.value)}
              style={{ ...campo(0), flex: "1 1 110px" }}
            />
            <input
              className="in j"
              value={mail}
              placeholder="correo@gmail.com"
              onChange={(ev) => setMail(ev.target.value)}
              style={{ ...campo(0), flex: "1 1 150px" }}
            />
            <button
              className="bt j"
              onClick={() => {
                if (!nom.trim() && !mail.trim()) return;
                const libre = CODIGOS.find((c) => !usados[c]) || "";
                set({
                  ...e,
                  testers: [
                    ...e.testers,
                    {
                      id: id(),
                      nombre: nom.trim(),
                      gmail: mail.trim(),
                      codigo: libre,
                      whatsapp: false,
                      optIn: false,
                      instalo: false,
                      registro: false,
                      nota: "",
                    },
                  ],
                });
                setNom("");
                setMail("");
              }}
              style={{
                background: C.terracota,
                color: "var(--color-white)",
                border: "none",
                borderRadius: 11,
                padding: "10px 17px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Agregar
            </button>
          </div>
        </div>

        {/* ── IPHONE ── */}
        <div style={{ marginTop: 26 }}>
          <h2 className="f" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            Para la ronda de iPhone
          </h2>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Ya te dijeron que sí. Son oro para después.</p>
          {e.iphone.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {e.iphone.map((p) => (
                <span
                  key={p.id}
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 999,
                    padding: "6px 8px 6px 12px",
                    fontSize: 13,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  {p.nombre}
                  <button
                    className="bt"
                    onClick={() => set({ ...e, iphone: e.iphone.filter((x) => x.id !== p.id) })}
                    aria-label="Borrar"
                    style={{ background: "none", border: "none", color: C.light, cursor: "pointer", fontSize: 15 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
            <input
              className="in j"
              value={ip}
              placeholder="Nombre"
              onChange={(ev) => setIp(ev.target.value)}
              style={{ ...campo(0), flex: 1 }}
            />
            <button
              className="bt j"
              onClick={() => {
                if (!ip.trim()) return;
                set({ ...e, iphone: [...e.iphone, { id: id(), nombre: ip.trim() }] });
                setIp("");
              }}
              style={{
                background: "transparent",
                color: C.terracotaDark,
                border: "1.5px solid var(--color-primary-border)",
                borderRadius: 11,
                padding: "10px 15px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Anotar
            </button>
          </div>
        </div>

        {/* ── TODOS LOS MENSAJES ── */}
        <div style={{ marginTop: 26 }}>
          <button
            className="bt j"
            onClick={() => setVerMensajes(!verMensajes)}
            aria-expanded={verMensajes}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <span className="f" style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
              Todos los mensajes
            </span>
            <span style={{ fontSize: 12, color: C.light }}>{verMensajes ? "ocultar" : "ver"}</span>
          </button>
          {verMensajes && (
            <div style={{ marginTop: 12 }}>
              {[
                ["Historia de Instagram", M.historia],
                ["Respuesta por DM", M.dm],
                ["Respuesta a alguien con iPhone", M.dmIphone],
                ["Bienvenida al grupo", M.bienvenida],
                ["Paso a paso del lanzamiento", M.lanzamiento],
                ["Código por privado", M.codigo],
                ["Si alguien no instaló", M.noInstalo],
                ["La pregunta del día 3", M.pregunta],
                ["Privado a cada caído (día 10)", M.postmortem],
              ].map(([label, texto]) => (
                <Mensaje
                  key={label}
                  label={label}
                  texto={texto}
                  copiado={copiado === label}
                  onCopiar={() => copiar(texto, label)}
                />
              ))}
            </div>
          )}
        </div>

        <p style={{ fontSize: 12, color: C.light, marginTop: 30, lineHeight: 1.5 }}>
          El protocolo completo vive en tu PDF. Acá va solo lo que cambia día a día.
        </p>
        <button
          className="bt j"
          onClick={() => set(inicial)}
          style={{
            marginTop: 10,
            background: "none",
            border: "none",
            color: C.light,
            fontSize: 12,
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          Borrar todo y empezar de nuevo
        </button>
      </div>
    </div>
  );
}

function campo(flex) {
  return {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "9px 11px",
    fontSize: 14,
    color: C.text,
    flex: flex ? 1 : undefined,
    minWidth: 0,
  };
}

function Mensaje({ label, texto, copiado, onCopiar }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <span className="eb" style={{ fontSize: 9.5, fontWeight: 700, color: C.light }}>
          {label}
        </span>
        <button
          className="bt j"
          onClick={onCopiar}
          style={{
            marginLeft: "auto",
            background: copiado ? C.pistachoBg : "transparent",
            color: copiado ? C.pistacho : C.terracotaDark,
            border: `1px solid ${copiado ? C.pistacho : "var(--color-primary-border)"}`,
            borderRadius: 999,
            padding: "4px 11px",
            fontSize: 11.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre
        className="j"
        style={{
          background: C.surfaceAlt,
          borderRadius: 11,
          padding: "12px 13px",
          fontSize: 12.5,
          lineHeight: 1.55,
          color: C.text,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          margin: 0,
          maxHeight: 210,
          overflowY: "auto",
        }}
      >
        {texto}
      </pre>
    </div>
  );
}
