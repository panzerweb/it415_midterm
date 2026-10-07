<script setup lang="ts">
defineProps<{ name: string; size?: number }>()
const paths: Record<string, string> = {
  coffee: 'M6 9h12v7a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V9Zm12 1h1a3 3 0 0 1 0 6h-1M9 2v3m5-3v3',
  sandwich: 'M3 17 12 4l9 13H3Zm0 0v4h18v-4M7 12h10M6 17l3-3 3 2 3-2 3 3',
  soda: 'M6 9h13l-2 12H8L6 9Zm-1-3h15M12 9l2-7h4M7 13h11',
  cookie:
    'M21 12a9 9 0 1 1-9-9 4 4 0 0 0 4 4 4 4 0 0 0 5 5ZM8 8h.01M7 14h.01m5 3h.01m0-6h.01m5 5h.01',
  water: 'M9 2h6v5l3 4v10H6V11l3-4V2Zm0 4h6M6 13h12M6 17h12',
  chocolate:
    'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm6 0v20M4 9h16M4 15h16',
  bag: 'M5 7h14l2 14H3L5 7Zm3 0V6a4 4 0 0 1 8 0v1',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  back: 'M20 12H4m6-6-6 6 6 6',
  trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
  check: 'm5 12 4 4L19 6',
  cash: 'M2 5h20v14H2V5Zm3 4h.01M19 15h.01M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  card: 'M2 5h20v14H2V5Zm0 5h20M6 15h4',
  qr: 'M3 3h6v6H3V3Zm12 0h6v6h-6V3ZM3 15h6v6H3v-6Zm12 0h2v2h-2v-2Zm4 0h2v6h-6v-2M12 3v3m0 6h3M3 12h5m4 3v6',
  receipt: 'M5 2h14v20l-3-2-4 2-4-2-3 2V2Zm4 5h6M9 11h6m-6 5h3',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  info: 'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  backspace: 'M9 4h13v16H9L2 12l7-8Zm3 5 6 6m-6 0 6-6',
}
</script>

<template>
  <svg
    :width="size ?? 24"
    :height="size ?? 24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] ?? paths.bag" />
  </svg>
</template>
