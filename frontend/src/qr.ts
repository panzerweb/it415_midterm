export function demoQrPayload(orderId: string, amountCentavos: number): string {
  return [
    'CAMPUS STORE - DEMO ORDER',
    `Order ID: ${orderId}`,
    `Amount: PHP ${(amountCentavos / 100).toFixed(2)}`,
    'Order details only. No payment is requested or verified.',
  ].join('\n')
}
