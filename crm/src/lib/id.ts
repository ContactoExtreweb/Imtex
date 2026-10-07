/**
 * Identificador aleatorio de 32 caracteres hexadecimales.
 * No se usa crypto.randomUUID porque solo existe en HTTPS o en localhost, y el programa
 * se prueba también desde el móvil entrando por la IP de la red (http://192.168.x.x).
 */
export const idAleatorio = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
