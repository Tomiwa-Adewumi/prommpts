# Clerk + Supabase native integration

This application requests Clerk **session tokens** with `getToken()` in `src/lib/supabase-auth.ts`. It does not request a named `supabase` JWT template. Earlier instructions to share a Supabase JWT signing secret are superseded by this guide.

Follow the [official Supabase Clerk integration guide](https://supabase.com/docs/guides/auth/third-party/clerk): configure Clerk for Supabase compatibility and add Clerk as a third-party auth integration in the Supabase dashboard. The Clerk session must contain the appropriate authenticated role claim. Keep service-role credentials on the server.

Copy the variable names from [.env.example](.env.example). Match database ownership policies to the Clerk subject/application-user mapping actually used in this code. Do not base authorization on user-editable metadata. Verify with two distinct users: one must not read or change the other's private rows.

The legacy SQL folder contains incremental policy revisions and duplicate migration prefixes. It is not a verified fresh-database bootstrap. Reconcile the deployed schema and migration history in a disposable environment before attempting an upgrade. Offline application tests mock database boundaries and do not prove live RLS correctness.
