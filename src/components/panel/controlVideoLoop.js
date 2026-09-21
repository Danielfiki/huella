// Cuándo un video mudo en loop tiene que estar corriendo. Sin DOM ni React a
// propósito: recibe el <video> (o cualquier objeto con play/pause/paused) y
// los eventos que le pasan, así se puede probar sin navegador.
//
// Nació por un bug de la puerta "Su cerebro": al abrir la app el video se
// quedaba en el poster, y al volver al Home desde otra pantalla giraba. La
// versión anterior llamaba play() UNA vez por cambio de visibilidad y se
// tragaba el rechazo. Si ese play() fallaba —porque todavía no había datos y
// algo lo interrumpía, o porque el navegador no deja reproducir sin que el
// usuario haya tocado la pantalla— nadie volvía a intentarlo. Al volver al
// Home sí andaba porque el video ya estaba en caché y porque el usuario ya
// había tocado la pantalla.
//
// Ahora se reintenta en los tres momentos en que un play() fallido puede
// empezar a funcionar:
//   · cuando la card entra en pantalla
//   · cuando el video tiene datos (loadeddata / canplay)
//   · con el primer toque del usuario en cualquier parte de la página, que es
//     lo que destraba la política de reproducción automática
// Fuera de pantalla se pausa, y con movimiento reducido no corre nunca.
export function crearControlVideo(video, { reducido = false } = {}) {
  let visible = false
  let destruido = false

  function intentar() {
    if (destruido || reducido || !visible) return
    // play() ya en curso o video corriendo: no hay nada que hacer.
    if (!video.paused) return
    video.muted = true
    const promesa = video.play()
    // Un rechazo no se reporta: el próximo evento de la lista lo reintenta.
    if (promesa && typeof promesa.catch === 'function') promesa.catch(() => {})
  }

  return {
    alCambiarVisibilidad(estaVisible) {
      visible = estaVisible
      if (estaVisible) intentar()
      else if (!video.paused) video.pause()
    },
    alTenerDatos: intentar,
    alGesto: intentar,
    destruir() {
      destruido = true
      video.pause()
    },
  }
}
