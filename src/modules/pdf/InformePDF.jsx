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
  primary:      '#e8936a',
  primaryLight: '#f5c4a8',
  primaryDark:  '#c96f45',
  text:         '#1a1a1a',
  muted:        '#6b7280',
  border:       '#e5e7eb',
  surface:      '#f9f7f4',
  white:        '#ffffff',
  green:        '#6dbf88',
  yellow:       '#f0dfa0',
  red:          '#e87878',
}

const INTENSIDAD_LABEL = ['', 'Muy leve', 'Leve', 'Moderado', 'Intenso', 'Muy intenso']
const INTENSIDAD_COLOR = ['', '#a8d5b5', '#c4e0a8', C.yellow, C.primaryLight, C.red]

const TIPOS = {
  rabieta:     'Rabieta',
  llanto:      'Llanto',
  agresividad: 'Agresividad',
  miedo:       'Miedo',
  sueño:       'Dificultad para dormir',
  social:      'Rechazo social',
  desconexion: 'Desconexión',
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

  // ── Stats grid ──
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
  },
  statLabel: {
    fontSize: 8,
    color: C.muted,
    textAlign: 'center',
    marginTop: 2,
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
    alignItems: 'center',
    marginBottom: 4,
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
    fontSize: 8.5,
    color: C.text,
    lineHeight: 1.5,
    backgroundColor: C.white,
    padding: 7,
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: C.primaryLight,
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

function calcStats(episodios) {
  if (!episodios.length) return { total: 0, avgInt: '-', tipoTop: '-', dateRange: '-' }
  const total = episodios.length
  const avgInt = (episodios.reduce((s, e) => s + e.intensidad, 0) / total).toFixed(1)
  const tipoCount = {}
  for (const ep of episodios) tipoCount[ep.tipo] = (tipoCount[ep.tipo] || 0) + 1
  const tipoTop = TIPOS[Object.entries(tipoCount).sort((a, b) => b[1] - a[1])[0]?.[0]] || '-'
  const fechas = episodios.map((e) => new Date(e.fecha)).sort((a, b) => a - b)
  const dateRange = `${fmtFechaCorta(fechas[0])} – ${fmtFechaCorta(fechas[fechas.length - 1])}`
  return { total, avgInt, tipoTop, dateRange }
}

function calcTopGatillantes(episodios, n = 5) {
  const counts = {}
  for (const ep of episodios)
    for (const g of ep.gatillantes || [])
      counts[g] = (counts[g] || 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n)
}

// ── Sections ───────────────────────────────────────────────────────────────
function HeaderSection({ hijo, generadoEl }) {
  const nombreHijo = hijo?.nombre || 'Sin nombre'
  const edadStr = hijo?.edad != null ? `, ${hijo.edad} años` : ''
  return (
    <View style={s.header}>
      <View style={s.headerTop}>
        <Text style={s.brandName}>Huella</Text>
        <Text style={s.reportDate}>Generado el {generadoEl}</Text>
      </View>
      <Text style={s.headerSub}>Historial clínico familiar · Registro de desarrollo emocional</Text>
      <Text style={s.hijoName}>{nombreHijo}{edadStr}</Text>
    </View>
  )
}

function StatsSection({ episodios }) {
  const { total, avgInt, tipoTop, dateRange } = calcStats(episodios)
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Resumen</Text>
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={s.statNum}>{total}</Text>
          <Text style={s.statLabel}>Episodios registrados</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statNum}>{avgInt}</Text>
          <Text style={s.statLabel}>Intensidad promedio</Text>
        </View>
        <View style={s.statBox}>
          <Text style={[s.statNum, { fontSize: 13 }]}>{tipoTop}</Text>
          <Text style={s.statLabel}>Tipo más frecuente</Text>
        </View>
      </View>
      {total > 0 && (
        <Text style={[s.epFecha, { marginTop: 8 }]}>Período: {dateRange}</Text>
      )}
    </View>
  )
}

function GatillantesSection({ episodios }) {
  const top = calcTopGatillantes(episodios)
  if (!top.length) return null
  const max = top[0][1]
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Gatillantes más frecuentes</Text>
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
  const ordenados = [...episodios].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Historial de episodios</Text>
      {ordenados.map((ep) => (
        <View key={ep.id} style={s.epCard} wrap={false}>
          <View style={s.epHeader}>
            <View>
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
              <Text style={s.epOrientacionLabel}>Orientación Huella</Text>
              <Text style={s.epOrientacion}>{ep.orientacionIA}</Text>
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
  const ordenados = [...hitos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
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
        `Página ${pageNumber} de ${totalPages}`
      } />
    </View>
  )
}

// ── Document ───────────────────────────────────────────────────────────────
export default function InformePDF({ hijo, episodios, estrategias, hitos }) {
  const generadoEl = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <Document
      title={`Huella - Informe ${hijo?.nombre || 'familiar'}`}
      author="Huella"
      subject="Historial clínico de desarrollo emocional"
    >
      <Page size="A4" style={s.page}>
        <HeaderSection hijo={hijo} generadoEl={generadoEl} />
        <StatsSection episodios={episodios} />
        <GatillantesSection episodios={episodios} />
        <EstrategiasSection estrategias={estrategias} />
        <HitosSection hitos={hitos} />
        <EpisodiosSection episodios={episodios} />
        <Footer />
      </Page>
    </Document>
  )
}
