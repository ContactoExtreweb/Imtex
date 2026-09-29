import { z } from 'zod'
import { leerNumero } from './formato'

// Piezas de Zod para formularios: los campos llegan como texto y se guardan con el tipo de la BD.

export const obligatorio = z.string().trim().min(1, 'Obligatorio')

/** Texto o fecha opcional: vacío → null */
export const opcional = z
  .string()
  .trim()
  .transform((s) => s || null)

/** Número en formato español (ver leerNumero). */
export const numero = z.string().transform((s, ctx) => {
  const n = leerNumero(s)
  if (n === null || n < 0) {
    ctx.addIssue({ code: 'custom', message: 'Escribe un número (por ejemplo, 18,50)' })
    return z.NEVER
  }
  return n
})

export const email = z.string().trim().toLowerCase().pipe(z.email('Email no válido'))

/** Email opcional: vacío → null; si hay algo, tiene que ser un email. */
export const emailOpcional = z
  .string()
  .trim()
  .toLowerCase()
  .refine((s) => s === '' || z.email().safeParse(s).success, 'Email no válido')
  .transform((s) => s || null)
