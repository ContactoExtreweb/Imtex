import { zodResolver } from '@hookform/resolvers/zod'
import type { AuthError } from '@supabase/supabase-js'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import lema from '@/assets/lema-imtex.png'
import logo from '@/assets/logo-imtex.png'
import { Campo } from '@/components/campo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSesion } from '@/lib/sesion'
import { supabase } from '@/lib/supabase'
import { email } from '@/lib/validacion'

function mensajeAuth(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Email o contraseña incorrectos.'
    case 'email_not_confirmed':
      return 'Primero tienes que aceptar la invitación que te llegó por email.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Demasiados intentos. Espera un rato y vuelve a probar.'
    case 'same_password':
      return 'La contraseña nueva tiene que ser distinta de la anterior.'
    case 'weak_password':
      return 'La contraseña es demasiado débil: usa al menos 8 caracteres.'
    default:
      return error.message
  }
}

/**
 * Pantallas de acceso con la composición de la tarjeta de IMTEX: logo, lema y las franjas de la esquina.
 * En escritorio la marca va a la izquierda y el formulario a la derecha; en el móvil, una debajo de otra.
 */
function PantallaAcceso({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="relative grid min-h-dvh content-start overflow-hidden lg:grid-cols-[1.1fr_1fr] lg:content-stretch">
      <div className="grid justify-items-center gap-4 px-6 pt-12 pb-8 lg:content-center lg:pb-48">
        <img src={logo} alt="IMTEX" className="w-56 lg:w-[26rem]" />
        <img
          src={lema}
          alt="Soluciones técnicas para industria y construcción"
          className="w-full max-w-sm lg:max-w-[30rem]"
        />
      </div>
      <div className="relative z-10 grid justify-items-center px-6 pb-36 lg:content-center lg:border-l lg:bg-background lg:pb-6">
        <div className="grid w-full max-w-sm gap-6">
          <h1 className="text-2xl font-semibold">{titulo}</h1>
          {children}
        </div>
      </div>
      <FranjasMarca />
    </main>
  )
}

/** Las franjas rojas y grises de la esquina inferior izquierda de la tarjeta de IMTEX. Decorativas. */
function FranjasMarca() {
  return (
    <svg
      viewBox="0 0 1000 563"
      aria-hidden="true"
      className="franjas-marca pointer-events-none absolute bottom-0 left-0 w-[64%] max-w-xs lg:w-[38%] lg:max-w-2xl"
    >
      <polygon points="0,50 900,563 800,563 0,66" className="fill-pizarra" />
      <polygon points="0,78 760,563 330,563 0,250" className="fill-marca" />
      <polygon points="0,250 330,563 100,563 0,470" className="fill-pizarra" />
      <polygon points="0,318 245,527 0,352" className="fill-background" />
      <polygon points="0,470 100,563 0,563" className="fill-marca" />
    </svg>
  )
}

function Aviso({ children }: { children: ReactNode }) {
  return children ? (
    <p role="alert" className="text-sm text-destructive">
      {children}
    </p>
  ) : null
}

const esquemaLogin = z.object({ email, password: z.string().min(1, 'Obligatoria') })

export function Login() {
  const { session, cargando } = useSesion()
  const location = useLocation()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { email: '', password: '' },
  })

  if (cargando) return null
  if (session) {
    const desde = (location.state as { desde?: string } | null)?.desde ?? '/'
    return <Navigate to={desde} replace />
  }

  const entrar = handleSubmit(async (datos) => {
    setError('')
    const { error } = await supabase.auth.signInWithPassword(datos)
    if (error) setError(mensajeAuth(error))
  })

  return (
    <PantallaAcceso titulo="Entrar">
      <form onSubmit={entrar} className="grid gap-3">
        <Campo etiqueta="Email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...register('email')} />
        </Campo>
        <Campo etiqueta="Contraseña" error={formState.errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Campo>
        <Aviso>{error}</Aviso>
        <Button type="submit" disabled={formState.isSubmitting}>
          Entrar
        </Button>
        <Link to="/recuperar" className="text-sm text-muted-foreground underline">
          ¿Has olvidado tu contraseña?
        </Link>
      </form>
    </PantallaAcceso>
  )
}

const esquemaRecuperar = z.object({ email })

export function Recuperar() {
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(esquemaRecuperar),
    defaultValues: { email: '' },
  })

  const enviar = handleSubmit(async ({ email }) => {
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nueva-contrasena`,
    })
    if (error) setError(mensajeAuth(error))
    else setEnviado(true)
  })

  return (
    <PantallaAcceso titulo="Recuperar contraseña">
      {enviado ? (
        <p className="text-sm">
          Si ese email tiene acceso, te llegará un enlace para elegir una contraseña nueva. Revisa
          también la carpeta de spam.
        </p>
      ) : (
        <form onSubmit={enviar} className="grid gap-3">
          <Campo etiqueta="Email" error={formState.errors.email?.message}>
            <Input type="email" autoComplete="email" {...register('email')} />
          </Campo>
          <Aviso>{error}</Aviso>
          <Button type="submit" disabled={formState.isSubmitting}>
            Enviar enlace
          </Button>
        </form>
      )}
      <Link to="/login" className="text-sm text-muted-foreground underline">
        Volver a entrar
      </Link>
    </PantallaAcceso>
  )
}

const esquemaNueva = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    repetir: z.string(),
  })
  .refine((d) => d.password === d.repetir, { message: 'No coinciden', path: ['repetir'] })

/** Llegan aquí los enlaces de invitación y de recuperación (ver index.html). */
export function NuevaContrasena() {
  const { session, cargando } = useSesion()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(esquemaNueva),
    defaultValues: { password: '', repetir: '' },
  })

  if (cargando) return null
  if (!session) {
    return (
      <PantallaAcceso titulo="Enlace no válido">
        <p className="text-sm">El enlace ha caducado o ya se ha usado.</p>
        <Link to="/recuperar" className="text-sm underline">
          Pedir un enlace nuevo
        </Link>
      </PantallaAcceso>
    )
  }

  const guardar = handleSubmit(async ({ password }) => {
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return setError(mensajeAuth(error))
    toast.success('Contraseña guardada')
    navigate('/', { replace: true })
  })

  return (
    <PantallaAcceso titulo="Elige tu contraseña">
      <form onSubmit={guardar} className="grid gap-3">
        <p className="text-sm text-muted-foreground">{session.user.email}</p>
        <Campo etiqueta="Contraseña nueva" error={formState.errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Campo>
        <Campo etiqueta="Repítela" error={formState.errors.repetir?.message}>
          <Input type="password" autoComplete="new-password" {...register('repetir')} />
        </Campo>
        <Aviso>{error}</Aviso>
        <Button type="submit" disabled={formState.isSubmitting}>
          Guardar y entrar
        </Button>
      </form>
    </PantallaAcceso>
  )
}
