// Funciones en prueba: solo las ven estas dos cuentas, por id de usuario (igual
// que DUENO_PERSONAJE). Al abrir una a todos, se saca su llamada a enPrueba.
const CUENTAS_EN_PRUEBA = [
  '04ddd97a-e674-4e59-8f37-78cb38d46090', // Daniel
  '08af56df-42e7-43f8-ab35-2e64618855e4', // cuenta de prueba (+reset0923)
]

export function enPrueba(userId) {
  return CUENTAS_EN_PRUEBA.includes(userId)
}
