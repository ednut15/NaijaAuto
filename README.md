# NaijaAuto

Nigeria-focused auto marketplace MVP built with Next.js App Router + TypeScript.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Postgres/Auth/Storage)
- Paystack (featured listing payments)
- Termii (phone OTP)
- Resend (email notifications)

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run test:e2e
```

## Database

Supabase migration and seeds are in:

- `supabase/migrations/20260226153000_initial_schema.sql`
- `supabase/seed/001_locations.sql`

## Branching Strategy

Short-lived branches off `main` using `codex/*` prefix:

1. `codex/foundation` for schema/config setup
2. `codex/api-workflows` for services and API endpoints
3. `codex/ui-seo-tests` for pages, metadata, sitemap, and tests

Each branch is merged back to `main` after lint/test checks pass.
