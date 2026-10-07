<script setup lang="ts">
import { useCheckoutStore } from '../stores/checkout'
import { money } from '../money'
import OrderTable from '../components/OrderTable.vue'
import Icon from '../components/Icon.vue'
const store = useCheckoutStore()
</script>

<template>
  <section class="flow-page">
    <div class="eyebrow">
      <span class="small-line"></span>
      ONE QUICK LOOK
    </div>
    <h1>Everything look good?</h1>
    <p class="page-intro">Review your order. You can always go back for one more thing.</p>
    <div class="review-card">
      <div class="section-heading">
        <h2>Your order summary</h2>
        <span class="count-pill">{{ store.itemCount }} items</span>
      </div>
      <OrderTable />
      <div class="review-total">
        <div>
          <span>Total amount</span>
          <p>No surprises. Just your favorites.</p>
        </div>
        <strong>{{ money(store.total) }}</strong>
      </div>
    </div>
    <div class="page-actions">
      <button class="button secondary" @click="$router.push('/')">
        <Icon name="back" />
        Back to order
      </button>
      <button class="button primary" @click="$router.push('/payment')">
        Continue to payment
        <Icon name="arrow" />
      </button>
    </div>
  </section>
</template>
