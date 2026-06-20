# AI Property Decision Assistant

## Overview

AI Property Decision Assistant is a full-stack property underwriting tool that helps real estate investors decide whether a deal deserves more diligence. The app combines a React + Vite client with a Node + Express API that produces deterministic deal analysis by default and can optionally add an AI-written note when an OpenAI API key is configured.

This tool is for early investment screening. It is not financial, legal, tax, or lending advice. Always validate assumptions with licensed professionals and current market data before making an offer.

## Features

- Property input workflow for price, estimated value, rent, expenses, financing, repairs, vacancy, neighborhood strength, risk tolerance, and investment goal.
- PostgreSQL persistence for saved property records, recommendations, and analysis history.
- Recent history workflow for reloading saved analyses and restoring prior input snapshots.
- Decision score with Strong Buy, Watch Closely, or Pass guidance.
- Cash flow, cap rate, cash-on-cash return, mortgage estimate, risk notes, and next steps.
- Server-side validation rejects unsafe or impossible deal assumptions with a clear 400 response.
- Friendly local development port fallback from `5000` to `5001`, `5002`, and `5003`.
- Optional OpenAI enhancement without making the app dependent on paid credentials.

## Architecture

```text
ai-property-decision-assistant/
|-- client/              # React + Vite frontend
|   |-- src/
|   |   |-- App.jsx      # Main underwriting UI
|   |   `-- styles.css   # Responsive app styling
|   `-- vite.config.js   # Dev server and API proxy config
|-- server/              # Node + Express backend
|   |-- controllers/     # Request handlers
|   |-- db/              # PostgreSQL pool, migrations, and SQL files
|   |-- repositories/    # Persistence queries for properties and history
|   |-- routes/          # API route definitions
|   |-- services/        # Deal scoring, validation, optional AI note
|   `-- server.js        # Express app startup and port fallback
|-- screenshots/         # Screenshot placeholders
|-- .env.example         # Local environment variable template
`-- README.md
```

The frontend submits property assumptions to the Express API. The backend validates the request, calculates deal metrics, adds an optional AI memo only when `OPENAI_API_KEY` is configured, and saves each valid analysis to PostgreSQL. Invalid requests return `400` and are not persisted.

Production uses split hosting:

- `npm start` starts the backend API only.
- The frontend should be built with `npm run build` and hosted separately from `client/dist`.
- The API should be deployed separately as a Node service running the Express server in `server/`.
- Configure the frontend host to send API requests to the deployed Node API URL.

## Installation

Requirements:

- Node.js 18 or newer
- npm
- PostgreSQL database reachable by `DATABASE_URL`

Install dependencies:

```bash
npm install
npm run install:all
```

Optional environment setup:

```bash
cp .env.example server/.env
```

Example environment values:

```bash
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ai_property_decision_assistant
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

The app works without `OPENAI_API_KEY`; the server returns local deterministic analysis plus a note explaining that AI enhancement is disabled. PostgreSQL is required for saved analyses because every valid analysis is persisted.

Run database migrations after configuring `DATABASE_URL`:

```bash
npm --prefix server run db:migrate
```

## Usage

Start the full local development app:

```bash
npm run dev
```

The client runs at `http://localhost:5173` and proxies API calls to `http://localhost:5000`.

During local development, the API starts on port `5000` by default. If port `5000` is already in use, the server prints a friendly warning and automatically tries `5001`, then `5002`, then `5003`. If all fallback ports are busy, it exits with a clear message so you can stop another server or set `PORT` to an open port. The client tries the normal proxied API route first, then the same local fallback API ports.

Useful scripts:

```bash
npm run dev        # server and client together
npm run build      # build the React client
npm run start      # start the Express API only
npm run test       # run server unit tests
npm --prefix server run db:migrate  # apply PostgreSQL migrations
```

API endpoints:

- `GET /api/health` returns service status.
- `POST /api/analyze-property` returns score, recommendation, metrics, risks, next steps, optional AI note, and saved record IDs.
- `GET /api/properties` returns saved property records with their latest recommendation summary.
- `GET /api/properties/:propertyId/analysis-history` returns saved analyses for one property in chronological history order.
- `GET /api/analysis-history/:analysisId` returns one saved result and its original input snapshot.

Example analysis request:

```json
{
  "address": "742 Magnolia Ave, Tampa, FL",
  "propertyType": "Single-family rental",
  "purchasePrice": 365000,
  "estimatedValue": 385000,
  "downPayment": 73000,
  "interestRate": 6.75,
  "loanTermYears": 30,
  "monthlyRent": 2850,
  "monthlyExpenses": 920,
  "repairCost": 18000,
  "vacancyRate": 6,
  "neighborhoodScore": 78,
  "riskTolerance": "Moderate",
  "goal": "Balanced cash flow and appreciation"
}
```

Numeric deal inputs are validated before analysis. Invalid, missing, `NaN`, `Infinity`, negative, out-of-range, or impossible values return a clear `400` response instead of producing unsafe metrics.

Valid analysis requests are saved in three PostgreSQL-backed records:

- `properties` stores one deduplicated property per normalized address and property type, along with the latest editable assumptions.
- `analysis_history` stores every full input snapshot plus metrics, risks, and next steps.
- `recommendations` stores the recommendation, score, summary, and AI note linked to one analysis.

This improves the project by turning a one-off underwriting calculator into a repeatable decision system: investors can revisit saved deals, compare prior analysis runs, and restore assumptions without retyping them.

## Screenshot Section

### Home and Property Inputs

<p>
  <img src="./screenshots/app-home.png" alt="AI Property Decision Assistant home screen with hero, property inputs, and decision brief" width="720">
</p>

### Completed Analysis Results

<p>
  <img src="./screenshots/results-view.png" alt="AI Property Decision Assistant completed property analysis with score, metrics, risks, and next steps" width="720">
</p>

Screenshots are stored in the `screenshots/` folder.

```text
screenshots/
|-- app-home.png       # main app screen
`-- results-view.png   # analyzed property result
```

## Future Improvements

- Add user accounts and saved deal history.
- Add downloadable PDF investment summaries.
- Compare multiple properties side by side.
- Add charts for cash flow, equity, and return projections.
- Add configurable underwriting assumptions by investment strategy.

## J Capital Inspiration Section

This project is inspired by the idea of a J Capital-style property decision system: a simple operating tool that helps organize real estate deal inputs, reduce guesswork, and turn property analysis into a repeatable workflow. The goal is to support faster first-pass decisions while still reminding users to verify numbers before making real investment choices.

## Author

Olabode Moses Jimoh

