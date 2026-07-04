# Parallax PWA — Complete Feature Checklist

## Phase 1: Database Schema & Supabase Connection
- [x] Connect to existing Supabase "Uni" project (get credentials)
- [x] Create `courses` table with soft-delete support
- [x] Create `grades` table with soft-delete support
- [x] Create `grade_scales` table (JSONB config per course/semester)
- [x] Create `activity_log` table (append-only, no PIN data)
- [x] Create `personal_notes` table (owner-only RLS)
- [x] Create `quiz_reminders` table
- [x] Create `user_pins` table (service-role-only access)
- [x] Write DB triggers for soft-delete on courses/grades
- [x] Write DB trigger for activity_log population on INSERT/UPDATE/DELETE
- [x] Write auto-purge Edge Function (30-day hard delete)
- [x] Apply all RLS policies (authenticated for shared tables, owner-only for personal_notes)
- [x] Seed default grade_scales config

## Phase 2: Authentication & User Provisioning
- [x] Provision 5 Supabase Auth accounts (hussnain, faizan, alima, haroon, mahdiya)
- [x] First-time PIN creation flow (name selection → create PIN → confirm PIN → save to DB)
- [x] Deploy verify-pin Edge Function (PIN → session token)
- [x] Deploy create-pin Edge Function (first-time PIN creation with bcrypt hashing)
- [x] Implement login UI (name dropdown + PIN entry)
- [x] Implement first-time setup UI (PIN creation form)
- [x] Wire session management (setSession after PIN verification)
- [x] Build re-lock overlay (visibilitychange event)
- [x] Verify PIN re-entry on app resume

## Phase 3: GPA Engine
- [x] Build gpa-engine.js module (zero dependencies)
- [x] Implement computeTermGPA (weighted by credit_hours, is_lab)
- [x] Implement computeCGPA (cumulative across semesters)
- [x] Implement resolveGrade (raw_score → grade_points via grade_scales)
- [x] Implement whatIfProjection (hypothetical grades, in-memory only)
- [x] Implement buildTrendData (term-over-term for charts)
- [x] Implement buildCourseBreakdown (per-course performance)

## Phase 4: PWA Scaffold & Design System
- [x] Create index.html shell with all screen sections
- [x] Create manifest.json (name, theme_color #040404, display standalone)
- [x] Create service-worker.js with cache strategy
- [x] Create offline.html (styled fallback page)
- [x] Extract design tokens from ZIP (colors, spacing, typography, easing)
- [x] Build CSS token system (--color-base, --color-deep, --color-signal)
- [x] Implement responsive detection (mobile vs desktop layout)
- [x] Build base component library (cards, modals, toasts, sidebar)
- [x] Implement animations.css (GSAP-compatible keyframes)

## Phase 5: Authentication UI & Session
- [x] Build login screen (centered, emerald glow, name dropdown, PIN entry)
- [x] Implement PIN input masking (numeric only, 4 dots)
- [x] Wire login form submission to verify-pin Edge Function
- [x] Handle session token storage (localStorage + Supabase session)
- [x] Build lock overlay (full-screen, PIN re-entry on resume)
- [x] Implement logout functionality
- [x] Add PIN change screen in settings

## Phase 6: Core Data Screens
- [x] Build Dashboard screen (3D CGPA orb, term GPA, activity feed, presence)
- [x] Build Courses List screen (parallax cards, add/edit/soft-delete)
- [x] Build Grade Entry screen (shared-element morph from course card)
- [x] Build What-If Calculator screen (hypothetical grade sliders)
- [x] Build GPA Trend & Analytics screen (term chart, course breakdown)
- [x] Build Grade Scales Editor screen (JSONB config per course/semester)
- [x] Build Activity Log screen (append-only feed, no PIN data)
- [x] Build Recently Deleted screen (soft-deleted items with restore)
- [x] Build Personal Notes screen (owner-only, per-course)
- [x] Build Quiz Reminders screen (create/edit, due date picker)
- [x] Build Portal Fetch screen (credentials, diff-confirm modal)
- [x] Build Settings screen (PIN change, notification preferences)
- [x] Build Lock Overlay screen (PIN re-entry on app resume)

## Phase 7: Real-Time Sync & Presence
- [x] Wire Supabase real-time subscriptions (courses, grades channels)
- [x] Implement toast notifications on remote updates ("[Name] updated [Course]")
- [x] Implement conflict detection (overwrite toast with user name)
- [x] Build presence indicator (show which 5 users are online)
- [x] Test real-time sync end-to-end (multi-user updates)

## Phase 8: Offline Support
- [x] Build IndexedDB write queue (all mutations queued when offline)
- [x] Implement sync-on-reconnect (flush queue in order)
- [x] Build conflict detection against activity_log
- [x] Build conflict review modal (keep local vs accept remote)
- [x] Implement sync summary toast ("3 of 4 synced, 1 conflict")
- [x] Test offline → online transition with conflicts

## Phase 9: 3D & Motion Design Layer
- [x] Build WebGL shader background (emerald dust particles, #040404 canvas)
- [x] Implement Three.js CGPA orb (ambient rotation, glow mapped to CGPA)
- [x] Implement GSAP ScrollTrigger parallax (3 layers: particle, cards, UI)
- [x] Implement card 3D tilt (pointermove on desktop, DeviceOrientationEvent on mobile)
- [x] Implement shared-element transitions (View Transitions API + FLIP fallback)
- [x] Build mobile sidebar (full-screen, 3D perspective, tap-outside dismiss)
- [x] Implement toast animations (slide-in, auto-dismiss)
- [x] Implement GPA gauge needle animation (SVG sweep on grade update)

## Phase 10: Push Notifications
- [x] Generate VAPID keys (or request from user)
- [x] Register service worker push handler
- [x] Implement permission prompt (only after user interaction)
- [x] Wire quiz_reminders to push notifications
- [x] Build graceful degradation for iOS < 16.4 (in-app banner)
- [x] Test push notification delivery

## Phase 11: PWA Assets & Manifest
- [x] Generate all icon sizes (72, 96, 128, 144, 152, 192, 384, 512 px)
- [x] Generate 2 screenshots (desktop dashboard, mobile dashboard)
- [x] Verify all manifest.json references exist
- [x] Test iOS installability (Add to Home Screen)
- [x] Test Android installability (Chrome install prompt)
- [x] Verify service worker installs cleanly (no broken cache references)

## Phase 12: Export Functionality
- [x] Build PDF transcript export (jsPDF, client-side only)
- [x] Build CSV export (Blob download, client-side only)
- [x] Style PDF to match design system (dark bg, emerald accents)
- [x] Test PDF and CSV exports with real data

## Phase 13: Portal Auto-Fetch Adapter
- [x] Build portal-adapter.js (modular, swappable interface)
- [x] Implement fetchGrades(credentials) function
- [x] Build diff-confirm modal (per-field confirmation before DB write)
- [x] Implement error handling (portal down, auth expired, CORS)
- [x] Document adapter interface for future auth layer swaps

## Phase 14: End-to-End Verification
- [x] Verify auth → RLS chain (unauthenticated rejected, personal_notes owner-only)
- [x] Verify auth → real-time (subscriptions only for authenticated users)
- [x] Verify grade update → activity_log (trigger populates correctly)
- [x] Verify grade update → GPA engine (CGPA orb updates live)
- [x] Verify offline queue → sync (writes queue offline, flush on reconnect)
- [x] Verify quiz reminder → push notification (or in-app banner)
- [x] Verify PWA install (manifest clean, service worker installs)
- [x] Verify service worker offline fallback (offline.html loads)
- [x] Verify all 5 users can log in independently
- [x] Verify real-time multi-user updates (user A updates, user B sees toast)
- [x] Verify conflict handling (simultaneous updates detected and toasted)

## Phase 15: Delivery & Documentation
- [x] Create setup guide (Supabase credentials, VAPID keys, deployment steps)
- [x] Document design token system (colors, spacing, typography)
- [x] Document GPA engine API (all exported functions)
- [x] Document portal adapter interface (for future auth layer swaps)
- [x] Verify all files referenced in manifest.json exist
- [x] Create final checkpoint
- [x] Deliver complete codebase to user
