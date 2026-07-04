# Parallax PWA — Deployment Guide

## Overview

Parallax is a production-grade PWA built with vanilla JavaScript, Supabase, and Three.js. This guide covers deployment, configuration, and production setup.

## Prerequisites

- Supabase project "Uni" with all migrations applied
- 5 user accounts provisioned with hashed PINs
- Node.js 18+ for local development
- Supabase CLI (optional, for Edge Function deployment)

## Phase 1: Local Development

### Setup

```bash
cd /home/ubuntu/parallax-pwa

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will be available at `http://localhost:3000`

### Testing

```bash
# Run tests
pnpm test

# Build for production
pnpm build
```

## Phase 2: Environment Configuration

All environment variables are automatically set via `webdev_request_secrets`:

| Variable | Purpose | Status |
|----------|---------|--------|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ Set |
| `VITE_SUPABASE_ANON_KEY` | Public anon key | ✅ Set |
| `SUPABASE_SERVICE_ROLE_KEY` | Private service role key | ✅ Set |

These are available in both development and production environments.

## Phase 3: Database Setup

### Verify Schema

All tables, triggers, and RLS policies have been applied:

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
```

Expected tables:
- `courses` — Course definitions
- `grades` — Student grades
- `grade_scales` — Grading configuration (JSONB)
- `activity_log` — Append-only audit log
- `personal_notes` — Owner-only private notes
- `quiz_reminders` — Quiz/exam reminders
- `user_pins` — Hashed PINs (service-role-only)

### Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### Enable Real-Time

In your Supabase dashboard:

1. Go to **Replication** settings
2. Enable real-time for:
   - `courses`
   - `grades`
   - `activity_log`
   - `quiz_reminders`

## Phase 4: User Provisioning

### Create 5 Auth Accounts

Via Supabase dashboard (**Authentication** → **Users**):

1. **Hussnain** — hussnain@parallax.local
2. **Faizan** — faizan@parallax.local
3. **Alima** — alima@parallax.local
4. **Haroon** — haroon@parallax.local
5. **Mahdiya** — mahdiya@parallax.local

### Hash and Store PINs

For each user, insert into `user_pins` table:

```sql
INSERT INTO user_pins (user_id, pin_hash) VALUES
  ('user-hussnain-id', 'hashed-pin-1'),
  ('user-faizan-id', 'hashed-pin-2'),
  ('user-alima-id', 'hashed-pin-3'),
  ('user-haroon-id', 'hashed-pin-4'),
  ('user-mahdiya-id', 'hashed-pin-5');
```

**Important:** Use bcrypt to hash PINs before storing.

```javascript
// Example: Hash a PIN with bcrypt
const bcrypt = require('bcrypt');
const pin = '1234';
const hashedPin = await bcrypt.hash(pin, 10);
```

## Phase 5: Edge Functions

### Deploy verify-pin Function

```bash
# Using Supabase CLI
supabase functions deploy verify-pin --project-ref bgaplkwkdsydoyzypdyj

# Or manually:
# 1. Go to Supabase dashboard → Edge Functions
# 2. Create new function: verify-pin
# 3. Paste contents of edge-functions/verify-pin/index.ts
# 4. Deploy
```

### Test Edge Function

```bash
curl -X POST https://bgaplkwkdsydoyzypdyj.supabase.co/functions/v1/verify-pin \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userName":"hussnain","pin":"1234"}'
```

## Phase 6: PWA Assets

### Generate Icons

```bash
# Generate all icon sizes (72, 96, 128, 144, 152, 192, 384, 512)
node scripts/generate-pwa-assets.mjs
```

Icons are saved to `public/icons/`

### Verify Manifest

Check `public/manifest.json` references all icons:

```bash
# Verify all icon files exist
ls -la public/icons/
```

### Test PWA Installation

**Desktop (Chrome):**
1. Open DevTools → Application → Manifest
2. Verify all fields are present
3. Click "Install app"

**Mobile (iOS 16.4+):**
1. Safari → Share → Add to Home Screen
2. App should install with icon

## Phase 7: Push Notifications (Optional)

### Generate VAPID Keys

```bash
# Generate VAPID key pair
node -e "const webpush = require('web-push'); const vapidKeys = webpush.generateVAPIDKeys(); console.log(vapidKeys);"
```

### Configure in App

Add to `public/js/app.js`:

```javascript
const VAPID_PUBLIC_KEY = 'your-public-key';
const VAPID_PRIVATE_KEY = 'your-private-key';
```

### Request Notification Permission

```javascript
// Only after user interaction
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
```

## Phase 8: Deployment

### Manus Hosting (Recommended)

Parallax is automatically deployed via Manus:

1. Create a checkpoint: `webdev_save_checkpoint`
2. Click **Publish** in the Management UI
3. App is live at your custom domain

### Custom Domain

In Management UI → Settings → Domains:

1. Purchase or connect custom domain
2. Update DNS records
3. Domain is active within minutes

### External Hosting (Not Recommended)

If deploying to Vercel, Netlify, etc.:

```bash
# Build static files
pnpm build

# Deploy dist/ folder
```

**Note:** Real-time subscriptions may have latency on serverless platforms.

## Phase 9: Monitoring & Maintenance

### Logs

- **Dev Server:** `.manus-logs/devserver.log`
- **Browser Console:** `.manus-logs/browserConsole.log`
- **Network Requests:** `.manus-logs/networkRequests.log`
- **Session Replay:** `.manus-logs/sessionReplay.log`

### Database Maintenance

#### 30-Day Auto-Purge

Soft-deleted records are automatically purged after 30 days via the `purge_soft_deleted_records()` function.

To manually trigger:

```sql
SELECT purge_soft_deleted_records();
```

#### Activity Log Cleanup

Activity log grows indefinitely. Archive old entries:

```sql
-- Archive entries older than 90 days
INSERT INTO activity_log_archive
SELECT * FROM activity_log WHERE timestamp < NOW() - INTERVAL '90 days';

DELETE FROM activity_log WHERE timestamp < NOW() - INTERVAL '90 days';
```

### Performance Optimization

#### Database Indexes

All critical indexes are created:

```sql
-- Verify indexes
SELECT * FROM pg_indexes WHERE schemaname = 'public';
```

#### Cache Strategy

Service Worker caches static assets. To update:

1. Change `CACHE_VERSION` in `public/service-worker.js`
2. Deploy new version
3. Old cache is automatically cleaned up

## Phase 10: Security Checklist

- [ ] All 5 user PINs are bcrypt-hashed
- [ ] `user_pins` table has no RLS policy (service-role-only)
- [ ] `personal_notes` RLS enforces owner-only access
- [ ] Activity log never contains PIN data
- [ ] HTTPS is enabled (automatic with Manus)
- [ ] CORS is properly configured
- [ ] Supabase service role key is never exposed to client
- [ ] Edge Function uses service role key only

## Troubleshooting

### "PIN verification failed"

- Verify user exists in `user_pins` table
- Check PIN hash is bcrypt format
- Ensure Edge Function is deployed

### "Real-time updates not working"

- Verify real-time is enabled in Supabase dashboard
- Check browser console for subscription errors
- Restart dev server

### "Offline mode not working"

- Verify service worker is registered
- Check browser DevTools → Application → Service Workers
- Clear cache and reload

### "PWA won't install"

- Verify manifest.json is valid
- Check all icon files exist
- Ensure HTTPS is enabled
- Test on different browser

## Support

For issues or questions:

1. Check `.manus-logs/` for error messages
2. Review Supabase dashboard for database errors
3. Test in browser DevTools console
4. Contact support at https://help.manus.im

## Next Steps

- [ ] Configure push notification VAPID keys
- [ ] Set up analytics tracking
- [ ] Configure custom domain
- [ ] Enable backup/disaster recovery
- [ ] Set up monitoring alerts
