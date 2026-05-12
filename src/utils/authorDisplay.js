/**
 * Devuelve el nombre del autor de un entry para mostrarlo en la UI.
 * Reglas:
 *  - Si hay menos de 2 adultos en la familia → '' (usuario solo).
 *  - Si el autor es el usuario actual → '' (no decimos "Pareja" sobre uno mismo).
 *  - Si el autor es otro adulto conocido en la familia y tiene nombre → su nombre.
 *  - Si el autor es otro adulto conocido pero sin nombre seteado → 'Pareja'.
 *  - Si el autor no está en el mapa (ex-partner desconectado) → ''.
 */
export function getAuthorDisplay(userId, profilesByUserId, currentUserId) {
  if (!profilesByUserId || Object.keys(profilesByUserId).length < 2) return ''
  if (!userId) return ''
  if (userId === currentUserId) {
    return profilesByUserId[userId]?.nombre?.trim() || ''
  }
  if (!(userId in profilesByUserId)) return ''
  const nombre = profilesByUserId[userId]?.nombre?.trim()
  return nombre || 'Pareja'
}

/**
 * Indica si el usuario actual puede modificar o eliminar un entry.
 * Retorna true cuando no hay userId conocido (usuario solo, sin familia).
 */
export function canModify(entryUserId, currentUserId) {
  if (!entryUserId || !currentUserId) return true
  return entryUserId === currentUserId
}
