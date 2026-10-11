import { Link } from 'react-router-dom'
import styles from './LineaRetracto.module.css'

// Línea legal junto al precio, antes del botón de pagar (/cuenta y aviso Pro,
// web y Android). `className` es la clase de la frase del cobro de cada
// pantalla: mismo tamaño y color que esa frase.
export default function LineaRetracto({ className }) {
  return (
    <p className={className}>
      El servicio comienza al suscribirte, por lo que no aplica el derecho a retracto. Puedes cancelar cuando quieras.{' '}
      <Link to="/terminos#suscripcion" className={styles.enlace}>Ver términos</Link>
    </p>
  )
}
