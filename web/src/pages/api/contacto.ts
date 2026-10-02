// Recibe el formulario de contacto y lo envía por correo a IMTEX con Resend.
// Sin JavaScript en el navegador responde con una redirección a /contacto?estado=…;
// con JavaScript (cabecera Accept: application/json) responde con { estado }.
import type { APIRoute } from 'astro'

export const prerender = false

type Estado = 'ok' | 'revisa' | 'sin-envio' | 'error'

const recorta = (valor: FormDataEntryValue | null, max: number) => String(valor ?? '').trim().slice(0, max)

export const POST: APIRoute = async ({ request, redirect }) => {
  const responder = (estado: Estado) =>
    request.headers.get('accept')?.includes('application/json')
      ? Response.json({ estado }, { status: estado === 'ok' ? 200 : estado === 'revisa' ? 422 : 502 })
      : redirect(`/contacto?estado=${estado}#formulario`, 303)

  let datos: FormData
  try {
    datos = await request.formData()
  } catch {
    return responder('revisa')
  }

  // Antispam sin cookies ni terceros: un campo trampa que las personas no ven, y un tiempo mínimo
  // entre cargar la página y enviar. Un robot que rellena la trampa recibe un «enviado» y nada más.
  // ponytail: la hora va en claro y se puede falsear; si llega spam, firmarla o añadir un captcha.
  if (recorta(datos.get('web'), 200)) return responder('ok')
  const tardanza = Date.now() - Number(datos.get('t'))
  if (!(tardanza > 3000 && tardanza < 12 * 3600 * 1000)) return responder('revisa')

  const nombre = recorta(datos.get('nombre'), 120)
  const empresa = recorta(datos.get('empresa'), 120)
  const email = recorta(datos.get('email'), 160)
  const telefono = recorta(datos.get('telefono'), 40)
  const asunto = recorta(datos.get('asunto'), 80)
  const mensaje = recorta(datos.get('mensaje'), 5000)
  const valido =
    nombre.length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && mensaje.length >= 10 && datos.get('privacidad') === 'si' && !/[\r\n]/.test(nombre + email + asunto)
  if (!valido) return responder('revisa')

  const clave = import.meta.env.RESEND_API_KEY
  const destino = import.meta.env.CONTACTO_EMAIL_DESTINO
  if (!clave || !destino) return responder('sin-envio')

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: import.meta.env.CONTACTO_EMAIL_REMITENTE || 'Web de IMTEX <web@avisos.imtexsl.com>',
        to: [destino],
        reply_to: email,
        subject: `Web: ${asunto || 'consulta'} · ${nombre}`,
        // Texto plano: lo que escribe el visitante no se interpreta como HTML
        text: [`Nombre: ${nombre}`, `Empresa: ${empresa || '—'}`, `Email: ${email}`, `Teléfono: ${telefono || '—'}`, `Asunto: ${asunto || '—'}`, '', mensaje].join('\n'),
      }),
    })
    if (!res.ok) {
      console.error('Resend', res.status, await res.text())
      return responder('error')
    }
    return responder('ok')
  } catch (error) {
    console.error(error)
    return responder('error')
  }
}
