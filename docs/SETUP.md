# Parallax PWA — Setup Guide

## Prerequisites

- Supabase project "Uni" created and accessible
- Supabase credentials (URL, anon key, service role key)
- Node.js 18+ installed

## Step 1: Apply Database Migrations

The Parallax PWA requires a complete database schema with tables, triggers, and RLS policies.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Create a new query and paste the contents of `/sql/01_schema.sql`
4. Click **Run** to execute the schema migration
5. Create another new query and paste the contents of `/sql/02_rls.sql`
6. Click **Run** to apply RLS policies

### Option B: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Link your project
supabase link --project-ref bgaplkwkdsydoyzypdyj

# Apply migrations
supabase db push
```

### Option C: Using the Setup Script

```bash
# From the project root
node scripts/setup-db.mjs
```

## Step 2: Verify Database Setup

After applying migrations, verify that all tables were created:

```bash
# Run the verification test
pnpm test -- server/supabase.test.ts
```

Expected output:
```
✓ server/supabase.test.ts (1)
  ✓ Supabase Connection
```

## Step 3: Provision User Accounts

The Parallax PWA is designed for exactly 5 named users. You must provision these accounts:

- **Hussnain** (hussnain@parallax.local)
- **Faizan** (faizan@parallax.local)
- **Alima** (alima@parallax.local)
- **Haroon** (haroon@parallax.local)
- **Mahdiya** (mahdiya@parallax.local)

### Using the Provisioning Script

```bash
# This will create 5 Auth accounts and hash their PINs
node scripts/provision-users.mjs
```

When prompted, enter a PIN for each user (4-digit numeric code).

### Manual Provisioning

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add user** and create each of the 5 accounts above
4. For each user, run the provisioning script to hash and store their PIN

## Step 4: Deploy Edge Function for PIN Verification

The `verify-pin` Edge Function handles secure PIN authentication:

```bash
# Deploy the Edge Function
supabase functions deploy verify-pin --project-ref bgaplkwkdsydoyzypdyj
```

Or manually:

1. Go to **Edge Functions** in your Supabase dashboard
2. Create a new function named `verify-pin`
3. Paste the contents of `/edge-functions/verify-pin/index.ts`
4. Deploy

## Step 5: Configure Environment Variables

All environment variables are automatically set via `webdev_request_secrets`:

- `VITE_SUPABASE_URL` — Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Private service role key

These are already configured in your project.

## Step 6: Generate PWA Assets

```bash
# Generate all PWA icons and screenshots
node scripts/generate-pwa-assets.mjs
```

## Step 7: Start Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

## Troubleshooting

### "Table already exists" error

This is expected if you've run the migrations before. The SQL includes `IF NOT EXISTS` clauses to handle this gracefully.

### "Permission denied" error

Ensure you're using the **service role key**, not the anon key, for migrations.

### "Function does not exist" error

Make sure the `verify-pin` Edge Function has been deployed successfully.

## Database Schema Overview

| Table | Purpose |
|---|---|
| `courses` | Course definitions (name, credits, semester) |
| `grades` | Student grades (raw score, letter grade, points) |
| `grade_scales` | Per-course grading config (JSONB) |
| `activity_log` | Append-only audit log of all changes |
| `personal_notes` | Owner-only private notes per course |
| `quiz_reminders` | Quiz/exam reminders with due dates |
| `user_pins` | Hashed PINs for secure access (service-role-only) |

All tables support soft-delete (via `is_deleted` flag) with automatic 30-day purge.

## Real-Time Features

Enable real-time sync for live collaboration:

1. Go to **Replication** in your Supabase dashboard
2. Enable real-time for: `courses`, `grades`, `activity_log`, `quiz_reminders`
3. The app will automatically subscribe to these tables on load

## Next Steps

- Customize the 5 user PINs as needed
- Configure push notification VAPID keys (see `PUSH_NOTIFICATIONS.md`)
- Deploy to production (see `DEPLOYMENT.md`)
