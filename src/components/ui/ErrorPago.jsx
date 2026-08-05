import React from 'react'
import Button from './Button'
import styles from './ErrorPago.module.css'

const CONTACTO = 'contacto@huella.lat'

// Bloque de error del flujo de pago, compartido por CuentaPage y UpgradeModal.
// Antes el mensaje vivía duplicado literal en los dos archivos y no ofrecía
// ninguna salida: el usuario quedaba mirando una línea roja.
//
// Ahora muestra la `referencia` (HP-XXXXXX) que devuelve el endpoint, para que
// el cuidador pueda dictárnosla y cruzarla contra su fila exacta en
// `pagos_intentos`, y ofrece reintentar sin salir de la pantalla.
//
// `referencia` es opcional a propósito: si el registro no alcanzó a escribir
// (Supabase lento o caído), llega null y el bloque simplemente no muestra esa
// parte. Nunca se renderiza un hueco ni la palabra "null".
export default function ErrorPago({ referencia, onReintentar, cargando = false }) {
  return (
    <div className={styles.bloque} role="alert">
      <p className={styles.titulo}>No pudimos abrir el pago</p>
      <p className={styles.texto}>
        Puede ser algo pasajero. Intenta de nuevo en un momento.
      </p>

      {referencia ? (
        <>
          <p className={styles.texto}>
            Si vuelve a pasar, escríbenos a{' '}
            <a className={styles.mail} href={`mailto:${CONTACTO}`}>{CONTACTO}</a>{' '}
            con este código y lo revisamos:
          </p>
          <p className={styles.codigo}>{referencia}</p>
        </>
      ) : null}

      <Button variant="secondary" fullWidth onClick={onReintentar} loading={cargando}>
        Intentar de nuevo
      </Button>
    </div>
  )
}
