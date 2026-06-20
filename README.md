# AI Property Decision Assistant

A full-stack property underwriting assistant that helps investors decide whether a deal deserves more diligence. The app combines a React + Vite client with a Node + Express API that produces deterministic deal analysis by default and can optionally add an AI-written note when an OpenAI API key is configured.

## Features

- Property input workflow for price, rent, expenses, financing, repairs, neighborhood strength, risk tolerance, and investment goal.
- Decision score with Strong Buy, Watch Closely, or Pass guidance.
- Cash flow, cap rate, cash-on-cash return, mortgage estimate, risk notes, and next steps.
- Express API with health and property analysis endpoints.
- Server-side validation rejects unsafe or impossible deal assumptions with a 400 response.
- Optional OpenAI enhancement without making the app dependent on paid credentials.

## Tech Stack

- React 19
- Vite 6
- Node.js
- Express
- Lucide React icons

## Screenshots

Screenshots can be added to the `screenshots/` folder after the app is running.

```text
screenshots/
|-- app-home.png      # placeholder for the main app screen
`-- app-results.png   # placeholder for an analyzed property result
```

## Getting Started

```bash
npm install
npm run install:all
npm run dev
```

The client runs at `http://localhost:5173` and proxies API calls to `http://localhost:5000`.

## Production Hosting

This project uses split hosting:

- `npm start` starts the backend API only.
- The frontend should be built with `npm run build` and hosted separately from `client/dist` on a static host.
- The API should be deployed separately as a Node service running the Express server in `server/`.
- Configure the frontend host to send API requests to the deployed Node API URL.

## API

### `GET /api/health`

Returns service status.

### `POST /api/analyze-property`

Example request:

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

## Environment

Copy `.env.example` into `server/.env` if you want local environment variables.

```bash
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

The app works without `OPENAI_API_KEY`; the server returns local deterministic analysis plus a note explaining that AI enhancement is disabled.

## Scripts

```bash
npm run dev        # server and client together
npm run build      # build the React client
npm run start      # start the Express API only
npm run test       # run server unit tests
```

## Notes

This tool is for early investment screening. It is not financial, legal, tax, or lending advice. Always validate assumptions with licensed professionals and current market data before making an offer.
