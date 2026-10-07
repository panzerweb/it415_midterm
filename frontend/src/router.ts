import { createRouter, createWebHistory } from 'vue-router'
import { useCheckoutStore } from './stores/checkout'
import OrderView from './views/OrderView.vue'
import ReviewView from './views/ReviewView.vue'
import PaymentView from './views/PaymentView.vue'
import SuccessView from './views/SuccessView.vue'
import ReceiptView from './views/ReceiptView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'order', component: OrderView },
    { path: '/review', name: 'review', component: ReviewView },
    { path: '/payment', name: 'payment', component: PaymentView },
    { path: '/success', name: 'success', component: SuccessView },
    { path: '/receipt', name: 'receipt', component: ReceiptView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const store = useCheckoutStore()
  if (store.locked && to.name !== 'payment') return { name: 'payment', replace: true }
  if (['success', 'receipt'].includes(String(to.name)) && !store.receipt)
    return { name: 'order', replace: true }
  if (store.receipt && !['success', 'receipt'].includes(String(to.name)))
    return { name: 'receipt', replace: true }
  if (['review', 'payment'].includes(String(to.name)) && !store.cart.length)
    return { name: 'order', replace: true }
})
