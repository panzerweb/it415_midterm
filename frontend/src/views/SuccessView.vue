<script setup lang="ts">
import { useCheckoutStore } from '../stores/checkout'
import { money } from '../money'
import Icon from '../components/Icon.vue'
import { paymentLabel } from '../transaction'
const store = useCheckoutStore()
</script>

<template>
  <section v-if="store.receipt" class="success-page">
    <div class="success-icon"><Icon name="check" :size="48" /></div>
    <div class="eyebrow">ALL SET, ALL YOURS</div>
    <h1>Good things are on the way.</h1>
    <p class="page-intro">Payment successful. Thanks for stopping by!</p>
    <div class="success-card">
      <div class="success-amount">
        <span>PAYMENT SUCCESSFUL</span>
        <strong>{{ money(store.receipt.total_centavos) }}</strong>
      </div>
      <dl class="details-list">
        <div>
          <dt>Transaction no.</dt>
          <dd class="reference">{{ store.receipt.reference }}</dd>
        </div>
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
      <button class="button primary wide" @click="$router.replace('/receipt')">
        <Icon name="receipt" />
        View receipt
        <Icon name="arrow" />
      </button>
    </div>
    <p class="success-footnote">Your digital receipt is ready to view.</p>
  </section>
</template>
