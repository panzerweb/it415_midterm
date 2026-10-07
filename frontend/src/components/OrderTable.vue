<script setup lang="ts">
import { useCheckoutStore } from '../stores/checkout'
import { money } from '../money'
const store = useCheckoutStore()
</script>

<template>
  <div class="table-scroll">
    <table class="order-table">
      <thead>
        <tr>
          <th>Product</th>
          <th>Quantity</th>
          <th>Unit price</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="line in store.cart" :key="line.product.id">
          <td>{{ line.product.name }}</td>
          <td>{{ line.quantity }}</td>
          <td>{{ money(line.product.price_centavos) }}</td>
          <td>{{ money(line.product.price_centavos * line.quantity) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
