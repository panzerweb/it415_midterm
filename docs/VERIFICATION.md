# Application verification

Verified on October 7, 2026 on Windows with Node.js 22.19.0, Python 3.13.7, and Playwright Chromium. This records application checks; GitHub contributions and instructor sign-off remain the group's responsibility.

## Automated results

| Check | Result |
| --- | --- |
| Backend: `python -m pytest -q` | 26 passed |
| Frontend state: `npm.cmd test` | 29 passed |
| Browser acceptance: `npm.cmd run test:e2e` | 8 passed |
| Production: `npm.cmd run build` | TypeScript check and Vite build passed |
| Dependency audit after the Vitest update | 0 reported npm vulnerabilities |

The backend test run reports one upstream Starlette/httpx deprecation warning; it does not fail the tests. The browser tests start a real FastAPI server and use a separate SQLite database, rather than mocking successful payments.

## Requirement coverage

| Required behavior | Evidence |
| --- | --- |
| Application starts and displays six products with prices | API catalog test, browser journeys, desktop/phone visual review |
| Touchscreen-oriented layout, large cards and buttons | Desktop 1440 × 1000 and phone 390 × 844 screenshots; phone payment controls checked for at least 48px height |
| Tap selection, quantity increase/decrease, item removal | Cart unit tests and cash browser journey |
| Correct item subtotals and total | Coffee ×2 + Sandwich + Soft Drink = ₱175; increasing Coffee gives ₱220; removing Soft Drink from the original gives ₱140 |
| Order summary and Back preserve items | Cash browser journey |
| Three payment methods | Cash, QR and card browser journeys |
| Cash validation and change | Invalid, empty, negative and insufficient amounts rejected; ₱200 paid for ₱175 gives ₱25; exact payment gives ₱0 change |
| QR placeholder, instructions and confirmation | QR browser journey |
| Card instructions and visible processing state | Card browser journey |
| Successful payment screen and unique reference | All payment journeys plus API reference uniqueness tests |
| View Receipt and correct transaction details | Browser receipt assertions and API snapshot tests |
| Correct payment method on receipt | All three browser payment journeys |
| New Transaction clears customer state | Cash browser journey and reset unit test |
| Meaningful errors and feedback | Insufficient cash, failed menu load, network failure and retry checks |
| Saved receipts persist | Backend restart test; changed catalog names/prices do not alter saved receipt lines |
| Invalid requests do not create successful transactions | API validation tests assert no saved transactions or line items |
| Repeated payment submission cannot duplicate a sale | Frontend in-flight submission test, backend concurrent retry test, and browser lost-response test |
| Refresh starts a fresh session and protected steps cannot be skipped | Browser route-guard/refresh test |

## Visual review

Inspected full-page captures of product selection, cash payment, and receipt at desktop and phone widths. Product cards, cart controls, keypad, receipts, and reset controls render without horizontal page overflow in the tested phone journey. Larger receipt text and clearing order notifications on navigation were applied after the first review.

Screenshots are generated inside the ignored `frontend/test-results` directory by the desktop cash and phone tests. Playwright writes its report to `frontend/playwright-report`. Rerunning selected tests replaces the previous report.

## Demonstration checklist

1. Start the backend and frontend using the README.
2. Run through the supplied acceptance checklist with cash, QR, and card.
3. Demonstrate the ₱175 order, insufficient cash, ₱200 payment/₱25 change, receipt, and clean reset.
4. Demonstrate exact cash and the QR/card zero-change receipts.
5. Inspect the local commit count, authors, dates, and retained feature branches with Git. Have the group separately record actual GitHub development, review, and contribution evidence.

The history preparation reran the backend tests, frontend unit tests, production build, and browser acceptance tests. Four added frontend cases check that unexpected HTTP 422 response bodies retain their status and unlock rejected payments for correction.

Browser verification was performed with automated interactions and screenshot inspection; physical touchscreen hardware was not used.
