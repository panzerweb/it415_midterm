<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'
import { useCheckoutStore } from '../stores/checkout'
import { money } from '../money'
import { demoQrPayload } from '../qr'
import Icon from '../components/Icon.vue'
import type { PaymentMethod } from '../types'

const store = useCheckoutStore()
const router = useRouter()
const qrImage = ref('')
const qrError = ref('')
const qrPayload = computed(() =>
  store.paymentMethod === 'qr' && store.demoOrderId
    ? demoQrPayload(store.demoOrderId, store.total)
    : '',
)
watch(
  qrPayload,
  async (payload) => {
    qrImage.value = ''
    qrError.value = ''
    if (!payload) return
    try {
      const image = await QRCode.toDataURL(payload, {
        width: 260,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#143c69', light: '#ffffff' },
      })
      if (qrPayload.value === payload) qrImage.value = image
    } catch {
      if (qrPayload.value === payload)
        qrError.value = 'Could not create the demo QR. Choose QR again to retry.'
    }
  },
  { immediate: true },
)
const methods: { id: PaymentMethod; title: string; description: string; icon: string }[] = [
  {
    id: 'cash',
    title: 'Cash',
    description: 'Enter the amount you’re paying. We’ll calculate your change.',
    icon: 'cash',
  },
  {
    id: 'qr',
    title: 'QR payment',
    description: 'Scan demo order details with your phone camera.',
    icon: 'qr',
  },
  {
    id: 'card',
    title: 'Credit / debit card',
    description: 'Tap, insert, or swipe. A little convenience for your day.',
    icon: 'card',
  },
]
const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace']
async function pay() {
  if (await store.pay()) await router.replace('/success')
}
function inputCash(event: Event) {
  store.setCash((event.target as HTMLInputElement).value)
}
</script>

<template>
  <section class="flow-page payment-page" :aria-busy="store.processing">
    <template v-if="!store.paymentMethod">
      <div class="eyebrow">
        <span class="small-line"></span>
        YOUR BREAK, YOUR WAY
      </div>
      <h1>How would you like to pay?</h1>
      <p class="page-intro">Choose an option below to finish your order.</p>
      <div class="amount-banner">
        <span>
          AMOUNT DUE
          <small>{{ store.itemCount }} items, all yours.</small>
        </span>
        <strong>{{ money(store.total) }}</strong>
      </div>
      <div class="payment-methods">
        <button
          v-for="method in methods"
          :key="method.id"
          class="method-card"
          @click="store.chooseMethod(method.id)"
        >
          <span class="method-icon"><Icon :name="method.icon" :size="38" /></span>
          <h2>{{ method.title }}</h2>
          <p>{{ method.description }}</p>
          <span class="method-bottom">
            {{ method.id === 'cash' ? 'Enter amount' : 'Simulated payment' }}
            <Icon name="arrow" :size="21" />
          </span>
        </button>
      </div>
      <div class="page-actions">
        <button class="button secondary" @click="$router.push('/review')">
          <Icon name="back" />
          Back to review
        </button>
        <span class="simulation-note">
          <Icon name="info" :size="18" />
          Demo kiosk. No real charges.
        </span>
      </div>
    </template>

    <template v-else>
      <div class="eyebrow">
        <span class="small-line"></span>
        ALMOST THERE
      </div>
      <h1>
        {{
          store.paymentMethod === 'cash'
            ? 'A little change for your day.'
            : store.paymentMethod === 'qr'
              ? 'Scan. Confirm. Enjoy.'
              : 'You’re one tap away.'
        }}
      </h1>
      <p class="page-intro">
        {{
          store.paymentMethod === 'cash'
            ? 'Enter your cash amount to complete your order.'
            : 'This is a simulated payment. No money will be charged.'
        }}
      </p>
      <div class="payment-workspace" :class="{ 'cash-workspace': store.paymentMethod === 'cash' }">
        <div class="payment-details">
          <div class="payment-title">
            <span class="method-icon compact">
              <Icon
                :name="
                  store.paymentMethod === 'qr'
                    ? 'qr'
                    : store.paymentMethod === 'card'
                      ? 'card'
                      : 'cash'
                "
                :size="25"
              />
            </span>
            <h2>
              {{
                store.paymentMethod === 'cash'
                  ? 'Cash payment'
                  : store.paymentMethod === 'qr'
                    ? 'QR payment'
                    : 'Credit / debit card'
              }}
            </h2>
          </div>
          <div class="due-label">
            TOTAL AMOUNT
            <strong>{{ money(store.total) }}</strong>
          </div>
          <template v-if="store.paymentMethod === 'cash'">
            <label class="cash-label" for="cash-amount">Amount paid</label>
            <div class="cash-input" :class="{ invalid: store.paymentError }">
              <span>₱</span>
              <input
                id="cash-amount"
                inputmode="decimal"
                autocomplete="off"
                placeholder="0.00"
                :value="store.cashInput"
                :disabled="store.locked"
                :aria-invalid="!!store.paymentError"
                :aria-describedby="store.paymentError ? 'payment-error' : undefined"
                @input="inputCash"
              />
            </div>
            <div class="quick-label">QUICK AMOUNTS</div>
            <div class="quick-amounts">
              <button
                :disabled="store.locked"
                @click="store.setCash((store.total / 100).toFixed(2))"
              >
                Exact
              </button>
              <button
                v-for="amount in [200, 500, 1000]"
                :key="amount"
                :disabled="store.locked"
                @click="store.setCash(String(amount))"
              >
                ₱{{ amount.toLocaleString() }}
              </button>
            </div>
            <div class="change-row">
              <span>Your change</span>
              <strong>{{ store.change === null ? '—' : money(store.change) }}</strong>
            </div>
          </template>
          <template v-else-if="store.paymentMethod === 'qr'">
            <ol class="payment-instructions">
              <li>Scan with your phone camera or any QR reader.</li>
              <li>
                Check the amount is
                <strong>{{ money(store.total) }}</strong>
                .
              </li>
              <li>Tap Simulate payment to complete this demo order.</li>
            </ol>
            <div class="simulation-note">
              <Icon name="info" :size="19" />
              Order details only · no bank or e-wallet payment is made.
            </div>
          </template>
          <template v-else>
            <p class="card-instruction">Please tap, insert, or swipe your card.</p>
            <p class="muted">
              Use the button below to simulate the card reader. No card details are collected.
            </p>
          </template>
        </div>
        <div v-if="store.paymentMethod === 'cash'" class="keypad-panel">
          <div class="keypad-heading">
            <span>ENTER AMOUNT</span>
            <button class="text-button" :disabled="store.locked" @click="store.keypress('clear')">
              Clear
            </button>
          </div>
          <div class="keypad">
            <button
              v-for="key in keypad"
              :key="key"
              :aria-label="key === 'backspace' ? 'Backspace' : key === '.' ? 'Decimal point' : key"
              :disabled="store.locked"
              @click="store.keypress(key)"
            >
              <Icon v-if="key === 'backspace'" name="backspace" :size="24" />
              <template v-else>{{ key }}</template>
            </button>
          </div>
        </div>
        <div v-else-if="store.paymentMethod === 'qr'" class="qr-panel">
          <div class="qr-code-frame">
            <img
              v-if="qrImage"
              :src="qrImage"
              alt="Scannable demo order QR code"
              width="260"
              height="260"
            />
            <span v-else-if="qrError" role="alert">{{ qrError }}</span>
            <span v-else role="status">Generating demo QR…</span>
          </div>
          <span class="simulation-pill">DEMO ORDER · NO CHARGE</span>
          <p v-if="store.demoOrderId" class="qr-order-id">Order ID: {{ store.demoOrderId }}</p>
          <p>Scan to view the amount and demo order ID.</p>
        </div>
        <div v-else class="card-panel">
          <div class="demo-card">
            <div class="demo-card-top">
              <span>CAMPUS CARD</span>
              <Icon name="card" :size="30" />
            </div>
            <div class="card-chip"></div>
            <div class="card-dots">•••• &nbsp; •••• &nbsp; •••• &nbsp; 4821</div>
            <div class="demo-card-bottom">
              <span>YOUR EVERYDAY FAVORITES</span>
              <span>DEMO</span>
            </div>
          </div>
          <p v-if="store.processing" class="processing-message" role="status">
            <span class="spinner"></span>
            Processing payment…
          </p>
          <p v-else class="simulation-note">A simulated card for a real good break.</p>
        </div>
      </div>
      <div v-if="store.paymentError" id="payment-error" class="error-banner" role="alert">
        <Icon name="info" :size="23" />
        <div>
          <strong>
            {{ store.pendingAttempt ? 'Let’s confirm your payment' : 'Please check your payment' }}
          </strong>
          <p>{{ store.paymentError }}</p>
        </div>
      </div>
      <div class="page-actions">
        <button class="button secondary" :disabled="store.locked" @click="store.chooseMethod(null)">
          <Icon name="back" />
          Change payment method
        </button>
        <button
          class="button primary"
          :disabled="store.processing || (store.paymentMethod === 'qr' && !qrImage)"
          @click="pay"
        >
          <span v-if="store.processing" class="spinner"></span>
          {{
            store.processing
              ? 'Processing payment…'
              : store.pendingAttempt
                ? 'Retry payment'
                : store.paymentMethod === 'cash'
                  ? 'Pay now'
                  : store.paymentMethod === 'qr'
                    ? 'Simulate payment'
                    : 'Process payment'
          }}
          <Icon v-if="!store.processing" name="arrow" />
        </button>
      </div>
    </template>
  </section>
</template>
