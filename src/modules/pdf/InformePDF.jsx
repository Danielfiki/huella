import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer'

// ── Paleta ──────────────────────────────────────────────────────────────────
const C = {
  primary:      '#C17F5E',
  primaryLight: '#DBA890',
  primaryDark:  '#A66845',
  text:         '#2C1810',
  muted:        '#8B6355',
  border:       '#E8D5C8',
  surface:      '#F5EDE8',
  white:        '#FBF7F4',
  green:        '#6dbf88',
  yellow:       '#f0dfa0',
  red:          '#e87878',
  emocionBg:    '#eef0fb',
  emocionColor: '#5b6bbf',
}

const INTENSIDAD_LABEL = ['', 'Muy leve', 'Leve', 'Moderado', 'Intenso', 'Muy intenso']
const INTENSIDAD_COLOR = ['', '#a8d5b5', '#c4e0a8', C.yellow, C.primaryLight, C.red]

const TIPOS = {
  rabieta:     'Rabieta / explosion',
  llanto:      'Llanto intenso',
  agresividad: 'Golpes / agresividad',
  miedo:       'Miedo / angustia',
  sueno:       'No quiere dormir',
  social:      'Se aislo / no quiso relacionarse',
  desconexion: 'Se cerro / no respondia',
  oposicion:   'Oposicion / no coopera',
  otro:        'Otro',
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.text,
    paddingTop: 48,
    paddingBottom: 60,
    paddingHorizontal: 48,
  },

  // ── Header ──
  header: {
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
    paddingBottom: 16,
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  brandName: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
    letterSpacing: 1,
  },
  reportDate: {
    fontSize: 9,
    color: C.muted,
  },
  headerSub: {
    fontSize: 11,
    color: C.muted,
    marginTop: 4,
  },
  hijoName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
    marginTop: 8,
  },
  disclaimer: {
    fontSize: 8,
    color: C.muted,
    marginTop: 6,
    fontStyle: 'italic',
  },

  // ── Sections ──
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.primaryDark,
    borderBottomWidth: 1,
    borderBottomColor: C.primaryLight,
    paddingBottom: 4,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Resumen 30 dias ──
  resumenGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  resumenBox: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  resumenNum: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
  },
  resumenLabel: {
    fontSize: 8,
    color: C.muted,
    textAlign: 'center',
    marginTop: 2,
  },
  resumenPeriodo: {
    fontSize: 8,
    color: C.muted,
    marginTop: 4,
    marginBottom: 8,
  },
  resumenFila: {
    flexDirection: 'row',
    gap: 10,
  },
  resumenItem: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 6,
    padding: 8,
  },
  resumenItemLabel: {
    fontSize: 7,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  resumenItemVal: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
  },

  // ── Triggers ──
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  triggerLabel: {
    width: 140,
    fontSize: 9,
    color: C.text,
  },
  triggerTrack: {
    flex: 1,
    height: 8,
    backgroundColor: C.border,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  triggerBar: {
    height: 8,
    backgroundColor: C.primaryLight,
    borderRadius: 4,
  },
  triggerCount: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.primaryDark,
    width: 16,
    textAlign: 'right',
  },

  // ── Episode cards ──
  epCard: {
    backgroundColor: C.surface,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
  },
  epHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  epHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  epFecha: {
    fontSize: 9,
    color: C.muted,
  },
  epTipo: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
  },
  epIntBadge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: C.text,
  },
  epEmocion: {
    fontSize: 8,
    color: C.emocionColor,
    backgroundColor: C.emocionBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  epContexto: {
    fontSize: 9,
    color: C.muted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  epGatillantes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 5,
  },
  epGatillante: {
    fontSize: 8,
    color: C.primaryDark,
    backgroundColor: C.primaryLight,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
  },
  epOrientacionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.primaryDark,
    marginTop: 7,
    marginBottom: 3,
  },
  epOrientacion: {
    backgroundColor: C.white,
    padding: 7,
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: C.primaryLight,
  },
  epReflexionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.muted,
    marginTop: 7,
    marginBottom: 2,
  },
  epReflexion: {
    fontSize: 9,
    color: C.text,
    fontStyle: 'italic',
    lineHeight: 1.5,
  },
  mdText: {
    fontSize: 8.5,
    color: C.text,
    lineHeight: 1.5,
    marginBottom: 2,
  },
  mdHeading: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: C.primaryDark,
    marginTop: 5,
    marginBottom: 2,
  },
  mdListRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  mdBullet: {
    fontSize: 8.5,
    color: C.text,
    lineHeight: 1.5,
    width: 12,
  },
  mdListText: {
    fontSize: 8.5,
    color: C.text,
    lineHeight: 1.5,
    flex: 1,
  },

  // ── Strategies ──
  estrategiaCard: {
    backgroundColor: C.surface,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  estrategiaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  estrategiaNombre: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
  },
  estrategiaSemana: {
    fontSize: 8,
    color: C.muted,
  },
  progressTrack: {
    height: 5,
    backgroundColor: C.border,
    borderRadius: 3,
    marginTop: 5,
  },
  progressFill: {
    height: 5,
    backgroundColor: C.primary,
    borderRadius: 3,
  },

  // ── Hitos ──
  hitoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  hitoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.green,
    marginTop: 3,
    marginRight: 8,
  },
  hitoFecha: {
    fontSize: 8,
    color: C.muted,
    marginBottom: 1,
  },
  hitoDesc: {
    fontSize: 9,
    color: C.text,
  },

  // ── Resumen ejecutivo ──
  resumenEjecutivoBox: {
    backgroundColor: C.surface,
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
  },

  // ── Vista general ──
  vistaBox: {
    backgroundColor: C.surface,
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.primaryLight,
  },
  vistaContext: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
    marginBottom: 10,
  },
  vistaMetricGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  vistaMetricBox: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 4,
    padding: 8,
  },
  vistaMetricLabel: {
    fontSize: 7,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  vistaMetricVal: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.primaryDark,
  },
  vistaMetricDelta: {
    fontSize: 8,
    color: C.muted,
    marginTop: 2,
  },
  vistaFallback: {
    fontSize: 9,
    color: C.muted,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  vistaEstrategia: {
    fontSize: 8,
    color: C.muted,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // ── Reflexiones cuidador ──
  reflexionesBox: {
    backgroundColor: C.surface,
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: C.primaryLight,
    marginBottom: 10,
  },
  reflexionRow: {
    marginBottom: 6,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: C.border,
  },
  reflexionMeta: {
    fontSize: 7,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  reflexionTexto: {
    fontSize: 9,
    color: C.text,
    fontStyle: 'italic',
    lineHeight: 1.4,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 8,
    color: C.muted,
  },
})

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtFecha(str) {
  return new Date(str).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtFechaCorta(str) {
  return new Date(str).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtHora(str) {
  return new Date(str).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

function ultimos30Dias(episodios) {
  const corte = new Date()
  corte.setDate(corte.getDate() - 30)
  return episodios.filter((e) => new Date(e.fecha) >= corte)
}

function calcResumen30(episodios) {
  const recientes = ultimos30Dias(episodios)
  if (!recientes.length) return null

  const total = recientes.length
  const avgInt = (recientes.reduce((s, e) => s + e.intensidad, 0) / total).toFixed(1)

  const tipoCount = {}
  for (const ep of recientes) tipoCount[ep.tipo] = (tipoCount[ep.tipo] || 0) + 1
  const tipoTopKey = Object.entries(tipoCount).sort((a, b) => b[1] - a[1])[0]?.[0]
  const tipoTop = TIPOS[tipoTopKey] || tipoTopKey || '-'

  const emocionCount = {}
  for (const ep of recientes) {
    if (ep.emocion) emocionCount[ep.emocion] = (emocionCount[ep.emocion] || 0) + 1
  }
  const emocionTop = Object.entries(emocionCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  const corte = new Date()
  corte.setDate(corte.getDate() - 30)
  const periodoStr = `${fmtFechaCorta(corte)} – ${fmtFechaCorta(new Date())}`

  return { total, avgInt, tipoTop, emocionTop, periodoStr }
}

function calcTopGatillantes(episodios, n = 5) {
  const counts = {}
  for (const ep of episodios)
    for (const g of ep.gatillantes || [])
      counts[g] = (counts[g] || 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n)
}

function calcVistaGeneral(episodios, estrategias) {
  const ahora  = new Date()
  const hace30 = new Date(ahora); hace30.setDate(ahora.getDate() - 30)
  const hace60 = new Date(ahora); hace60.setDate(ahora.getDate() - 60)

  const actual   = episodios.filter(e => new Date(e.fecha) >= hace30)
  const anterior = episodios.filter(e => {
    const f = new Date(e.fecha)
    return f >= hace60 && f < hace30
  })

  const calcM = (eps) => {
    if (!eps.length) return null
    const total  = eps.length
    const avgInt = eps.reduce((s, e) => s + e.intensidad, 0) / total
    const tipoCount = {}
    for (const ep of eps) tipoCount[ep.tipo] = (tipoCount[ep.tipo] || 0) + 1
    const tipoTopKey = Object.entries(tipoCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null
    const tipoTop    = TIPOS[tipoTopKey] || tipoTopKey || '-'
    return { total, avgInt, tipoTop }
  }

  return {
    periodoInicio:    fmtFechaCorta(hace30),
    periodoFin:       fmtFechaCorta(ahora),
    actual:           calcM(actual),
    anterior:         calcM(anterior),
    estrategiaActiva: (estrategias || []).find(e => e.semanaActual < 4) || null,
  }
}

function pctDelta(actual, anterior) {
  if (!anterior) return null
  const p = Math.round(((actual - anterior) / anterior) * 100)
  if (Math.abs(p) < 5) return 'estable'
  return (p > 0 ? '+' : '') + p + '%'
}

// ── Markdown renderer ──────────────────────────────────────────────────────
// Convierte el markdown de la IA (negritas, listas) en elementos react-pdf.
function renderInlineBold(line) {
  const parts = line.split(/\*\*([^*]+)\*\*/g)
  if (parts.length === 1) return line
  return parts.map((part, i) =>
    i % 2 === 1
      ? <Text key={i} style={{ fontFamily: 'Helvetica-Bold' }}>{part}</Text>
      : part
  )
}

function renderOrientacion(text) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []

  lines.forEach((raw, i) => {
    const line = raw.trimEnd()

    // Línea vacía → separador mínimo
    if (!line.trim()) {
      elements.push(<Text key={i} style={{ fontSize: 3 }}> </Text>)
      return
    }

    // Encabezado: **texto** solo (toda la línea entre **)
    if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
      const content = line.trim().replace(/^\*\*|\*\*$/g, '')
      elements.push(<Text key={i} style={s.mdHeading}>{content}</Text>)
      return
    }

    // Bullet: - texto
    if (/^- /.test(line.trim())) {
      const content = line.trim().slice(2).replace(/\*\*/g, '')
      elements.push(
        <View key={i} style={s.mdListRow}>
          <Text style={s.mdBullet}>{'• '}</Text>
          <Text style={s.mdListText}>{content}</Text>
        </View>
      )
      return
    }

    // Lista numerada: 1. texto
    const numMatch = line.trim().match(/^(\d+)\.\s+(.+)$/)
    if (numMatch) {
      const content = numMatch[2].replace(/\*\*/g, '')
      elements.push(
        <View key={i} style={s.mdListRow}>
          <Text style={s.mdBullet}>{numMatch[1] + '. '}</Text>
          <Text style={s.mdListText}>{content}</Text>
        </View>
      )
      return
    }

    // Texto normal con posibles negritas inline
    elements.push(
      <Text key={i} style={s.mdText}>{renderInlineBold(line.trim())}</Text>
    )
  })

  return elements
}

// ── Sections ───────────────────────────────────────────────────────────────
function HeaderSection({ hijo, generadoEl }) {
  const nombreHijo = hijo?.nombre || 'Sin nombre'
  const edadStr = hijo?.edad != null ? `, ${hijo.edad} anos` : ''
  return (
    <View style={s.header}>
      <View style={s.headerTop}>
        <Text style={s.brandName}>Huella</Text>
        <Text style={s.reportDate}>Generado el {generadoEl}</Text>
      </View>
      <Text style={s.headerSub}>Historial clinico familiar · Registro de desarrollo emocional</Text>
      <Text style={s.hijoName}>{nombreHijo}{edadStr}</Text>
      <Text style={s.disclaimer}>
        Este documento es un registro de apoyo y no constituye un diagnostico clinico.
        Elaborado para facilitar la comunicacion con profesionales de la salud.
      </Text>
    </View>
  )
}

function VistaGeneralSection({ hijo, episodios, estrategias }) {
  const v = calcVistaGeneral(episodios, estrategias)
  const nombreHijo = hijo?.nombre || 'Sin nombre'
  const edadStr    = hijo?.edad != null ? `, ${hijo.edad} anos` : ''

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Vista general</Text>
      <View style={s.vistaBox}>
        <Text style={s.vistaContext}>
          {nombreHijo}{edadStr}. Periodo: {v.periodoInicio} - {v.periodoFin}.
        </Text>

        {v.actual && v.anterior ? (
          <View style={s.vistaMetricGrid}>
            <View style={s.vistaMetricBox}>
              <Text style={s.vistaMetricLabel}>Episodios</Text>
              <Text style={s.vistaMetricVal}>{v.actual.total}</Text>
              <Text style={s.vistaMetricDelta}>
                {pctDelta(v.actual.total, v.anterior.total) ?? 'sin ref.'} vs mes anterior
              </Text>
            </View>
            <View style={s.vistaMetricBox}>
              <Text style={s.vistaMetricLabel}>Intensidad prom.</Text>
              <Text style={s.vistaMetricVal}>{v.actual.avgInt.toFixed(1)}/5</Text>
              <Text style={s.vistaMetricDelta}>
                {pctDelta(v.actual.avgInt, v.anterior.avgInt) ?? 'sin ref.'} vs mes anterior
              </Text>
            </View>
            <View style={s.vistaMetricBox}>
              <Text style={s.vistaMetricLabel}>Tipo frecuente</Text>
              <Text style={[s.vistaMetricVal, { fontSize: 9 }]}>{v.actual.tipoTop}</Text>
            </View>
          </View>
        ) : (
          <Text style={s.vistaFallback}>Sin periodo previo para comparar todavia.</Text>
        )}

        {v.estrategiaActiva && (
          <Text style={s.vistaEstrategia}>
            Estrategia activa: {v.estrategiaActiva.habilidad} · Semana {v.estrategiaActiva.semanaActual}/4
          </Text>
        )}
      </View>
    </View>
  )
}

function ResumenEjecutivoSection({ texto }) {
  if (!texto) return null
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Resumen ejecutivo</Text>
      <View style={s.resumenEjecutivoBox}>
        {renderOrientacion(texto)}
      </View>
    </View>
  )
}

function ResumenSection({ episodios }) {
  const r = calcResumen30(episodios)
  if (!r) return null

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Resumen de los ultimos 30 dias</Text>
      <Text style={s.resumenPeriodo}>Periodo: {r.periodoStr}</Text>
      <View style={s.resumenGrid}>
        <View style={s.resumenBox}>
          <Text style={s.resumenNum}>{r.total}</Text>
          <Text style={s.resumenLabel}>Episodios registrados</Text>
        </View>
        <View style={s.resumenBox}>
          <Text style={s.resumenNum}>{r.avgInt}</Text>
          <Text style={s.resumenLabel}>Intensidad promedio</Text>
        </View>
      </View>
      <View style={s.resumenFila}>
        <View style={s.resumenItem}>
          <Text style={s.resumenItemLabel}>Tipo mas frecuente</Text>
          <Text style={s.resumenItemVal}>{r.tipoTop}</Text>
        </View>
        {r.emocionTop && (
          <View style={s.resumenItem}>
            <Text style={s.resumenItemLabel}>Emocion mas frecuente</Text>
            <Text style={s.resumenItemVal}>{r.emocionTop}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

function ReflexionesCuidadorSection({ reflexionesCuidador, episodios }) {
  const conReflexion = [...episodios]
    .filter(e => e.reflexion)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 3)

  if (conReflexion.length < 3) return null

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Reflexiones del cuidador</Text>
      {reflexionesCuidador && (
        <View style={s.reflexionesBox}>
          {renderOrientacion(reflexionesCuidador)}
        </View>
      )}
      {conReflexion.map((ep, i) => (
        <View key={ep.id || i} style={s.reflexionRow}>
          <Text style={s.reflexionMeta}>
            {fmtFechaCorta(ep.fecha)} · {TIPOS[ep.tipo] || ep.tipo}
          </Text>
          <Text style={s.reflexionTexto}>"{ep.reflexion}"</Text>
        </View>
      ))}
    </View>
  )
}

function GatillantesSection({ episodios }) {
  const top = calcTopGatillantes(episodios)
  if (!top.length) return null
  const max = top[0][1]
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Gatillantes mas frecuentes</Text>
      {top.map(([label, count]) => (
        <View key={label} style={s.triggerRow}>
          <Text style={s.triggerLabel}>{label}</Text>
          <View style={s.triggerTrack}>
            <View style={[s.triggerBar, { width: `${(count / max) * 100}%` }]} />
          </View>
          <Text style={s.triggerCount}>{count}</Text>
        </View>
      ))}
    </View>
  )
}

function EpisodiosSection({ episodios }) {
  const ordenados = [...episodios].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Historial completo de episodios</Text>
      {ordenados.map((ep) => (
        <View key={ep.id} style={s.epCard} wrap={false}>
          <View style={s.epHeader}>
            <View style={s.epHeaderLeft}>
              <Text style={s.epTipo}>{TIPOS[ep.tipo] || ep.tipo}</Text>
              <Text style={s.epFecha}>{fmtFecha(ep.fecha)} · {fmtHora(ep.fecha)}</Text>
            </View>
            <Text
              style={[
                s.epIntBadge,
                { backgroundColor: INTENSIDAD_COLOR[ep.intensidad] || C.border },
              ]}
            >
              {INTENSIDAD_LABEL[ep.intensidad] || ep.intensidad}
            </Text>
          </View>

          {ep.emocion ? (
            <Text style={s.epEmocion}>Emocion: {ep.emocion}</Text>
          ) : null}

          {ep.contexto ? (
            <Text style={s.epContexto}>"{ep.contexto}"</Text>
          ) : null}

          {ep.gatillantes?.length > 0 ? (
            <View style={s.epGatillantes}>
              {ep.gatillantes.map((g) => (
                <Text key={g} style={s.epGatillante}>{g}</Text>
              ))}
            </View>
          ) : null}

          {ep.orientacionIA ? (
            <>
              <Text style={s.epOrientacionLabel}>Orientacion Huella</Text>
              <View style={s.epOrientacion}>
                {renderOrientacion(ep.orientacionIA)}
              </View>
            </>
          ) : null}

          {ep.reflexion ? (
            <>
              <Text style={s.epReflexionLabel}>Reflexion del padre/madre</Text>
              <Text style={s.epReflexion}>{ep.reflexion}</Text>
            </>
          ) : null}
        </View>
      ))}
    </View>
  )
}

function EstrategiasSection({ estrategias }) {
  if (!estrategias.length) return null
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Estrategias aplicadas</Text>
      {estrategias.map((e) => (
        <View key={e.id} style={s.estrategiaCard} wrap={false}>
          <View style={s.estrategiaHeader}>
            <Text style={s.estrategiaNombre}>{e.habilidad}</Text>
            <Text style={s.estrategiaSemana}>
              {e.semanaActual >= 4 ? 'Completada' : `Semana ${e.semanaActual}/4`}
            </Text>
          </View>
          {e.descripcion ? (
            <Text style={[s.epFecha, { marginBottom: 4 }]}>{e.descripcion}</Text>
          ) : null}
          <View style={s.progressTrack}>
            <View
              style={[s.progressFill, { width: `${(Math.min(e.semanaActual, 4) / 4) * 100}%` }]}
            />
          </View>
          <Text style={[s.epFecha, { marginTop: 3 }]}>
            Iniciada el {fmtFechaCorta(e.fechaInicio)}
          </Text>
        </View>
      ))}
    </View>
  )
}

function HitosSection({ hitos }) {
  if (!hitos.length) return null
  const ordenados = [...hitos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Hitos registrados</Text>
      {ordenados.map((h) => (
        <View key={h.id} style={s.hitoRow} wrap={false}>
          <View style={s.hitoDot} />
          <View>
            <Text style={s.hitoFecha}>{fmtFechaCorta(h.fecha)}</Text>
            <Text style={s.hitoDesc}>{h.descripcion}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Huella · Registro de desarrollo emocional</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
        `Pagina ${pageNumber} de ${totalPages}`
      } />
    </View>
  )
}

// ── Document ───────────────────────────────────────────────────────────────
export default function InformePDF({ hijo, episodios, estrategias, hitos, resumenEjecutivo, reflexionesCuidador }) {
  const generadoEl = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <Document
      title={`Huella - Informe ${hijo?.nombre || 'familiar'}`}
      author="Huella"
      subject="Historial clinico de desarrollo emocional"
    >
      <Page size="A4" style={s.page}>
        <HeaderSection hijo={hijo} generadoEl={generadoEl} />
        <VistaGeneralSection hijo={hijo} episodios={episodios} estrategias={estrategias} />
        <ResumenEjecutivoSection texto={resumenEjecutivo} />
        <ResumenSection episodios={episodios} />
        <ReflexionesCuidadorSection reflexionesCuidador={reflexionesCuidador} episodios={episodios} />
        <GatillantesSection episodios={episodios} />
        <EstrategiasSection estrategias={estrategias} />
        <HitosSection hitos={hitos} />
        <EpisodiosSection episodios={episodios} />
        <Footer />
      </Page>
    </Document>
  )
}
