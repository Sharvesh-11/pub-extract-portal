# Apex AI Import Engine

An internal migration platform that imports an existing gym into the Apex ecosystem using AI.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Phase 1 Foundation

This project is currently in Phase 1. It acts as a generic AI Import Engine.
- The `Review workspace` will be implemented in future phases.
- OCR/Gemini integration currently relies on the initial foundation pipeline.

## Environment Variables

Copy `.env.local.example` to `.env.local` and populate:
- `GEMINI_API_KEY`: Google Generative AI API Key.
