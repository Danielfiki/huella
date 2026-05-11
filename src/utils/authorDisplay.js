/**
 * Devuelve el nombre del autor de un entry para mostrarlo en la UI.
 * Solo devuelve texto si hay 2+ adultos en la familia (para no mostrar nada
 * cuando el usuario está solo).
 */
export function getAuthorDisplay(userId, profilesByUserId) {
  if (!profilesByUserId || Object.keys(profilesByUserId).length < 2) return ''
  return profilesByUserId[userId]?.nombre?.trim() || ''
}
