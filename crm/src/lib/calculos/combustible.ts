/**
 * Coste por km = precio del litro × consumo (L/100 km) / 100, a 3 decimales.
 * Igual que referencia/IMTEX_control_obra.html (costeKmFurgon / costeKmCamion).
 */
export function costeKm(precioLitro: number, consumoL100: number): number {
  return Number(((consumoL100 * precioLitro) / 100).toFixed(3))
}
