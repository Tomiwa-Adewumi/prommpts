# Clerk + Supabase JWT Integration Setup

## Step 1: Create Clerk JWT Template

1. Go to your Clerk Dashboard: https://dashboard.clerk.com
2. Navigate to "Configure" > "JWT Templates"
3. Click "New template"
4. Choose "Supabase" as the template type
5. Configure the template:
   - **Name**: `supabase`
   - **Signing algorithm**: `HS256`
   - **Signing key**: Use your Supabase JWT secret (found in Supabase Dashboard > Settings > API > JWT Secret)
   - **Claims**: The default Supabase claims should be fine:
     ```json
     {
       "aud": "authenticated",
       "exp": {{exp}},
       "iat": {{iat}},
       "iss": "{{iss}}",
       "sub": "{{user.id}}",
       "email": "{{user.primary_email_address.email_address}}",
       "phone": "{{user.primary_phone_number.phone_number}}",
       "app_metadata": {
         "provider": "clerk",
         "providers": ["clerk"]
       },
       "user_metadata": {
         "first_name": "{{user.first_name}}",
         "last_name": "{{user.last_name}}",
         "username": "{{user.username}}",
         "avatar_url": "{{user.image_url}}"
       }
     }
     ```

## Step 2: Add Environment Variables

Make sure you have these in your `.env.local`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Step 3: Apply Database Migrations

Run the migrations to set up proper RLS policies:

```bash
# Apply the migrations
npx supabase migration up

# Or manually run the SQL files:
# - supabase/migrations/006_fix_users_rls_and_collections.sql
# - supabase/migrations/007_setup_clerk_jwt_auth.sql
```

## Step 4: Test the Integration

After setup, test that:

1. Users can create collections (should work with proper authentication)
2. Users can only see their own collections
3. RLS policies are properly enforced
4. No more UUID format errors

## Important Notes

- The JWT template name MUST be exactly `supabase` for the code to work
- The signing key must match your Supabase JWT secret exactly
- Users will now go through proper RLS policies instead of bypassing them
- All user operations will be properly authenticated

## What Changed

- Replaced `supabaseAdmin` usage with authenticated Supabase client
- All database operations now go through RLS policies
- Proper JWT-based authentication between Clerk and Supabase
- Users can only access their own data as enforced by the database