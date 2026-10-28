# Digital Invoice Generator for Small Businesses

Application name: **Vyapar Invoice**.

MCA Semester III mini project by **Atul Kumar Kaushik**, roll no. **32524000181**. Supervisor: **Ms. Shreyi Mittal**. Session **2025–2026**, Batch **3**.

A React, Express and MongoDB application for Indian small businesses. Create GST/non-GST invoices, preview them, download text-based multipage PDFs, and revisit saved invoices. No account or email features are included in the approved scope.

## Run locally

Requires Node.js 22.12+ and MongoDB Community Server or an accessible MongoDB connection.

```sh
npm install
cp .env.example .env
npm run dev
```

The example configuration enables `LOCAL_MONGODB=true`. This starts a real local MongoDB process automatically and keeps records in `.data/mongodb` between restarts. The first run downloads a MongoDB binary if it is not cached. Do not delete `.data` if you need your saved invoices. Open http://127.0.0.1:5173. Express runs on port 4000. Keep credentials out of Git.

To use an independently installed MongoDB or an external database, set `LOCAL_MONGODB=false` and set `MONGODB_URI` in `.env` to its connection string.

### Connect the configured Atlas cluster

Run `npm run setup:atlas` in an interactive terminal and enter the password for `vyapar_app` when prompted. The password is hidden and URL-encoded automatically. The helper verifies the cloud connection before writing the private `.env` and switching off local MongoDB. The development server restarts automatically. Local records are preserved on disk and are not migrated automatically. Atlas currently permits only the configured laptop IP; a deployed backend needs its own network access configuration.

Without MongoDB, the application clearly shows a database notice: create, preview and PDF download work, but saved history requires a connected database. There is no silent browser-storage substitute.

For an isolated temporary demonstration only:

```sh
USE_MEMORY_DB=true npm run dev
```

This uses a real temporary MongoDB process and downloads a binary on first use. All demo records disappear when the process stops. Do not use this mode for business records.

## Build and verify

```sh
npm test
npm run build
npm start
```

The production Express server serves `client/dist`. Open http://127.0.0.1:4000. The default server binds to loopback for a local single-business deployment. This project has no authentication; add authentication and access controls before making it accessible publicly. For separate Vercel/Railway deployment, configure frontend `/api` rewrites to the Express host and provide an external MongoDB URI; static frontend hosting alone does not run the backend.

## Structure

- `client/src/main.jsx`: navigation, form, dashboard, history, preview.
- `client/src/pdf.js`: downloadable PDF using jsPDF and AutoTable.
- `client/src/style.css`: responsive interface.
- `shared/invoice.js`: schemas, Indian states, formatting and integer-paise calculations.
- `server/app.js`: API routes and MongoDB models.
- `server/index.js`: local server and database startup.
- `tests/`: calculation, validation and API checks.
- `docs/`: approved scope and report material.

## Calculation rules

Line amount = rounded(quantity × unit price in paise). With GST enabled, same-state supply applies half of the selected rate to CGST and SGST individually, rounded per line; interstate supply applies the full rate as IGST. Total is the sum of rounded line amounts and taxes. This rounding can differ by one paisa from rounding only an invoice-level tax aggregate. Rates are selected by the operator, not inferred from product names. Prices exclude tax. Zero-rated and non-GST invoices are supported. The app does not implement e-invoice IRN, QR codes, GST filing or legal compliance certification.

Invoice numbers are unique and sequential within an Indian financial year, e.g. `INV/26-27/00001`. A failed save may leave a gap. Saved invoices retain their original business/customer/item snapshots; changing a new invoice does not alter old records. Downloading without saving produces a clearly marked preview. PDF uses `INR` for reliable built-in font rendering; the interface uses ₹.

## API

| Method | Path | Result |
|---|---|---|
| GET | `/api/health` | Server/database health |
| POST | `/api/invoices` | Validate, recalculate, number and save |
| GET | `/api/invoices` | Latest 1,000 saved invoices |
| GET | `/api/invoices/:id` | Retrieve one saved invoice |

The API discards client-supplied totals and calculates its own. Request bodies are capped at 200 KB, and invoice inputs have size/range constraints. Invoice records are immutable through the provided API.

## Reference

[John Uberbacher's invoice-generator](https://github.com/johnuberbacher/invoice-generator) was reviewed via its README and package manifest for the basic invoice/PDF workflow. This implementation is independently authored; reference code is not copied. See `docs/APPROVED_SCOPE.md` for scope and report requirements.
