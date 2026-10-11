import { Link } from 'react-router-dom'
import styles from './LineaRetracto.module.css'

// Línea legal junto al precio, antes del botón de pagar (/cuenta y aviso Pro,
// web y Android). `className` es la clase de la frase del cobro de cada
// pantalla: mismo tamaño y color que esa frase. "no aplica el derecho a
// retracto" va destacado (negrita y color del texto principal).
export default function LineaRetracto({ className }) {
  return (
    <p className={className}>
      El servicio comienza al suscribirte, por lo que <strong className={styles.destacado}>no aplica el derecho a retracto</strong>. Puedes cancelar cuando quieras.{' '}
      <Link to="/terminos#suscripcion" className={styles.enlace}>Ver términos</Link>
    </p>
  )
}
