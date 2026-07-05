// ============================================
// SUPABASE CLIENT — auth, courses, assessments, marks, leaderboards
// Loaded after the Supabase CDN script and before app.js.
// ============================================

(function () {
    const client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

    // ---------- PIN hashing (SHA-256, not plaintext — see schema notes on limits) ----------
    async function hashPin(pin) {
        const data = new TextEncoder().encode(pin);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ---------- AUTH ----------
    // Returns { ok: true } | { ok: false, reason: 'no-such-user'|'wrong-pin' }
    async function login(username, pin) {
        const pinHash = await hashPin(pin);

        // Try to claim the PIN in one shot: only succeeds if this user has
        // never set one before. No separate "does this user exist" check
        // first — that's what was making first logins feel slow.
        const { data: claimed, error: claimError } = await client
            .from('users')
            .update({ pin_hash: pinHash })
            .eq('username', username)
            .is('pin_hash', null)
            .select('username')
            .maybeSingle();

        if (claimed) return { ok: true, firstTime: true };
        if (claimError) return { ok: false, reason: claimError.message };

        // Already had a PIN (or the username doesn't exist) — verify normally.
        const { data: user, error } = await client.from('users').select('username, pin_hash').eq('username', username).single();
        if (error || !user) return { ok: false, reason: 'no-such-user' };
        if (user.pin_hash !== pinHash) return { ok: false, reason: 'wrong-pin' };
        return { ok: true, firstTime: false };
    }

    async function changePin(username, newPin) {
        const pinHash = await hashPin(newPin);
        const { error } = await client.from('users').update({ pin_hash: pinHash }).eq('username', username);
        return !error;
    }

    // ---------- COURSES (shared) ----------
    async function getCourses(semester) {
        const { data, error } = await client.from('courses').select('*').eq('semester', semester).order('created_at');
        if (error) { console.error(error); return []; }
        return data;
    }

    async function addCourse(name, creditHours, semester, createdBy, weightageConfig) {
        const { data, error } = await client.from('courses')
            .insert({
                name, credit_hours: creditHours, semester, created_by: createdBy,
                weightage_config: weightageConfig || window.MathEngine.DEFAULT_WEIGHTAGE
            })
            .select().single();
        if (error) { console.error(error); return null; }
        return data;
    }

    async function updateWeightageConfig(courseId, weightageConfig) {
        const { data, error } = await client.from('courses')
            .update({ weightage_config: weightageConfig })
            .eq('id', courseId)
            .select().single();
        if (error) { console.error(error); return null; }
        return data;
    }

    async function deleteCourse(courseId) {
        const { error } = await client.from('courses').delete().eq('id', courseId);
        return !error;
    }

    // ---------- ASSESSMENTS (shared per course) ----------
    async function getAssessments(courseId) {
        const { data, error } = await client.from('assessments').select('*').eq('course_id', courseId).order('created_at');
        if (error) { console.error(error); return []; }
        return data;
    }

    async function addAssessment(courseId, type, title, totalMarks, createdBy, classAverage) {
        const { data, error } = await client.from('assessments')
            .insert({
                course_id: courseId, type, title, total_marks: totalMarks, created_by: createdBy,
                class_average: (classAverage != null && !isNaN(classAverage)) ? classAverage : null
            })
            .select().single();
        if (error) { console.error(error); return null; }
        return data;
    }

    async function deleteAssessment(assessmentId) {
        const { error } = await client.from('assessments').delete().eq('id', assessmentId);
        return !error;
    }

    // ---------- MARKS ----------
    async function upsertMark(assessmentId, username, obtainedMarks) {
        const { data, error } = await client.from('marks')
            .upsert(
                { assessment_id: assessmentId, username, obtained_marks: obtainedMarks, updated_at: new Date().toISOString() },
                { onConflict: 'assessment_id,username' }
            )
            .select().single();
        if (error) { console.error(error); return null; }
        return data;
    }

    async function getMarksForCourse(courseId) {
        // Pulls every mark for every assessment under this course (used for leaderboards + class average)
        const { data, error } = await client
            .from('marks')
            .select('id, obtained_marks, username, assessment_id, created_at, assessments!inner(id, course_id, total_marks, title, type, class_average, created_at)')
            .eq('assessments.course_id', courseId);
        if (error) { console.error(error); return []; }
        return data;
    }

    async function getMyMarks(username, courseId) {
        const all = await getMarksForCourse(courseId);
        return all.filter(m => m.username === username);
    }

    // ---------- PROFILES (onboarding) ----------
    async function getProfile(username) {
        const { data, error } = await client.from('profiles').select('*').eq('username', username).maybeSingle();
        if (error) { console.error(error); return null; }
        return data;
    }

    async function saveProfile(username, totalDegreeCreditHours, currentSemesterNumber) {
        const { data, error } = await client.from('profiles')
            .upsert({
                username,
                total_degree_credit_hours: totalDegreeCreditHours,
                current_semester_number: currentSemesterNumber,
                onboarded: true
            }, { onConflict: 'username' })
            .select().single();
        if (error) { console.error(error); return null; }
        return data;
    }

    // ---------- ATTENDANCE ----------
    async function markAttendance(courseId, username, date, status) {
        const { data, error } = await client.from('attendance')
            .upsert({ course_id: courseId, username, class_date: date, status }, { onConflict: 'course_id,username,class_date' })
            .select().single();
        if (error) { console.error(error); return null; }
        return data;
    }

    async function getAttendance(courseId, username) {
        let query = client.from('attendance').select('*').eq('course_id', courseId);
        if (username) query = query.eq('username', username);
        const { data, error } = await query.order('class_date');
        if (error) { console.error(error); return []; }
        return data;
    }

    async function getAllAttendanceForCourses(courseIds) {
        if (!courseIds.length) return [];
        const { data, error } = await client.from('attendance').select('*').in('course_id', courseIds);
        if (error) { console.error(error); return []; }
        return data;
    }

    // ---------- ACTIVITIES (tasks/deadlines) ----------
    async function getActivities(courseIds) {
        let query = client.from('activities').select('*').order('due_at');
        if (courseIds && courseIds.length) {
            query = client.from('activities').select('*').or(`course_id.is.null,course_id.in.(${courseIds.join(',')})`).order('due_at');
        }
        const { data, error } = await query;
        if (error) { console.error(error); return []; }
        return data;
    }

    async function addActivity(courseId, title, description, dueAt, createdBy) {
        const { data, error } = await client.from('activities')
            .insert({ course_id: courseId || null, title, description, due_at: dueAt, created_by: createdBy })
            .select().single();
        if (error) { console.error(error); return null; }
        return data;
    }

    async function deleteActivity(activityId) {
        const { error } = await client.from('activities').delete().eq('id', activityId);
        return !error;
    }

    async function hasReminderBeenSent(activityId, username) {
        const { data } = await client.from('activity_reminders_sent')
            .select('activity_id').eq('activity_id', activityId).eq('username', username).maybeSingle();
        return !!data;
    }

    async function markReminderSent(activityId, username) {
        await client.from('activity_reminders_sent').insert({ activity_id: activityId, username }).select();
    }

    // ---------- SEMESTER RECORDS ----------
    async function getSemesterRecords(username) {
        const { data, error } = await client.from('semester_records').select('*').eq('username', username).order('created_at');
        if (error) { console.error(error); return []; }
        return data;
    }

    async function upsertSemesterRecord(username, semester, gpa, creditHours) {
        const { data, error } = await client.from('semester_records')
            .upsert({ username, semester, gpa, credit_hours: creditHours }, { onConflict: 'username,semester' })
            .select().single();
        if (error) { console.error(error); return null; }
        return data;
    }

    window.ParallaxDB = {
        login, changePin,
        getCourses, addCourse, deleteCourse, updateWeightageConfig,
        getAssessments, addAssessment, deleteAssessment,
        upsertMark, getMarksForCourse, getMyMarks,
        getSemesterRecords, upsertSemesterRecord,
        getProfile, saveProfile,
        markAttendance, getAttendance, getAllAttendanceForCourses,
        getActivities, addActivity, deleteActivity, hasReminderBeenSent, markReminderSent,
    };
})();
