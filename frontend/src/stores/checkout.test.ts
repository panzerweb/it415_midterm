import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCheckoutStore } from './checkout'
import { parseCash } from '../money'
import { demoQrPayload } from '../qr'
import type { Product, Receipt } from '../types'

const coffee: Product = {
  id: 1,
  name: 'Coffee',
  price_centavos: 4500,
  category: 'Drinks',
  icon: 'coffee',
}
const sandwich: Product = {
  id: 2,
  name: 'Sandwich',
  price_centavos: 5000,
  category: 'Food',
  icon: 'sandwich',
}
const soda: Product = {
  id: 3,
  name: 'Soft Drink',
  price_centavos: 3500,
  category: 'Drinks',
  icon: 'soda',
}
const receipt: Receipt = {
  reference: 'TXN-2026-TEST',
  created_at: '2026-10-07T00:00:00Z',
  payment_method: 'cash',
  total_centavos: 17500,
  amount_paid_centavos: 20000,
  change_centavos: 2500,
  status: 'completed',
  items: [],
}

function sampleOrder() {
  const store = useCheckoutStore()
  store.add(coffee)
  store.add(coffee)
  store.add(sandwich)
  store.add(soda)
  return store
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('cart', () => {
  it('matches instructor totals and removes items at zero', () => {
    const store = sampleOrder()
    expect(store.total).toBe(17500)
    expect(store.itemCount).toBe(4)
    store.adjust(1, 1)
    expect(store.total).toBe(22000)
    store.adjust(1, -1)
    expect(store.total).toBe(17500)
    store.remove(3)
    expect(store.total).toBe(14000)
    store.adjust(2, -1)
    expect(store.total).toBe(9000)
    store.adjust(2, -1)
    expect(store.total).toBe(9000)
  })
  it('limits quantities and clears stale payment inputs when the order changes', () => {
    const store = useCheckoutStore()
    for (let i = 0; i < 100; i++) store.add(coffee)
    expect(store.itemCount).toBe(99)
    store.chooseMethod('cash')
    store.setCash('5000')
    store.adjust(1, -1)
    expect(store.paymentMethod).toBeNull()
    expect(store.cashInput).toBe('')
  })
  it('clears the order and payment state when requested', () => {
    const store = sampleOrder()
    store.chooseMethod('cash')
    store.setCash('200')
    store.clearOrder()
    expect(store.cart).toEqual([])
    expect(store.total).toBe(0)
    expect(store.paymentMethod).toBeNull()
    expect(store.cashInput).toBe('')
  })
})

describe('cash parsing and keypad', () => {
  it.each([
    ['175', 17500],
    ['175.00', 17500],
    ['0.50', 50],
    ['0', 0],
    ['1.01', 101],
    [' 20.1 ', 2010],
  ])('parses %s exactly', (input, expected) => {
    expect(parseCash(String(input))).toBe(expected)
  })
  it.each(['', '-1', 'abc', '1e3', '1.001', 'NaN', 'Infinity', '.', '1.', '1,000', '1000001'])(
    'rejects %s',
    (input) => {
      expect(parseCash(input)).toBeNull()
    },
  )
  it('supports decimal entry, backspace and clear', () => {
    const store = useCheckoutStore()
    for (const key of ['.', '5', '0', '1', '.']) store.keypress(key)
    expect(store.cashInput).toBe('0.50')
    store.keypress('backspace')
    expect(store.cashInput).toBe('0.5')
    store.keypress('clear')
    expect(store.cashInput).toBe('')
  })
})

describe('checkout', () => {
  it('uses the scannable demo ID for QR submission and refreshes it for a changed order', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)
    const store = sampleOrder()
    store.chooseMethod('qr')
    const firstId = store.demoOrderId!
    expect(firstId).toMatch(/^[0-9a-f-]{36}$/)
    expect(demoQrPayload(firstId, store.total)).toContain('Amount: PHP 175.00')
    expect(demoQrPayload(firstId, store.total)).toContain('No payment is requested or verified.')
    expect(await store.pay()).toBe(false)
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).request_id).toBe(firstId)
    store.clearOrder()
    expect(store.demoOrderId).toBe(firstId)
    expect(store.total).toBe(17500)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(receipt))))
    expect(await store.pay()).toBe(true)
    store.newTransaction()
    store.add(coffee)
    store.chooseMethod('qr')
    expect(store.demoOrderId).not.toBe(firstId)
    expect(demoQrPayload(store.demoOrderId!, store.total)).toContain('Amount: PHP 45.00')
  })
  it('regenerates a QR demo ID when the cart changes before checkout', () => {
    const store = sampleOrder()
    store.chooseMethod('qr')
    const original = store.demoOrderId
    store.adjust(1, 1)
    expect(store.demoOrderId).toBeNull()
    expect(store.paymentMethod).toBeNull()
    store.chooseMethod('qr')
    expect(store.demoOrderId).not.toBe(original)
    expect(demoQrPayload(store.demoOrderId!, store.total)).toContain('Amount: PHP 220.00')
  })
  it('rejects invalid cash before submitting and shows shortfall', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const store = sampleOrder()
    store.chooseMethod('cash')
    expect(await store.pay()).toBe(false)
    store.setCash('100')
    expect(await store.pay()).toBe(false)
    expect(store.paymentError).toContain('₱75.00')
    expect(store.change).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    store.setCash('200')
    expect(store.change).toBe(2500)
  })
  it('preserves an uncertain request and locks editing until retry confirms it', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify(receipt)))
    vi.stubGlobal('fetch', fetchMock)
    const store = sampleOrder()
    store.chooseMethod('cash')
    store.setCash('200')
    expect(await store.pay()).toBe(false)
    const firstBody = fetchMock.mock.calls[0]![1].body
    expect(store.locked).toBe(true)
    store.setCash('500')
    store.remove(1)
    store.newTransaction()
    store.chooseMethod('qr')
    expect(store.cashInput).toBe('200')
    expect(store.total).toBe(17500)
    expect(await store.pay()).toBe(true)
    expect(fetchMock.mock.calls[1]![1].body).toBe(firstBody)
    expect(store.receipt).toEqual(receipt)
    expect(store.locked).toBe(false)
  })
  it('unlocks correctable server validation failures without creating a receipt', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ detail: 'Insufficient payment.' }), { status: 422 }),
        ),
    )
    const store = sampleOrder()
    store.chooseMethod('cash')
    store.setCash('200')
    expect(await store.pay()).toBe(false)
    expect(store.locked).toBe(false)
    expect(store.receipt).toBeNull()
    expect(store.paymentError).toBe('Insufficient payment.')
  })
  it('prevents duplicate submission while a response is pending', async () => {
    let resolve!: (value: Response) => void
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((r) => {
          resolve = r
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const store = sampleOrder()
    store.chooseMethod('qr')
    const first = store.pay()
    expect(await store.pay()).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    resolve(new Response(JSON.stringify({ ...receipt, payment_method: 'qr' })))
    await first
  })
  it.each(['null', '[]', '"invalid"', 'not JSON'])(
    'unlocks a validation rejection with an unexpected response body: %s',
    async (body) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 422 })))
      const store = sampleOrder()
      store.chooseMethod('cash')
      store.setCash('200')
      expect(await store.pay()).toBe(false)
      expect(store.locked).toBe(false)
      expect(store.pendingAttempt).toBeNull()
      expect(store.receipt).toBeNull()
      expect(store.paymentError).toBe('Please check your order and payment details.')
    },
  )
  it('sends no user-provided paid amount for QR and clears everything on reset', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...receipt,
          payment_method: 'qr',
          amount_paid_centavos: 17500,
          change_centavos: 0,
        }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const store = sampleOrder()
    store.category = 'Drinks'
    store.chooseMethod('qr')
    expect(await store.pay()).toBe(true)
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).not.toHaveProperty('amount_paid_centavos')
    store.newTransaction()
    expect(store.total).toBe(0)
    expect(store.itemCount).toBe(0)
    expect(store.receipt).toBeNull()
    expect(store.paymentMethod).toBeNull()
    expect(store.cashInput).toBe('')
    expect(store.paymentError).toBe('')
    expect(store.category).toBe('All')
    expect(store.pendingAttempt).toBeNull()
  })
})
