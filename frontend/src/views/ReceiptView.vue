<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useCheckoutStore } from '../stores/checkout'
import { money } from '../money'
import { paymentLabel, receiptDate } from '../transaction'
import Icon from '../components/Icon.vue'
const store = useCheckoutStore()
const router = useRouter()
function startNew() {
  store.newTransaction()
  router.replace('/')
}
</script>

<template>
  <section v-if="store.receipt" class="receipt-page">
    <div class="receipt-paper">
      <div class="receipt-brand">
        <div class="brand-mark"><Icon name="coffee" :size="27" /></div>
        <h2>
          Campus Store
          <span class="brand-dot">.</span>
        </h2>
        <p>SELF-SERVICE KIOSK · DIGITAL RECEIPT</p>
      </div>
      <dl class="receipt-meta">
        <div>
          <dt>Transaction no.</dt>
          <dd>{{ store.receipt.reference }}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{{ receiptDate(store.receipt.created_at) }} (PHT)</dd>
        </div>
      </dl>
      <div class="receipt-column-labels">
        <span>ITEM</span>
        <span>SUBTOTAL</span>
      </div>
      <div class="receipt-lines">
        <div v-for="item in store.receipt.items" :key="item.product_id">
          <div>
            <strong>{{ item.name }}</strong>
            <small>{{ item.quantity }} × {{ money(item.unit_price_centavos) }}</small>
          </div>
          <strong>{{ money(item.subtotal_centavos) }}</strong>
        </div>
      </div>
      <div class="receipt-total">
        <span>Total</span>
        <strong>{{ money(store.receipt.total_centavos) }}</strong>
      </div>
      <dl class="details-list">
        <div>
          <dt>Payment method</dt>
          <dd>{{ paymentLabel(store.receipt.payment_method) }}</dd>
        </div>
        <div>
          <dt>Amount paid</dt>
          <dd>{{ money(store.receipt.amount_paid_centavos) }}</dd>
        </div>
        <div>
          <dt>Change</dt>
          <dd>{{ money(store.receipt.change_centavos) }}</dd>
        </div>
      </dl>
      <div class="receipt-status">
        <Icon name="check" :size="18" />
        Payment Successful
      </div>
      <div class="receipt-thanks">
        A little break. A better day.
        <span>Thank you for your purchase!</span>
      </div>
    </div>
    <div class="receipt-message">
      <div class="eyebrow">
        <span class="small-line"></span>
        UNTIL YOUR NEXT BREAK
      </div>
      <h1>
        Your receipt.
        <br />
        All taken care of.
      </h1>
      <p>
        Keep this for your records. Ready for the next customer? Start a new transaction to clear
        your order and payment details.
      </p>
      <button class="button primary wide" @click="startNew">
        New transaction
        <Icon name="arrow" />
      </button>
      <div class="receipt-reset-note">
        <Icon name="info" :size="21" />
        <span>Your order and payment details will be cleared from this screen.</span>
      </div>
    </div>
  </section>
</template>
