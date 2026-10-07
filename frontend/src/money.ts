export const MAX_AMOUNT = 100_000_000
const formatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
export const money = (centavos: number) => formatter.format(centavos / 100)

export function parseCash(input: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(input.trim())) return null
  const [whole, fraction = ''] = input.trim().split('.')
  const centavos = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(centavos) && centavos <= MAX_AMOUNT ? centavos : null
}
