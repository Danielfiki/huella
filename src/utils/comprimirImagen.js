// Compresion de imagenes antes de subirlas al bucket.
//
// La misma funcion vivia copiada en NuevoPage (1200px), PerfilPage (400px) y
// HitosPage (1200px). Al desaparecer HitosPage en B3, la tarjeta de Momentos
// necesitaba la suya, y en vez de hacer una cuarta copia se extrajo aca.
//
// NuevoPage y PerfilPage siguen con su copia local a proposito: migrarlas
// tocaria el registro, que en B3 estaba fuera de alcance. Cuando se toquen por
// otra razon, que importen esta.
export default async function comprimirImagen(file, maxSize = 1200) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}
