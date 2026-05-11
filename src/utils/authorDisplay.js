/**
 * Devuelve el nombre del autor de un entry para mostrarlo en la UI.
 * Solo devuelve texto si hay 2+ adultos en la familia (para no mostrar nada
 * cuando el usuario está solo).
 */
export function getAuthorDisplay(userId, profilesByUserId) {
  if (!profilesByUserId || Object.keys(profilesByUserId).length < 2) return ''
  return profilesByUserId[userId]?.nombre?.trim() || ''
}

/**
 * Indica si el usuario actual puede modificar o eliminar un entry.
 * Retorna true cuando no hay userId conocido (usuario solo, sin familia).
 */
export function canModify(entryUserId, currentUserId) {
  if (!entryUserId || !currentUserId) return true
  return entryUserId === currentUserId
}
