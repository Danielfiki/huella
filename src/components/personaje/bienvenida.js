import { diaChile } from '../../utils/fechaChile'

// El personaje todavia es privado: solo lo ve la cuenta de Daniel. La vitrina
// (/personaje) y la bienvenida del Home filtran con este id.
export const DUENO_PERSONAJE = '04ddd97a-e674-4e59-8f37-78cb38d46090'

// Marca del dia de la bienvenida, por usuario: guarda el dia de Chile en que
// ya se mostro. localStorage puede fallar (modo privado, bloqueado): si falla,
// la bienvenida se trata como ya vista para no repetirla en cada apertura.
const clave = (userId) => `huella_bienvenida_escarabajo_${userId}`

export function tocaBienvenida(userId) {
  try {
    return localStorage.getItem(clave(userId)) !== diaChile(new Date())
  } catch {
    return false
  }
}

// TEMPORAL (diagnostico): la marca guardada tal cual, o el error al leerla.
export function leerMarca(userId) {
  try { return localStorage.getItem(clave(userId)) } catch (e) { return `error al leer: ${e.name}` }
}

export function marcarBienvenida(userId) {
  try { localStorage.setItem(clave(userId), diaChile(new Date())) } catch { /* sin marca */ }
}

export function borrarMarcaBienvenida(userId) {
  try { localStorage.removeItem(clave(userId)) } catch { /* sin marca */ }
}
