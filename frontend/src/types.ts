export type PaymentMethod = 'cash' | 'qr' | 'card'
export interface Product {
  id: number
  name: string
  category: string
  icon: string
  price_centavos: number
}
export interface CartLine {
  product: Product
  quantity: number
}
export interface CheckoutRequest {
  request_id: string
  items: { product_id: number; quantity: number }[]
  payment_method: PaymentMethod
  amount_paid_centavos?: number
}
export interface Receipt {
  reference: string
  created_at: string
  payment_method: PaymentMethod
  total_centavos: number
  amount_paid_centavos: number
  change_centavos: number
  status: 'completed'
  items: {
    product_id: number
    name: string
    quantity: number
    unit_price_centavos: number
    subtotal_centavos: number
  }[]
}
