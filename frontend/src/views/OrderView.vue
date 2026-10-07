<script setup lang="ts">
import { computed } from 'vue'
import { useCheckoutStore } from '../stores/checkout'
import { money } from '../money'
import Icon from '../components/Icon.vue'

const store = useCheckoutStore()
const categories = ['All', 'Drinks', 'Food', 'Snacks']
const visibleProducts = computed(() =>
  store.products.filter(
    (product) => store.category === 'All' || product.category === store.category,
  ),
)
const quantity = (id: number) => store.cart.find((line) => line.product.id === id)?.quantity ?? 0
</script>

<template>
  <div class="order-layout">
    <section class="catalog" aria-labelledby="catalog-title">
      <div class="eyebrow">
        <span class="small-line"></span>
        A LITTLE PICK-ME-UP
      </div>
      <div class="catalog-heading">
        <div>
          <h1 id="catalog-title">What sounds good?</h1>
          <p class="muted">Tap something you love. We’ll take it from here.</p>
        </div>
        <span class="catalog-count">{{ store.products.length }} campus favorites</span>
      </div>
      <div class="categories" aria-label="Product categories">
        <button
          v-for="category in categories"
          :key="category"
          :class="{ selected: store.category === category }"
          :aria-pressed="store.category === category"
          @click="store.category = category"
        >
          {{ category }}
          <span v-if="category === 'All'">{{ store.products.length }}</span>
        </button>
      </div>
      <div v-if="store.loading" class="catalog-state" role="status">
        <span class="spinner"></span>
        Bringing out the good stuff…
      </div>
      <div v-else-if="store.catalogError" class="catalog-state error-state" role="alert">
        <Icon name="info" :size="36" />
        <h2>We couldn’t load the menu</h2>
        <p>{{ store.catalogError }}</p>
        <button class="button primary" @click="store.loadProducts">Retry menu</button>
      </div>
      <div v-else class="product-grid">
        <button
          v-for="product in visibleProducts"
          :key="product.id"
          class="product-card"
          :class="{ 'in-cart': quantity(product.id) > 0 }"
          :aria-label="`Add ${product.name}`"
          @click="store.add(product)"
        >
          <div class="product-art" :class="`art-${product.icon}`">
            <span class="art-circle"></span>
            <Icon :name="product.icon" :size="78" />
            <span v-if="quantity(product.id)" class="quantity-badge">
              {{ quantity(product.id) }}
            </span>
            <span v-else class="product-add"><Icon name="plus" :size="19" /></span>
          </div>
          <div class="product-meta">
            <span class="product-category">{{ product.category }}</span>
            <div class="product-bottom">
              <h2>{{ product.name }}</h2>
              <span class="product-price">{{ money(product.price_centavos) }}</span>
            </div>
          </div>
        </button>
      </div>
      <div class="catalog-note">
        <Icon name="info" :size="17" />
        Made for quick breaks and busy days.
      </div>
    </section>

    <aside class="cart-panel" aria-labelledby="cart-title">
      <div class="cart-heading">
        <div class="cart-title">
          <Icon name="bag" :size="24" />
          <h2 id="cart-title">Your order</h2>
        </div>
        <span class="count-pill">
          {{ store.itemCount }} {{ store.itemCount === 1 ? 'item' : 'items' }}
        </span>
      </div>
      <p class="cart-intro">A good break starts here.</p>
      <div v-if="!store.cart.length" class="empty-cart">
        <div class="empty-cart-icon">
          <Icon name="bag" :size="44" />
          <span>+</span>
        </div>
        <h3>Room for something good</h3>
        <p>
          Tap a product on the menu
          <br />
          to start your order.
        </p>
      </div>
      <div v-else class="cart-items">
        <article v-for="line in store.cart" :key="line.product.id" class="cart-item">
          <div class="cart-item-top">
            <div>
              <h3>{{ line.product.name }}</h3>
              <span class="muted">{{ money(line.product.price_centavos) }} each</span>
            </div>
            <button
              class="icon-button remove"
              :aria-label="`Remove ${line.product.name}`"
              @click="store.remove(line.product.id)"
            >
              <Icon name="trash" :size="18" />
            </button>
          </div>
          <div class="cart-item-bottom">
            <div class="quantity-control">
              <button
                :aria-label="`Decrease ${line.product.name}`"
                @click="store.adjust(line.product.id, -1)"
              >
                <Icon name="minus" :size="17" />
              </button>
              <span :aria-label="`${line.product.name} quantity`">{{ line.quantity }}</span>
              <button
                :aria-label="`Increase ${line.product.name}`"
                @click="store.adjust(line.product.id, 1)"
              >
                <Icon name="plus" :size="17" />
              </button>
            </div>
            <strong>{{ money(line.product.price_centavos * line.quantity) }}</strong>
          </div>
        </article>
      </div>
      <div class="cart-checkout">
        <div class="total-row">
          <span>
            Total amount
            <small>
              {{ store.itemCount }} {{ store.itemCount === 1 ? 'item' : 'items' }} in your order
            </small>
          </span>
          <strong data-testid="cart-total">{{ money(store.total) }}</strong>
        </div>
        <button
          class="button primary wide"
          :disabled="!store.cart.length"
          @click="$router.push('/review')"
        >
          Review order
          <Icon name="arrow" :size="22" />
        </button>
        <p class="checkout-note">Review your items before payment</p>
      </div>
    </aside>
  </div>
</template>
