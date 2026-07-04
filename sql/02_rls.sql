-- ============================================================================
-- PARALLAX PWA — Row-Level Security (RLS) Policies
-- ============================================================================
-- All tables use RLS to enforce access control at the database level.
-- Shared tables (courses, grades, etc.) allow all authenticated users.
-- personal_notes is owner-only — strict user_id = auth.uid() enforcement.
-- user_pins is service-role-only — no RLS policy (accessible only via Edge Function).
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COURSES TABLE RLS
-- ============================================================================
-- All authenticated users can SELECT, INSERT, UPDATE courses.
-- Soft-deleted courses are excluded from normal queries.

DROP POLICY IF EXISTS "courses_select_authenticated" ON courses;
CREATE POLICY "courses_select_authenticated"
ON courses FOR SELECT
TO authenticated
USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "courses_insert_authenticated" ON courses;
CREATE POLICY "courses_insert_authenticated"
ON courses FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "courses_update_authenticated" ON courses;
CREATE POLICY "courses_update_authenticated"
ON courses FOR UPDATE
TO authenticated
USING (is_deleted = FALSE)
WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- GRADES TABLE RLS
-- ============================================================================
-- All authenticated users can SELECT, INSERT, UPDATE grades.
-- Soft-deleted grades are excluded from normal queries.

DROP POLICY IF EXISTS "grades_select_authenticated" ON grades;
CREATE POLICY "grades_select_authenticated"
ON grades FOR SELECT
TO authenticated
USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "grades_insert_authenticated" ON grades;
CREATE POLICY "grades_insert_authenticated"
ON grades FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "grades_update_authenticated" ON grades;
CREATE POLICY "grades_update_authenticated"
ON grades FOR UPDATE
TO authenticated
USING (is_deleted = FALSE)
WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- GRADE_SCALES TABLE RLS
-- ============================================================================
-- All authenticated users can SELECT, INSERT, UPDATE grade_scales.

DROP POLICY IF EXISTS "grade_scales_select_authenticated" ON grade_scales;
CREATE POLICY "grade_scales_select_authenticated"
ON grade_scales FOR SELECT
TO authenticated
USING (TRUE);

DROP POLICY IF EXISTS "grade_scales_insert_authenticated" ON grade_scales;
CREATE POLICY "grade_scales_insert_authenticated"
ON grade_scales FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "grade_scales_update_authenticated" ON grade_scales;
CREATE POLICY "grade_scales_update_authenticated"
ON grade_scales FOR UPDATE
TO authenticated
USING (TRUE)
WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- ACTIVITY_LOG TABLE RLS
-- ============================================================================
-- All authenticated users can SELECT and INSERT activity_log.
-- No UPDATE or DELETE allowed (append-only).
-- Activity log entries never contain PIN or credential data.

DROP POLICY IF EXISTS "activity_log_select_authenticated" ON activity_log;
CREATE POLICY "activity_log_select_authenticated"
ON activity_log FOR SELECT
TO authenticated
USING (TRUE);

DROP POLICY IF EXISTS "activity_log_insert_authenticated" ON activity_log;
CREATE POLICY "activity_log_insert_authenticated"
ON activity_log FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- PERSONAL_NOTES TABLE RLS — OWNER-ONLY (STRICT EXCEPTION)
-- ============================================================================
-- This is the ONE deliberate exception to "everything is shared."
-- Each user can only SELECT, INSERT, UPDATE, DELETE their own personal_notes.
-- Soft-deleted notes are excluded from normal queries.

DROP POLICY IF EXISTS "personal_notes_select_owner" ON personal_notes;
CREATE POLICY "personal_notes_select_owner"
ON personal_notes FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND is_deleted = FALSE);

DROP POLICY IF EXISTS "personal_notes_insert_owner" ON personal_notes;
CREATE POLICY "personal_notes_insert_owner"
ON personal_notes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "personal_notes_update_owner" ON personal_notes;
CREATE POLICY "personal_notes_update_owner"
ON personal_notes FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND is_deleted = FALSE)
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "personal_notes_delete_owner" ON personal_notes;
CREATE POLICY "personal_notes_delete_owner"
ON personal_notes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- QUIZ_REMINDERS TABLE RLS
-- ============================================================================
-- All authenticated users can SELECT, INSERT, UPDATE quiz_reminders.
-- Soft-deleted reminders are excluded from normal queries.

DROP POLICY IF EXISTS "quiz_reminders_select_authenticated" ON quiz_reminders;
CREATE POLICY "quiz_reminders_select_authenticated"
ON quiz_reminders FOR SELECT
TO authenticated
USING (is_deleted = FALSE);

DROP POLICY IF EXISTS "quiz_reminders_insert_authenticated" ON quiz_reminders;
CREATE POLICY "quiz_reminders_insert_authenticated"
ON quiz_reminders FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "quiz_reminders_update_authenticated" ON quiz_reminders;
CREATE POLICY "quiz_reminders_update_authenticated"
ON quiz_reminders FOR UPDATE
TO authenticated
USING (is_deleted = FALSE)
WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- USER_PINS TABLE RLS
-- ============================================================================
-- NO RLS policy — this table is accessible ONLY via the verify-pin Edge Function
-- using the service role key. The anon key can never read or write this table.
-- This is enforced at the application level (Edge Function) and database level
-- (no public/authenticated policies defined).

-- Explicitly deny all access by default (no policies = no access)
-- The verify-pin Edge Function uses service role key to access this table.
