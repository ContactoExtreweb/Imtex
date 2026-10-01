import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { leerNumero, numeroATexto } from '@/lib/formato'

/**
 * Campo numérico controlado para los editores: el valor es un número, pero mientras se escribe
 * se respeta el texto tal cual («18,» o «0,0»). Vacío o no válido cuenta como 0.
 */
export function EntradaNumero({
  valor,
  onCambio,
  ...props
}: { valor: number; onCambio: (valor: number) => void } & Omit<ComponentProps<'input'>, 'value' | 'onChange'>) {
  const [texto, setTexto] = useState(() => numeroATexto(valor))
  const [ultimo, setUltimo] = useState(valor)
  // Si el valor cambia desde fuera (otra partida, «Actualizar precios»), se refleja en el texto
  if (valor !== ultimo) {
    setUltimo(valor)
    setTexto(numeroATexto(valor))
  }

  return (
    <Input
      inputMode="decimal"
      value={texto}
      onChange={(e) => {
        const numero = Math.max(0, leerNumero(e.target.value) ?? 0)
        setTexto(e.target.value)
        setUltimo(numero)
        onCambio(numero)
      }}
      {...props}
    />
  )
}
