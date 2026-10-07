import { test, expect, type Page } from '@playwright/test'

async function order(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Coffee', exact: true }).click({ clickCount: 2 })
  await page.getByRole('button', { name: 'Add Sandwich', exact: true }).click()
  await page.getByRole('button', { name: 'Add Soft Drink', exact: true }).click()
  await expect(page.getByTestId('cart-total')).toHaveText('₱175.00')
}

async function payment(page: Page) {
  await order(page)
  await page.getByRole('button', { name: 'Review order', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Everything look good?' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue to payment' }).click()
}

test('cash journey, quantity changes, review back, invalid values, receipt and reset', async ({
  page,
}) => {
  await order(page)
  await page.screenshot({ path: test.info().outputPath('order-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Increase Coffee' }).click()
  await expect(page.getByTestId('cart-total')).toHaveText('₱220.00')
  await page.getByRole('button', { name: 'Decrease Coffee' }).click()
  await page.getByRole('button', { name: 'Remove Soft Drink' }).click()
  await expect(page.getByTestId('cart-total')).toHaveText('₱140.00')
  await page.getByRole('button', { name: 'Review order', exact: true }).click()
  await page.getByRole('button', { name: 'Back to order' }).click()
  await expect(page.getByTestId('cart-total')).toHaveText('₱140.00')
  await page.getByRole('button', { name: 'Add Soft Drink', exact: true }).click()
  await page.getByRole('button', { name: 'Review order', exact: true }).click()
  await page.getByRole('button', { name: 'Continue to payment' }).click()
  await page.getByRole('button', { name: /^Cash Enter/ }).click()
  for (const value of ['', '-10', 'bad', '12.345']) {
    await page.getByLabel('Amount paid', { exact: true }).fill(value)
    await page.getByRole('button', { name: 'Pay now', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Enter a valid cash amount')
  }
  await page.getByLabel('Amount paid', { exact: true }).fill('100')
  await page.getByRole('button', { name: 'Pay now', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Insufficient payment')
  await expect(page).toHaveURL(/payment$/)
  await page.getByRole('button', { name: '₱200', exact: true }).click()
  await expect(page.locator('.change-row')).toContainText('₱25.00')
  await page.screenshot({ path: test.info().outputPath('cash-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Pay now', exact: true }).click()
  await expect(page).toHaveURL(/success$/)
  await expect(page.getByText('Payment successful. Thanks for stopping by!')).toBeVisible()
  await page.getByRole('button', { name: 'View receipt' }).click()
  await expect(page.locator('.receipt-paper')).toContainText('₱175.00')
  await expect(page.locator('.receipt-paper')).toContainText('₱200.00')
  await expect(page.locator('.receipt-paper')).toContainText('₱25.00')
  await expect(page.locator('.receipt-paper')).toContainText('Cash')
  await page.screenshot({ path: test.info().outputPath('receipt-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'New transaction' }).click()
  await expect(page.getByTestId('cart-total')).toHaveText('₱0.00')
  await expect(page.getByRole('button', { name: 'Review order', exact: true })).toBeDisabled()
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
})

for (const method of ['qr', 'card'] as const) {
  test(`${method} payment journey`, async ({ page }) => {
    await payment(page)
    await page
      .getByRole('button', {
        name: method === 'qr' ? /^QR payment A quick/ : /^Credit \/ debit card Tap/,
      })
      .click()
    if (method === 'qr')
      await expect(page.getByText('QR PLACEHOLDER', { exact: true })).toBeVisible()
    await page
      .getByRole('button', {
        name: method === 'qr' ? 'Confirm payment' : 'Process payment',
        exact: true,
      })
      .click()
    if (method === 'card')
      await expect(page.getByRole('status').filter({ hasText: 'Processing payment' })).toBeVisible()
    await expect(page).toHaveURL(/success$/)
    await page.getByRole('button', { name: 'View receipt' }).click()
    await expect(page.locator('.receipt-paper')).toContainText(
      method === 'qr' ? 'QR Payment' : 'Credit / Debit Card',
    )
    await expect(page.locator('.receipt-paper')).toContainText('₱0.00')
    await expect(page.locator('.receipt-total')).toContainText('₱175.00')
  })
}

test('exact cash payment', async ({ page }) => {
  await payment(page)
  await page.getByRole('button', { name: /^Cash Enter/ }).click()
  await page.getByRole('button', { name: 'Exact', exact: true }).click()
  await page.getByRole('button', { name: 'Pay now', exact: true }).click()
  await expect(page).toHaveURL(/success$/)
  await expect(page.locator('.details-list')).toContainText('₱0.00')
})

test('lost response safely retries a committed payment', async ({ page }) => {
  await payment(page)
  await page.getByRole('button', { name: /^Cash Enter/ }).click()
  await page.getByRole('button', { name: 'Exact', exact: true }).click()
  let originalRequest = ''
  let savedReference = ''
  let calls = 0
  await page.route('**/api/checkout', async (route) => {
    calls++
    if (calls === 1) {
      originalRequest = route.request().postData()!
      const response = await route.fetch()
      savedReference = (await response.json()).reference
      await route.abort('failed')
    } else {
      expect(route.request().postData()).toBe(originalRequest)
      await route.continue()
    }
  })
  await page.getByRole('button', { name: 'Pay now', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Retry this same payment')
  await expect(page.getByRole('button', { name: 'Change payment method' })).toBeDisabled()
  await expect(page.getByLabel('Amount paid', { exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Retry payment', exact: true }).click()
  await expect(page).toHaveURL(/success$/)
  await expect(page.getByText(savedReference, { exact: true })).toBeVisible()
})

test('fresh session guards and refreshing clears active state', async ({ page }) => {
  for (const route of ['/review', '/payment', '/success', '/receipt']) {
    await page.goto(route)
    await expect(page).toHaveURL(/\/$/)
  }
  await order(page)
  await page.getByRole('button', { name: 'Review order', exact: true }).click()
  await page.reload()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId('cart-total')).toHaveText('₱0.00')
})

test('menu error is recoverable', async ({ page }) => {
  await page.route('**/api/products', (route) => route.abort())
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'We couldn’t load the menu' })).toBeVisible()
  await page.unroute('**/api/products')
  await page.getByRole('button', { name: 'Retry menu' }).click()
  await expect(page.getByRole('button', { name: /^Add / })).toHaveCount(6)
})

test('touch layout at phone width, categories and keypad', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('button', { name: /^Add / })).toHaveCount(6)
  await page.screenshot({ path: test.info().outputPath('order-phone.png'), fullPage: true })
  await page.getByRole('button', { name: 'Drinks', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Add / })).toHaveCount(3)
  await page.getByRole('button', { name: 'Add Coffee', exact: true }).click()
  await page.getByRole('button', { name: 'Review order', exact: true }).click()
  await page.getByRole('button', { name: 'Continue to payment' }).click()
  await page.getByRole('button', { name: /^Cash Enter/ }).click()
  for (const digit of ['5', '0', 'Decimal point', '5', '0'])
    await page.getByRole('button', { name: digit, exact: true }).click()
  await expect(page.getByLabel('Amount paid', { exact: true })).toHaveValue('50.50')
  await expect(page.locator('.change-row')).toContainText('₱5.50')
  await page.screenshot({ path: test.info().outputPath('cash-phone.png'), fullPage: true })
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(overflow).toBe(false)
  const targets = await page
    .locator('button:visible')
    .evaluateAll((buttons) =>
      buttons.every((button) => button.getBoundingClientRect().height >= 48),
    )
  expect(targets).toBe(true)
  await page.getByRole('button', { name: 'Pay now', exact: true }).click()
  await page.getByRole('button', { name: 'View receipt' }).click()
  await expect(page.locator('.receipt-paper')).toContainText('₱5.50')
  await page.screenshot({ path: test.info().outputPath('receipt-phone.png'), fullPage: true })
})
