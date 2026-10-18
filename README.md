# Prommmt

Prommmt is a TypeScript/Next.js application for refining prompts, generating image/video media, and organizing shared creations. The GitHub repository remains named `prommpts` to preserve existing links; **Prommmt** is the product name.

## What the code contains

- Prompt creation and extraction, provider adapters, and generation jobs.
- Personal libraries, public/private images, collections, and discovery.
- Clerk identity, Supabase persistence, and Stripe checkout/webhook routes.
- Tier and credit checks around paid generation operations.

[Architecture](docs/architecture.md) · [Setup and verification](docs/setup.md) · [Contract tests](tests)

## Engineering entry points

| Concern | Implementation |
| --- | --- |
| Generation orchestration | `src/app/api/generate-prompt/route.ts`, `src/lib/jobs/processor.ts` |
| Identity and database access | `src/lib/supabase-auth.ts`, `src/lib/database/` |
| Paid access | `src/lib/models/tier-validation.ts`, `src/lib/database/credits.ts` |
| Image visibility | `src/app/api/images/[id]/visibility/route.ts` |
| Checkout | `src/app/api/stripe/checkout/route.ts` |

## Verify without paid services

Requires Node.js 22.

```bash
npm ci
npm test
```

Tests cover input contracts, model-tier access, signed-out checkout rejection, and ownership rejection for image visibility. External identity/database boundaries are mocked. These are focused tests, not a claim of full end-to-end payment or database verification.

## Run the application

```bash
cp .env.example .env.local
# Configure the services described in docs/setup.md.
npm run dev
```

Full application use requires a configured database and external credentials. The checked-in SQL files are incremental migrations and do not currently constitute a verified complete clean-database bootstrap. Do not assume that applying them to an empty project will produce a working deployment.

## Current limitations

- Live generation, billing webhooks, and database authorization require separate integration verification against disposable service environments.
- Rate limiting currently uses per-process memory; it does not coordinate across application instances.
- TypeScript checking is enforced in CI and production builds. The existing build still skips ESLint; `npm run lint` exposes outstanding lint debt separately.
- Provider/model availability depends on configured accounts. No user counts, performance metrics, or generation-quality claims are made here.

The next delivery milestone is a complete reproducible database baseline plus real-service integration tests, followed by resolving and enforcing application-wide lint checks in CI.
