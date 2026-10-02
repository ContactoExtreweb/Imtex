import { expect, test } from 'vitest'
import { ACEPTA, clasificar } from './bajas'

const PDF = { foto: false, ext: 'pdf', mime: 'application/pdf' }

test('clasificar: las fotos se convierten y los documentos admitidos se suben tal cual', () => {
  // Fotos, también las del iPhone (HEIC), que a veces llegan sin tipo
  expect(clasificar('parte.jpg', 'image/jpeg')).toEqual({ foto: true })
  expect(clasificar('IMG_0042.HEIC', '')).toEqual({ foto: true })
  expect(clasificar('captura.png', 'image/png')).toEqual({ foto: true })

  // Documentos: manda la extensión, con mayúsculas o sin tipo
  expect(clasificar('Parte de baja.PDF', '')).toEqual(PDF)
  expect(clasificar('baja.docx', 'application/octet-stream')).toEqual({
    foto: false,
    ext: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  expect(clasificar('baja.doc', '')?.foto).toBe(false)
  expect(clasificar('baja.odt', '')?.foto).toBe(false)
  expect(clasificar('nota.txt', 'text/plain')?.foto).toBe(false)

  // Sin extensión, lo que diga el navegador
  expect(clasificar('escaneo', 'application/pdf')).toEqual(PDF)
})

test('clasificar rechaza lo que no admite el bucket', () => {
  expect(clasificar('nominas.xlsx', 'application/vnd.ms-excel')).toBeNull()
  expect(clasificar('virus.exe', 'application/octet-stream')).toBeNull()
  expect(clasificar('video.mp4', 'video/mp4')).toBeNull()
  expect(clasificar('sin-extension', '')).toBeNull()
  expect(clasificar('archivo.constructor', '')).toBeNull() // no confundir con propiedades de Object
})

test('el selector de archivos ofrece fotos y los documentos admitidos', () => {
  expect(ACEPTA).toBe('image/*,.heic,.heif,.pdf,.doc,.docx,.odt,.txt')
})
