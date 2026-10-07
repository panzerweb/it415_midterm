import type { PaymentMethod } from './types'
export const paymentLabel = (method: PaymentMethod) =>
  ({ cash: 'Cash', qr: 'QR Payment', card: 'Credit / Debit Card' })[method]
export const receiptDate = (value: string) =>
  new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value))
