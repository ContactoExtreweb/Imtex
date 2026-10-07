// Regla 9: las fotos se comprimen en el navegador antes de subirlas; HEIC → JPEG.
// Todo con el canvas del navegador. El conversor de HEIC solo se descarga si hace falta.

export const LADO_FOTO = 2000
export const LADO_MINIATURA = 480
const CALIDAD = 0.8

/** Dimensiones para que el lado largo no pase de `maximo`, sin ampliar ni deformar. */
export function encajar(ancho: number, alto: number, maximo: number) {
  const escala = Math.min(1, maximo / Math.max(ancho, alto))
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) }
}

/** Ruta de la miniatura de una foto del bucket: «a/b.jpg» → «a/b_m.jpg» */
export const rutaMiniatura = (ruta: string) => ruta.replace(/\.jpg$/, '_m.jpg')

const esHeic = (archivo: File) => /^image\/hei[cf]/.test(archivo.type) || /\.hei[cf]$/i.test(archivo.name)

async function decodificar(archivo: File): Promise<ImageBitmap> {
  try {
    // Gira la imagen según su orientación EXIF (las fotos del móvil en vertical)
    return await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    if (!esHeic(archivo)) throw new Error(`«${archivo.name}» no es una imagen que se pueda leer.`)
    // Safari lee HEIC; Chrome y Firefox no: se descarga el conversor solo en ese caso
    const { heicTo } = await import('heic-to')
    return heicTo({ blob: archivo, type: 'bitmap' })
  }
}

export interface Jpeg {
  blob: Blob
  ancho: number
  alto: number
}

function aJpeg(imagen: ImageBitmap, maximo: number): Promise<Jpeg> {
  const { ancho, alto } = encajar(imagen.width, imagen.height, maximo)
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')!
  // Fondo blanco: un PNG con transparencia saldría con el fondo negro al pasar a JPEG
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, ancho, alto)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(imagen, 0, 0, ancho, alto)
  return new Promise((resolve, reject) =>
    lienzo.toBlob(
      (blob) => (blob ? resolve({ blob, ancho, alto }) : reject(new Error('No se ha podido comprimir la imagen.'))),
      'image/jpeg',
      CALIDAD,
    ),
  )
}

/** Foto lista para subir: JPEG con el lado largo a 2.000 px como mucho, y su miniatura de 480 px. */
export async function comprimir(archivo: File): Promise<{ foto: Jpeg; miniatura: Jpeg }> {
  const imagen = await decodificar(archivo)
  try {
    return { foto: await aJpeg(imagen, LADO_FOTO), miniatura: await aJpeg(imagen, LADO_MINIATURA) }
  } finally {
    imagen.close()
  }
}
