import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api, ApiError } from '../api'
import { money, parseCash } from '../money'
import type { CartLine, CheckoutRequest, PaymentMethod, Product, Receipt } from '../types'

export const useCheckoutStore = defineStore('checkout', () => {
  const products = ref<Product[]>([])
  const cart = ref<CartLine[]>([])
  const category = ref('All')
  const loading = ref(false)
  const catalogError = ref('')
  const notice = ref('')
  const paymentMethod = ref<PaymentMethod | null>(null)
  const cashInput = ref('')
  const paymentError = ref('')
  const processing = ref(false)
  const receipt = ref<Receipt | null>(null)
  const pendingAttempt = ref<CheckoutRequest | null>(null)
  const demoOrderId = ref<string | null>(null)
  const total = computed(() =>
    cart.value.reduce((sum, line) => sum + line.product.price_centavos * line.quantity, 0),
  )
  const itemCount = computed(() => cart.value.reduce((sum, line) => sum + line.quantity, 0))
  const cashAmount = computed(() => parseCash(cashInput.value))
  const change = computed(() =>
    cashAmount.value !== null && cashAmount.value >= total.value
      ? cashAmount.value - total.value
      : null,
  )
  const locked = computed(() => processing.value || pendingAttempt.value !== null)

  async function loadProducts() {
    loading.value = true
    catalogError.value = ''
    try {
      products.value = await api<Product[]>('/products')
    } catch (error) {
      catalogError.value = error instanceof Error ? error.message : 'Could not load products.'
    } finally {
      loading.value = false
    }
  }

  function clearPayment() {
    paymentMethod.value = null
    cashInput.value = ''
    paymentError.value = ''
    pendingAttempt.value = null
    demoOrderId.value = null
  }

  function add(product: Product) {
    if (locked.value || receipt.value) return
    const line = cart.value.find((line) => line.product.id === product.id)
    if (line && line.quantity >= 99) {
      notice.value = 'Maximum quantity is 99 per product.'
      return
    }
    if (line) line.quantity++
    else cart.value.push({ product, quantity: 1 })
    clearPayment()
    notice.value = `Product added — ${product.name}`
  }

  function adjust(productId: number, delta: number) {
    if (locked.value || receipt.value) return
    const line = cart.value.find((line) => line.product.id === productId)
    if (!line) return
    if (line.quantity + delta <= 0) {
      remove(productId)
      return
    }
    if (line.quantity + delta > 99) {
      notice.value = 'Maximum quantity is 99 per product.'
      return
    }
    line.quantity += delta
    clearPayment()
    notice.value = `${line.product.name} quantity updated to ${line.quantity}.`
  }

  function remove(productId: number) {
    if (locked.value || receipt.value) return
    const line = cart.value.find((line) => line.product.id === productId)
    cart.value = cart.value.filter((line) => line.product.id !== productId)
    clearPayment()
    notice.value = `${line?.product.name ?? 'Item'} removed.`
  }

  function chooseMethod(method: PaymentMethod | null) {
    if (locked.value) return
    clearPayment()
    paymentMethod.value = method
    if (method === 'qr') demoOrderId.value = crypto.randomUUID()
  }

  function clearOrder() {
    if (locked.value || receipt.value) return
    cart.value = []
    category.value = 'All'
    clearPayment()
    notice.value = 'Order cleared.'
  }

  function setCash(value: string) {
    if (locked.value) return
    cashInput.value = value
    paymentError.value = ''
  }

  function keypress(key: string) {
    if (locked.value) return
    const current = cashInput.value
    if (key === 'clear') return setCash('')
    if (key === 'backspace') return setCash(current.slice(0, -1))
    if (key === '.' && current.includes('.')) return
    const next = key === '.' && current === '' ? '0.' : current + key
    if (/^\d{0,7}(\.\d{0,2})?$/.test(next)) setCash(next)
  }

  async function pay(): Promise<boolean> {
    if (processing.value || receipt.value) return false
    paymentError.value = ''
    if (!pendingAttempt.value) {
      if (!cart.value.length || !paymentMethod.value) {
        paymentError.value = 'Choose items and a payment method first.'
        return false
      }
      if (paymentMethod.value === 'cash') {
        if (cashAmount.value === null) {
          paymentError.value = 'Enter a valid cash amount with up to two decimal places.'
          return false
        }
        if (cashAmount.value < total.value) {
          paymentError.value = `Insufficient payment. Please enter at least ${money(total.value)}. You are short by ${money(total.value - cashAmount.value)}.`
          return false
        }
      }
      pendingAttempt.value = {
        request_id: paymentMethod.value === 'qr' ? demoOrderId.value! : crypto.randomUUID(),
        items: cart.value.map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
        payment_method: paymentMethod.value,
        ...(paymentMethod.value === 'cash' ? { amount_paid_centavos: cashAmount.value! } : {}),
      }
    }
    processing.value = true
    try {
      // Keep the card processing message visible, even on a fast local connection.
      if (pendingAttempt.value.payment_method === 'card')
        await new Promise((resolve) => setTimeout(resolve, 900))
      receipt.value = await api<Receipt>('/checkout', pendingAttempt.value)
      pendingAttempt.value = null
      notice.value = ''
      return true
    } catch (error) {
      const definitive = error instanceof ApiError && [400, 404, 409, 422].includes(error.status)
      if (definitive) pendingAttempt.value = null
      paymentError.value =
        error instanceof Error ? error.message : 'Payment could not be confirmed.'
      if (!definitive)
        paymentError.value +=
          ' Retry this same payment to safely check its result. Your order is held until it is confirmed.'
      return false
    } finally {
      processing.value = false
    }
  }

  function newTransaction() {
    if (locked.value) return
    cart.value = []
    category.value = 'All'
    receipt.value = null
    processing.value = false
    clearPayment()
    notice.value = 'New transaction started — previous order cleared.'
  }

  return {
    products,
    cart,
    category,
    loading,
    catalogError,
    notice,
    paymentMethod,
    cashInput,
    paymentError,
    processing,
    receipt,
    pendingAttempt,
    demoOrderId,
    total,
    itemCount,
    cashAmount,
    change,
    locked,
    loadProducts,
    add,
    adjust,
    remove,
    chooseMethod,
    clearOrder,
    setCash,
    keypress,
    pay,
    newTransaction,
  }
})
