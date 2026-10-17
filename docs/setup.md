# Setup and verification

1. Install Node.js 22 and run `npm ci`.
2. Copy `.env.example` to `.env.local`. The template names all environment variables read by this repository; leave optional integrations disabled unless needed.
3. Configure Clerk and Supabase using the native third-party integration described in [the auth guide](../CLERK_SUPABASE_SETUP.md).
4. Use a disposable database with the application's baseline schema. The repository currently contains incremental migrations with duplicate `010` prefixes, not a verified empty-project bootstrap. Reconcile migration history before applying them; never apply these legacy scripts blindly to production.
5. Configure only the AI providers needed for the flows you are testing. Use Stripe **test mode** for checkout and webhook integration tests.
6. Run `npm run dev` and open http://localhost:3000.

Public configuration variables are bundled into the browser. `SUPABASE_SERVICE_ROLE_KEY`, Clerk secrets, provider secrets, webhook secrets, and Stripe secrets are server-only. Public keys alone do not establish authorization; database policies and server ownership checks must match the application access model.

## Offline verification

`npm test` exercises input contracts, model access, checkout authentication, and visibility ownership with mocked service boundaries. No credentials or paid requests are required.

`npm run typecheck` is enforced in CI and production builds. `npm run lint` exposes existing application-wide lint debt; the build still skips ESLint.

## Manual integration acceptance

In a disposable environment, verify sign-in, user sync, owner-only private media access, generation with sufficient/insufficient credits, duplicate webhook delivery, and failed-generation recovery. Record actual results before describing these flows as production-verified. No live database, auth configuration, or billing account was changed by this repository update.
