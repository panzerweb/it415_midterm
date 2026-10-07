<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCheckoutStore } from './stores/checkout'
import Icon from './components/Icon.vue'

const route = useRoute()
const store = useCheckoutStore()
const steps = ['Order', 'Review', 'Payment', 'Receipt']
const activeStep = computed(
  () => ({ order: 0, review: 1, payment: 2, success: 3, receipt: 3 })[String(route.name)] ?? 0,
)
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout>
watch(
  () => store.notice,
  (message) => {
    clearTimeout(toastTimer)
    toast.value = message
    if (message)
      toastTimer = setTimeout(() => {
        toast.value = ''
        store.notice = ''
      }, 3800)
  },
)
watch(
  () => route.name,
  () => {
    document.title = `${String(route.name ?? 'Order').replace(/^./, (c) => c.toUpperCase())} · Campus Store`
    if (route.name !== 'order') store.notice = ''
  },
)
onMounted(() => store.loadProducts())
</script>

<template>
  <header class="site-header">
    <div class="brand">
      <div class="brand-mark"><Icon name="coffee" :size="28" /></div>
      <div>
        <div class="brand-name">
          Campus Store
          <span class="brand-dot">.</span>
        </div>
        <div class="brand-subtitle">SELF-SERVICE KIOSK</div>
      </div>
    </div>
    <nav class="steps" aria-label="Checkout progress">
      <div
        v-for="(step, index) in steps"
        :key="step"
        class="step"
        :class="{ active: activeStep === index, done: activeStep > index }"
        :aria-current="activeStep === index ? 'step' : undefined"
      >
        <span class="step-number">
          <Icon v-if="activeStep > index" name="check" :size="16" />
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span>{{ step }}</span>
      </div>
    </nav>
    <div class="header-status">
      <span></span>
      Your campus. Your corner.
    </div>
  </header>
  <main><RouterView /></main>
  <Transition name="toast">
    <div v-if="toast" class="toast" role="status">
      <span class="toast-check"><Icon name="check" :size="18" /></span>
      {{ toast }}
    </div>
  </Transition>
  <footer class="site-footer">
    <span>
      CAMPUS STORE
      <span class="footer-divider">/</span>
      GOOD THINGS, CLOSE BY.
    </span>
    <span>
      Local kiosk
      <span class="footer-divider">·</span>
      Payments are simulated
    </span>
  </footer>
</template>
