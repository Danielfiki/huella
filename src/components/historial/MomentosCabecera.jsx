import React from 'react'
import { ArrowLeft, Search, FileText, Lock } from 'lucide-react'
import styles from './MomentosCabecera.module.css'

// Cabecera sobria de Momentos (rediseño): una fila con volver, el título,
// buscar y el informe PDF. Sin panel ni estadísticas. El PDF va en neutro:
// el naranjo queda para Registrar.
export default function MomentosCabecera({ onBack, onSearch, onExportPDF, hasNewExport = false, exportBloqueado = false }) {
  return (
    <header className={styles.fila}>
      <button className={styles.boton} onClick={onBack} aria-label="Volver">
        <ArrowLeft size={20} />
      </button>
      <h1 className={styles.titulo}>Momentos</h1>
      {onSearch && (
        <button className={styles.boton} onClick={onSearch} aria-label="Buscar">
          <Search size={20} />
        </button>
      )}
      {onExportPDF && (
        <button className={styles.boton} onClick={onExportPDF} aria-label="Exportar informe PDF">
          <FileText size={20} />
          {exportBloqueado
            ? <span className={styles.candado}><Lock size={9} /></span>
            : hasNewExport && <span className={styles.punto} />}
        </button>
      )}
    </header>
  )
}
