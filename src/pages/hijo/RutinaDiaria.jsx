import React, { useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { useAuth } from '../../context/AuthContext'
import { canModify } from '../../utils/authorDisplay'
import Button from '../../components/ui/Button'
import styles from './RutinaDiaria.module.css'

export default function RutinaDiaria() {
  const { state, addRutina, updateRutina, deleteRutina } = useHuella()
  const { user } = useAuth()
  const { rutinas, hijo } = state

  const [modal, setModal]           = useState(null) // null | { modo, id?, hora, nombre, nota, esMomentoRiesgo }
  const [guardando, setGuardando]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const sorted = [...rutinas].sort((a, b) => a.hora.localeCompare(b.hora))

  function abrirNuevo() {
    setModal({ modo: 'nuevo', hora: '08:00', nombre: '', nota: '', esMomentoRiesgo: false })
  }

  function abrirEditar(r) {
    setModal({ modo: 'editar', id: r.id, hora: r.hora, nombre: r.nombre, nota: r.nota || '', esMomentoRiesgo: r.esMomentoRiesgo })
  }

  function cerrar() { setModal(null) }

  async function handleGuardar(e) {
    e.preventDefault()
    if (!modal.nombre.trim() || !modal.hora) return
    setGuardando(true)
    try {
      if (modal.modo === 'nuevo') {
        await addRutina({
          id: `tmp_${Date.now()}`,
          hora: modal.hora,
          nombre: modal.nombre.trim(),
          nota: modal.nota.trim() || null,
          esMomentoRiesgo: modal.esMomentoRiesgo,
        })
      } else {
        await updateRutina({
          id: modal.id,
          hora: modal.hora,
          nombre: modal.nombre.trim(),
          nota: modal.nota.trim() || null,
          esMomentoRiesgo: modal.esMomentoRiesgo,
        })
      }
      setModal(null)
    } catch (err) {
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteRutina(id)
    } catch (err) {
      console.error(err)
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div className={styles.wrap}>

      {sorted.length === 0 ? (
        <div className={styles.vacio}>
          <span className={styles.vacioEmoji}>🕐</span>
          <p className={styles.vacioMsg}>Sin bloques de rutina</p>
          <p className={styles.vacioSub}>
            Agrega momentos del día de {hijo?.nombre || 'tu hijo/a'} para detectar en qué contexto ocurren los episodios
          </p>
        </div>
      ) : (
        <div className={styles.lista}>
          {sorted.map((b) => (
            <div key={b.id} className={`${styles.bloque} ${b.esMomentoRiesgo ? styles.bloqueRiesgo : ''}`}>
              <div className={styles.bloqueHora}>{b.hora}</div>
              <div className={styles.bloqueContenido}>
                <div className={styles.bloqueTop}>
                  <span className={styles.bloqueNombre}>{b.nombre}</span>
                  {b.esMomentoRiesgo && (
                    <span className={styles.riesgoBadge}>⚠ Riesgo</span>
                  )}
                </div>
                {b.nota && <p className={styles.bloqueNota}>{b.nota}</p>}
              </div>
              {canModify(b.userId, user?.id) && (
                <div className={styles.bloqueAcciones}>
                  <button className={styles.accionBtn} onClick={() => abrirEditar(b)} aria-label="Editar">
                    <Pencil size={14} />
                  </button>
                  <button
                    className={`${styles.accionBtn} ${styles.accionBtnDanger}`}
                    onClick={() => setConfirmDelete(b.id)}
                    aria-label="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button className={styles.agregarBtn} onClick={abrirNuevo}>
        <Plus size={17} />
        Agregar bloque
      </button>

      {/* ── Modal nuevo/editar ── */}
      {modal && (
        <div className={styles.overlay} onClick={cerrar}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitulo}>
                {modal.modo === 'nuevo' ? 'Nuevo bloque' : 'Editar bloque'}
              </h3>
              <button className={styles.modalClose} onClick={cerrar} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardar} className={styles.modalForm}>
              <div className={styles.campo}>
                <label className={styles.campoLabel}>Hora</label>
                <input
                  type="time"
                  className={styles.input}
                  value={modal.hora}
                  onChange={(e) => setModal((m) => ({ ...m, hora: e.target.value }))}
                  required
                />
              </div>

              <div className={styles.campo}>
                <label className={styles.campoLabel}>
                  Nombre del bloque <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.input}
                  value={modal.nombre}
                  onChange={(e) => setModal((m) => ({ ...m, nombre: e.target.value }))}
                  placeholder="ej: Llegada del colegio, Hora de dormir"
                  autoFocus
                  required
                />
              </div>

              <div className={styles.campo}>
                <label className={styles.campoLabel}>
                  Nota <span className={styles.campoOpcional}>(opcional)</span>
                </label>
                <textarea
                  className={styles.textarea}
                  value={modal.nota}
                  onChange={(e) => setModal((m) => ({ ...m, nota: e.target.value }))}
                  placeholder="ej: Suele estar cansado, momento de tensión frecuente"
                  rows={2}
                />
              </div>

              <div className={styles.campo}>
                <label className={styles.campoLabel}>¿Es momento de riesgo?</label>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${modal.esMomentoRiesgo ? styles.toggleBtnRiesgo : ''}`}
                  onClick={() => setModal((m) => ({ ...m, esMomentoRiesgo: !m.esMomentoRiesgo }))}
                >
                  {modal.esMomentoRiesgo ? '⚠ Sí, momento de riesgo' : 'No, momento de calma'}
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={guardando}
                disabled={!modal.nombre.trim() || !modal.hora}
              >
                {modal.modo === 'nuevo' ? 'Agregar bloque' : 'Guardar cambios'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmar eliminación ── */}
      {confirmDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
            <p className={styles.confirmMsg}>¿Eliminar este bloque?</p>
            <div className={styles.confirmBtns}>
              <button className={styles.confirmCancel} onClick={() => setConfirmDelete(null)}>
                Cancelar
              </button>
              <button className={styles.confirmDelete} onClick={() => handleDelete(confirmDelete)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
