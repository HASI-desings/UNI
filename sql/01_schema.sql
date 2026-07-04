-- ============================================================================
-- PARALLAX PWA — Complete Database Schema
-- ============================================================================
-- This migration creates all tables, indexes, and constraints for the
-- Parallax academic GPA tracker. All deletes are soft-deletes via triggers.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. COURSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  credit_hours NUMERIC(3, 1) NOT NULL,
  is_lab BOOLEAN DEFAULT FALSE,
  semester TEXT NOT NULL,
  created_by UUID NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT credit_hours_positive CHECK (credit_hours > 0)
);

CREATE INDEX idx_courses_semester ON courses(semester) WHERE is_deleted = FALSE;
CREATE INDEX idx_courses_created_by ON courses(created_by) WHERE is_deleted = FALSE;
CREATE INDEX idx_courses_is_deleted ON courses(is_deleted);

-- ============================================================================
-- 2. GRADES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id),
  user_id UUID NOT NULL,
  raw_score NUMERIC(5, 2) NOT NULL,
  letter_grade TEXT,
  grade_points NUMERIC(3, 2),
  updated_by UUID NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT raw_score_range CHECK (raw_score >= 0 AND raw_score <= 100),
  CONSTRAINT grade_points_range CHECK (grade_points IS NULL OR (grade_points >= 0 AND grade_points <= 4))
);

CREATE INDEX idx_grades_course_id ON grades(course_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_grades_user_id ON grades(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_grades_is_deleted ON grades(is_deleted);

-- ============================================================================
-- 3. GRADE_SCALES TABLE (per-course-per-semester JSONB config)
-- ============================================================================
CREATE TABLE IF NOT EXISTS grade_scales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id),
  semester TEXT NOT NULL,
  scale_config JSONB NOT NULL DEFAULT '{
    "A": {"min": 90, "points": 4.0},
    "B": {"min": 80, "points": 3.0},
    "C": {"min": 70, "points": 2.0},
    "D": {"min": 60, "points": 1.0},
    "F": {"min": 0, "points": 0.0}
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, semester)
);

CREATE INDEX idx_grade_scales_course_semester ON grade_scales(course_id, semester);

-- ============================================================================
-- 4. ACTIVITY_LOG TABLE (append-only, no PIN data ever)
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  row_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  user_id UUID NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT action_valid CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

CREATE INDEX idx_activity_log_timestamp ON activity_log(timestamp DESC);
CREATE INDEX idx_activity_log_table_row ON activity_log(table_name, row_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);

-- ============================================================================
-- 5. PERSONAL_NOTES TABLE (owner-only RLS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS personal_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES courses(id),
  content TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_personal_notes_user_id ON personal_notes(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_personal_notes_course_id ON personal_notes(course_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_personal_notes_is_deleted ON personal_notes(is_deleted);

-- ============================================================================
-- 6. QUIZ_REMINDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id),
  title TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quiz_reminders_course_id ON quiz_reminders(course_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_quiz_reminders_due_date ON quiz_reminders(due_date) WHERE is_deleted = FALSE;
CREATE INDEX idx_quiz_reminders_is_deleted ON quiz_reminders(is_deleted);

-- ============================================================================
-- 7. USER_PINS TABLE (service-role-only, never readable by anon key)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_pins_user_id ON user_pins(user_id);

-- ============================================================================
-- TRIGGERS FOR SOFT-DELETE & ACTIVITY LOGGING
-- ============================================================================

-- Soft-delete trigger for courses
CREATE OR REPLACE FUNCTION soft_delete_courses()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE courses SET is_deleted = TRUE, updated_at = NOW() WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_soft_delete_courses ON courses;
CREATE TRIGGER trigger_soft_delete_courses
BEFORE DELETE ON courses
FOR EACH ROW
EXECUTE FUNCTION soft_delete_courses();

-- Soft-delete trigger for grades
CREATE OR REPLACE FUNCTION soft_delete_grades()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE grades SET is_deleted = TRUE, updated_at = NOW() WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_soft_delete_grades ON grades;
CREATE TRIGGER trigger_soft_delete_grades
BEFORE DELETE ON grades
FOR EACH ROW
EXECUTE FUNCTION soft_delete_grades();

-- Soft-delete trigger for personal_notes
CREATE OR REPLACE FUNCTION soft_delete_personal_notes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE personal_notes SET is_deleted = TRUE, updated_at = NOW() WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_soft_delete_personal_notes ON personal_notes;
CREATE TRIGGER trigger_soft_delete_personal_notes
BEFORE DELETE ON personal_notes
FOR EACH ROW
EXECUTE FUNCTION soft_delete_personal_notes();

-- Soft-delete trigger for quiz_reminders
CREATE OR REPLACE FUNCTION soft_delete_quiz_reminders()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE quiz_reminders SET is_deleted = TRUE, updated_at = NOW() WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_soft_delete_quiz_reminders ON quiz_reminders;
CREATE TRIGGER trigger_soft_delete_quiz_reminders
BEFORE DELETE ON quiz_reminders
FOR EACH ROW
EXECUTE FUNCTION soft_delete_quiz_reminders();

-- Activity log trigger for courses
CREATE OR REPLACE FUNCTION log_courses_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (table_name, row_id, action, new_value, user_id)
    VALUES ('courses', NEW.id, 'INSERT', row_to_json(NEW), NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_log (table_name, row_id, action, old_value, new_value, user_id)
    VALUES ('courses', NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), NEW.created_by);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (table_name, row_id, action, old_value, user_id)
    VALUES ('courses', OLD.id, 'DELETE', row_to_json(OLD), OLD.created_by);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_courses_activity ON courses;
CREATE TRIGGER trigger_log_courses_activity
AFTER INSERT OR UPDATE OR DELETE ON courses
FOR EACH ROW
EXECUTE FUNCTION log_courses_activity();

-- Activity log trigger for grades
CREATE OR REPLACE FUNCTION log_grades_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (table_name, row_id, action, new_value, user_id)
    VALUES ('grades', NEW.id, 'INSERT', row_to_json(NEW), NEW.updated_by);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_log (table_name, row_id, action, old_value, new_value, user_id)
    VALUES ('grades', NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), NEW.updated_by);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (table_name, row_id, action, old_value, user_id)
    VALUES ('grades', OLD.id, 'DELETE', row_to_json(OLD), OLD.updated_by);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_grades_activity ON grades;
CREATE TRIGGER trigger_log_grades_activity
AFTER INSERT OR UPDATE OR DELETE ON grades
FOR EACH ROW
EXECUTE FUNCTION log_grades_activity();

-- ============================================================================
-- AUTO-PURGE FUNCTION (30-day hard delete of soft-deleted records)
-- ============================================================================
CREATE OR REPLACE FUNCTION purge_soft_deleted_records()
RETURNS void AS $$
BEGIN
  -- Hard delete courses soft-deleted > 30 days ago
  DELETE FROM courses
  WHERE is_deleted = TRUE
  AND updated_at < NOW() - INTERVAL '30 days';

  -- Hard delete grades soft-deleted > 30 days ago
  DELETE FROM grades
  WHERE is_deleted = TRUE
  AND updated_at < NOW() - INTERVAL '30 days';

  -- Hard delete personal_notes soft-deleted > 30 days ago
  DELETE FROM personal_notes
  WHERE is_deleted = TRUE
  AND updated_at < NOW() - INTERVAL '30 days';

  -- Hard delete quiz_reminders soft-deleted > 30 days ago
  DELETE FROM quiz_reminders
  WHERE is_deleted = TRUE
  AND updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA: Default Grade Scales
-- ============================================================================
-- This will be populated after courses are created.
-- Default scale structure:
-- {
--   "A": {"min": 90, "points": 4.0},
--   "B": {"min": 80, "points": 3.0},
--   "C": {"min": 70, "points": 2.0},
--   "D": {"min": 60, "points": 1.0},
--   "F": {"min": 0, "points": 0.0}
-- }
