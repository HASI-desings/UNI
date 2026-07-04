# Parallax PWA — Academic GPA Tracker

A secure, visually immersive student GPA tracker web app for exactly 5 named users with PIN-based access, real-time collaboration, offline support, and rich 3D/motion design.

## Features

✅ **PIN-Based Secure Access**
- First-time PIN creation (users set own PIN on first login)
- Bcrypt PIN hashing (server-side verification)
- Session re-lock overlay on app resume
- No open registration

✅ **GPA Engine**
- Term GPA calculation (weighted by credit hours, lab status)
- CGPA calculation (cumulative across semesters)
- What-If projections (hypothetical grades, in-memory only)
- Trend analysis (term-over-term GPA progression)
- Impact analysis (grade change → GPA change)

✅ **Real-Time Collaboration**
- Supabase Realtime subscriptions (courses, grades, activity)
- Named toast notifications ("Hussnain updated Physics")
- Presence indicators (show which 5 users are online)
- Conflict detection and resolution

✅ **Offline Support**
- IndexedDB write queue (all mutations queued when offline)
- Sync-on-reconnect (automatic flush of queued operations)
- Conflict detection against activity log
- Conflict review modal (user choice on conflicts)
- Service worker offline fallback page

✅ **3D & Motion Design**
- WebGL shader background (emerald dust particles on #040404)
- Three.js CGPA orb (ambient rotation, glow intensity mapped to CGPA)
- GSAP parallax scroll (3 layers: particles, cards, UI)
- Card 3D tilt (pointermove on desktop, DeviceOrientation on mobile)
- Shared-element transitions (View Transitions API + FLIP fallback)
- Mobile sidebar (full-screen drawer with 3D perspective)

✅ **PWA Features**
- Standalone display mode (no browser chrome)
- Icon sizes: 72px to 512px
- Screenshots for app stores
- iOS installability (Add to Home Screen, iOS 16.4+)
- Android installability (Chrome install prompt)
- Offline fallback page

✅ **Push Notifications**
- VAPID-based Web Push
- Quiz reminder notifications
- Permission prompt (only after user interaction)
- Graceful degradation for iOS < 16.4

✅ **Data Management**
- Soft-delete on all tables (logical delete with deleted_at flag)
- 30-day auto-purge (hard delete after 30 days)
- Grade scales (JSONB per course/semester, customizable)
- Personal notes (owner-only, RLS enforced)
- Activity log (append-only, no edits/deletes, no PIN data)

✅ **Exports**
- PDF transcript export (jsPDF, client-side only)
- CSV export (Blob download, client-side only)

## Folder Structure

```
parallax-pwa-github/
├── index.html                    # Main PWA shell with all screens
├── offline.html                  # Offline fallback page
├── manifest.json                 # PWA manifest (icons, metadata)
├── service-worker.js             # Service worker (caching, offline, push)
├── css/
│   ├── tokens.css               # Design tokens (colors, spacing, typography)
│   ├── base.css                 # Global styles and typography
│   ├── components.css           # Component styles (buttons, cards, modals)
│   ├── animations.css           # 30+ keyframes (fade, slide, scale, glow)
│   └── responsive.css           # Mobile-first, tablet, desktop layouts
├── js/
│   ├── app-final.js             # Main app (auth, UI, real-time, offline)
│   └── gpa-engine.js            # GPA calculations
├── sql/
│   ├── 01_schema.sql            # Database schema (7 tables, triggers)
│   └── 02_rls.sql               # Row-level security policies
├── assets/
│   └── icons/                   # PWA icons (72px to 512px)
└── docs/
    ├── README.md                # This file
    ├── SETUP.md                 # Database setup guide
    ├── DEPLOYMENT.md            # Production deployment guide
    └── todo.md                  # Feature checklist
```

## Users (5 Named Users)

1. **Hussnain**
2. **Faizan**
3. **Alima**
4. **Haroon**
5. **Mahdiya**

Each user:
- Sets own PIN on first login (4 digits, bcrypt-hashed)
- Has independent session (24-hour token)
- Can see all courses/grades (shared data)
- Can only see own personal notes (RLS enforced)
- Appears in presence indicators when online
- Receives real-time updates from other users

## Quick Start

### 1. Setup Supabase Database

```bash
# Apply database schema
# Go to Supabase SQL Editor → New Query
# Paste contents of sql/01_schema.sql → Run
# Paste contents of sql/02_rls.sql → Run
```

### 2. Deploy Edge Functions

```bash
# Deploy verify-pin Edge Function
# Deploy create-pin Edge Function
# Update function URLs in js/app-final.js
```

### 3. Configure Environment

Update the Supabase credentials in `js/app-final.js`:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 4. Generate VAPID Keys (Optional, for push notifications)

```bash
# Generate at https://web-push-codelab.glitch.me/
# Add to service-worker.js
```

### 5. Deploy to Production

- Upload all files to your web server
- Enable HTTPS
- Configure custom domain (optional)
- Test PWA installation on iOS/Android

## Technology Stack

**Frontend:**
- Vanilla HTML5, CSS4, JavaScript
- Canvas API (2D/3D rendering)
- Service Worker (offline, caching, push)
- IndexedDB (offline queue)
- Supabase JS SDK (real-time, auth)

**Backend:**
- Supabase PostgreSQL
- PostgREST (auto-generated REST API)
- Edge Functions (Deno runtime)
- Realtime (WebSocket subscriptions)
- RLS (row-level security)

**Libraries:**
- Three.js (3D graphics)
- GSAP (animations)
- jsPDF (PDF export)
- bcrypt (password hashing)
- Supabase JS SDK

## Database Schema

### Tables

- **courses** — Course information with soft-delete
- **grades** — Grade records with soft-delete
- **grade_scales** — JSONB grading configuration
- **activity_log** — Append-only activity log (no PIN data)
- **personal_notes** — Owner-only notes (RLS enforced)
- **quiz_reminders** — Quiz reminders with soft-delete
- **user_pins** — Bcrypt-hashed PINs (service-role-only)

### Triggers

- Soft-delete trigger on courses, grades, personal_notes, quiz_reminders
- Activity log population on INSERT/UPDATE/DELETE
- 30-day auto-purge for deleted records

### RLS Policies

- **courses** — Authenticated users can read all, create own
- **grades** — Authenticated users can read all, create/update own
- **activity_log** — Authenticated users can read all, append-only
- **personal_notes** — Owner-only access (user_id = auth.uid())
- **quiz_reminders** — Authenticated users can read all, create/update own
- **user_pins** — Service-role-only (no public/authenticated access)

## API Integration

### Supabase Client Functions

```javascript
// Authentication
await verifyPin(username, pin);
await createPin(username, pin, confirmPin);

// Courses
await fetchCourses();
await createCourse(courseData);
await updateCourse(courseId, courseData);
await deleteCourse(courseId);

// Grades
await fetchGrades();
await createGrade(gradeData);
await updateGrade(gradeId, gradeData);
await deleteGrade(gradeId);

// Real-time Subscriptions
subscribeToCoursesUpdates(callback);
subscribeToGradesUpdates(callback);
subscribeToActivityLog(callback);
```

### GPA Engine Functions

```javascript
// Calculations
gpaEngine.computeTermGPA(courses, grades);
gpaEngine.computeCGPA(courses, grades);
gpaEngine.resolveGrade(rawScore, gradeScale);
gpaEngine.whatIfProjection(courses, hypotheticalGrades, previousSemesters);
gpaEngine.buildTrendData(semesters);
gpaEngine.buildCourseBreakdown(courses, grades);
gpaEngine.calculateMinimumGrade(courses, courseId, targetGPA);
```

## Deployment

### Manus (Recommended)

1. Create new Manus project
2. Upload all files
3. Configure Supabase credentials
4. Generate VAPID keys
5. Deploy with one click

### Custom Hosting

1. Upload all files to your web server
2. Enable HTTPS
3. Configure CORS headers (if needed)
4. Test PWA installation
5. Monitor performance

## Security

- PIN verified server-side via Edge Function
- Bcrypt hashing (no plaintext PINs)
- RLS policies (row-level access control)
- Owner-only personal notes (user_id = auth.uid())
- Service-role-only user_pins table
- No PIN data in activity log
- All data encrypted in transit (HTTPS)
- Supabase encryption at rest

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 15+
- Edge 90+
- iOS Safari 15+
- Android Chrome 90+

## File Sizes

| File | Size |
|------|------|
| index.html | ~50 KB |
| manifest.json | ~5 KB |
| service-worker.js | ~30 KB |
| js/gpa-engine.js | ~15 KB |
| js/app-final.js | ~40 KB |
| css/tokens.css | ~10 KB |
| css/base.css | ~15 KB |
| css/components.css | ~20 KB |
| css/animations.css | ~25 KB |
| css/responsive.css | ~15 KB |
| sql/01_schema.sql | ~50 KB |
| sql/02_rls.sql | ~20 KB |

**Total:** ~330 KB (uncompressed), ~80 KB (gzipped)

## Next Steps

1. Clone or download this repository
2. Follow the Quick Start guide above
3. Test all flows (login, real-time, offline, PWA install)
4. Deploy to production
5. Monitor performance and user feedback

## Support

For issues, questions, or feature requests, please refer to the documentation in the `docs/` folder.

---

**Built with ❤️ for high-achieving students**
