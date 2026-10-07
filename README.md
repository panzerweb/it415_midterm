# Campus Store POS Kiosk

A touchscreen campus-store checkout built with Vue 3, TypeScript, Vue Router, Pinia, FastAPI, SQLModel, and SQLite. The design follows the supplied navy/orange sample and uses the six example products and prices.

**Flow:** Select items → Review order → Choose payment → Process payment → Success → Receipt → New transaction.

All payment methods are demonstrations. QR and card payments do not contact a bank, charge money, or collect card details.

## Run locally on Windows

Install **Node.js 22.12+ (or a newer supported LTS)** and **Python 3.11+**. Run the following from the project root in PowerShell. An internet connection is needed for initial dependency installation; the running app uses only local assets and services.

### First-time setup

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-lock.txt
cd frontend
npm.cmd ci
cd ..
```

### Terminal 1 — backend

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Terminal 2 — frontend

```powershell
cd frontend
npm.cmd run dev
```

Open **http://127.0.0.1:5173**. The frontend proxies `/api` to the backend on port 8000. Interactive API documentation is available at **http://127.0.0.1:8000/docs**. Keep both terminals running; stop each with Ctrl+C. No virtual-environment activation is necessary.

If Python dependency installation reports a Windows temporary-folder permission error, retry in a normal terminal outside a restricted sandbox. If the menu cannot load, confirm the backend terminal is running without errors, then choose **Retry menu**.

## Using the kiosk

1. Tap product cards to add items; use category filters if desired.
2. Adjust quantities with +/−, or remove an item. Decreasing from one removes the item. The maximum is 99 of each product.
3. Review the order and go back to make changes if needed.
4. Choose Cash, QR Payment, or Credit / Debit Card.
5. For cash, use the keypad, keyboard, Exact, or a quick amount. Invalid or insufficient cash stays on the payment screen with an explanation. For QR/card, use the simulation confirmation button.
6. View the successful payment and digital receipt.
7. Choose **New transaction** to clear the current customer’s order, payment inputs, and receipt.

The cart lives in memory. Refreshing the browser starts a fresh kiosk session, while completed transactions remain in SQLite. During a network failure, retry the existing payment before refreshing: the retry safely checks the original request rather than creating another sale.

## Project structure

```text
backend/
  app/main.py          API, database initialization, checkout transaction
  app/models.py        Database models and request/receipt contracts
  tests/               API validation, persistence and retry tests
frontend/
  src/components/      Shared local SVG icons and order table
  src/views/           Order, review, payment, success and receipt screens
  src/stores/          Pinia checkout state and unit tests
  src/router.ts        Checkout route guards
  src/api.ts           HTTP requests, timeouts and error handling
  src/money.ts         Exact decimal input parsing and peso formatting
  tests/               Playwright browser journeys
docs/                  Original instructions and verification notes
```

## Data and API

SQLite is a good fit for a local single-kiosk demonstration: it persists receipts in one file without a separate database service. SQLModel keeps the schema and queries small and explicit. The default database is `backend/campus-store.db`, created automatically at startup. Missing seed products are inserted; existing records are not overwritten. The database and virtual environment are ignored by Git.

An optional `DATABASE_URL` environment variable can select another SQLite file. Its parent directory must already exist. The default runtime database is separate from the test databases.

`requirements-lock.txt` records the tested backend dependencies; `requirements.txt` and `requirements-dev.txt` declare the direct runtime and development dependencies. The frontend's `package-lock.json` supplies reproducible npm installs.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/products` | Read six seeded products, categories, icon keys, and integer-centavo prices. |
| `POST /api/checkout` | Validate and persist a completed purchase; return its receipt. |
| `GET /api/transactions/{reference}` | Read a saved receipt; return 404 for unknown references. |

Example cash checkout:

```json
{
  "request_id": "a6a2d9ea-76cb-4fda-8ddd-3acdbd24bac8",
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 2, "quantity": 1 },
    { "product_id": 3, "quantity": 1 }
  ],
  "payment_method": "cash",
  "amount_paid_centavos": 20000
}
```

Use `qr` or `card` and omit `amount_paid_centavos` for the simulations. Each new purchase needs a new UUID `request_id`. An identical request ID and payload returns the original receipt; changing the payload with the same ID returns 409.

- All monetary values are integer centavos: `17500` means ₱175.00. The backend calculates totals from its catalog rather than trusting a client total.
- Invalid requests return 422 and create no transaction. Cash must cover the total. QR/card use the total as amount paid and zero change.
- A single database transaction saves the purchase and its line items. Receipt lines snapshot the purchased name and price.
- Receipt timestamps are stored as UTC and displayed in Asia/Manila time (PHT).
- A timeout or server failure retains the exact request for retry and temporarily locks order edits. Double-tapping a payment button cannot start parallel submissions.
- The demo has no login, inventory, admin UI, reports, discounts, real payment gateway, or receipt printing. Bind it to localhost as documented.

## Tests and build

Backend:

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest -q
```

Frontend unit tests and production build:

```powershell
cd frontend
npm.cmd test
npm.cmd run build
```

Browser tests (stop the normal frontend/backend servers first so ports 5173 and 8000 are free):

```powershell
cd frontend
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Playwright starts both services automatically and uses a separate ignored `backend/e2e.db`. Its HTML report is in `frontend/playwright-report`. Backend tests use temporary SQLite databases. An optional `KIOSK_PYTHON` environment variable selects a Python executable instead of the root `.venv`.

To inspect the production build locally, keep the backend running and use `npm.cmd run preview` from `frontend`, then open the URL it prints. The preview server also proxies `/api` to port 8000.

## Group workflow

The local repository contains 12 commits, including the initial setup, with four commits assigned to each supplied contributor identity. Three retained feature branches were integrated into `main` using fast-forward merges.

This history was reconstructed from the existing application files at the user's request, with a new API error-handling fix and regression tests. Author identities and timestamps are assigned metadata; they do not establish who originally wrote the imported files or when that work happened. GitHub publishing, reviews, and instructor sign-off remain the group's responsibility.
