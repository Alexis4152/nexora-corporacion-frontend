/** Espejo de ProspectStage.canMoveTo (el backend vuelve a validar). */
const BEFORE_QUALIFIED = ['NEW', 'CONTACTED']
export function canMove(from, to) {
  if (from === to || from === 'WON') return false
  if (from === 'LOST' || from === 'DISCARDED') return to === 'NEW' || to === 'CONTACTED'
  if (to === 'WON') return !BEFORE_QUALIFIED.includes(from)
  return true
}

