
/* ============================================
   PARALLAX PWA - MAIN APPLICATION
   ============================================ */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    // ⚠️ REPLACE THESE with your real values from:
    // Supabase Dashboard → Project Settings → API → Project URL / anon public key
    // The previous key here was truncated/invalid — that's why nothing was saving.
    USERS: ['hussnain', 'faizan', 'alima', 'haroon', 'mahdiya'],
    STORAGE_KEY_PREFIX: 'parallax_',
    CURRENT_SEMESTER: 'Fall 2026' // bump this each new semester; old courses stay archived under their own semester
};

// ============================================
// STATE
// ============================================

const STATE = {
    currentUser: null,
    isAuthenticated: false,
    courses: [],            // shared catalog for CURRENT_SEMESTER
    assessmentsByCourse: {}, // courseId -> [assessment]
    marksByCourse: {},       // courseId -> full class marks rows
    semesterRecords: [],     // this user's past semesters
    activityLog: [],
    profile: null,
    activities: [],
    deviceCapabilities: {}
};

// ============================================
// DEVICE CAPABILITY DETECTION
// ============================================

function detectDeviceCapabilities() {
    STATE.deviceCapabilities = {
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        hasServiceWorker: 'serviceWorker' in navigator,
        hasLocalStorage: (() => {
            try {
                const test = '__test__';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) {
                return false;
            }
        })()
    };
}

function logActivity(action) {
    STATE.activityLog.push({ action, timestamp: new Date().toISOString() });
    if (STATE.deviceCapabilities.hasLocalStorage && STATE.currentUser) {
        localStorage.setItem(CONFIG.STORAGE_KEY_PREFIX + 'activity_' + STATE.currentUser, JSON.stringify(STATE.activityLog.slice(-20)));
    }
    updateActivityLog();
}

// ============================================
// THEMED MODAL SYSTEM
// Replaces every native alert()/prompt()/confirm() with a modal that
// matches the rest of the app (glass panel, character accent color).
// ============================================

function closeAppModal() {
    const modal = document.getElementById('app-modal');
    modal.classList.remove('is-open');
    document.getElementById('app-modal-panel').innerHTML = '';
}

function openAppModal(innerHTML) {
    document.getElementById('app-modal-panel').innerHTML = innerHTML;
    document.getElementById('app-modal').classList.add('is-open');
}

// Simple message modal — replaces alert()
function showAlertModal(title, message) {
    openAppModal(`
        <h3>${title}</h3>
        <p class="app-modal__message">${message}</p>
        <div class="app-modal__actions">
            <button class="btn btn-primary full-width" onclick="closeAppModal()">OK</button>
        </div>
    `);
}

// Yes/No modal — replaces confirm(). onConfirm is called if the user confirms.
function showConfirmModal(title, message, onConfirm) {
    window.__pendingConfirm = onConfirm;
    openAppModal(`
        <h3>${title}</h3>
        <p class="app-modal__message">${message}</p>
        <div class="app-modal__actions app-modal__actions--split">
            <button class="btn btn-ghost full-width" onclick="closeAppModal()">Cancel</button>
            <button class="btn btn-danger full-width" onclick="window.__pendingConfirm && window.__pendingConfirm(); closeAppModal();">Confirm</button>
        </div>
    `);
}

// Generic form modal. fields: [{id, label, type, placeholder, value, options:[{value,label}]}]
// onSubmit receives an object keyed by field id.
function showFormModal(title, fields, submitLabel, onSubmit) {
    const fieldsHtml = fields.map(f => {
        if (f.type === 'select') {
            const opts = f.options.map(o => `<option value="${o.value}" ${o.value === f.value ? 'selected' : ''}>${o.label}</option>`).join('');
            return `
                <div class="form-group">
                    <label for="modal-${f.id}">${f.label}</label>
                    <select id="modal-${f.id}">${opts}</select>
                </div>`;
        }
        return `
            <div class="form-group">
                <label for="modal-${f.id}">${f.label}</label>
                <input type="${f.type || 'text'}" id="modal-${f.id}" placeholder="${f.placeholder || ''}" value="${f.value != null ? f.value : ''}">
            </div>`;
    }).join('');

    window.__pendingSubmit = () => {
        const values = {};
        fields.forEach(f => {
            const el = document.getElementById(`modal-${f.id}`);
            values[f.id] = f.type === 'number' ? parseFloat(el.value) : el.value.trim();
        });
        onSubmit(values);
    };

    openAppModal(`
        <h3>${title}</h3>
        <form onsubmit="event.preventDefault(); window.__pendingSubmit();">
            ${fieldsHtml}
            <div class="app-modal__actions app-modal__actions--split">
                <button type="button" class="btn btn-ghost full-width" onclick="closeAppModal()">Cancel</button>
                <button type="submit" class="btn btn-primary full-width">${submitLabel}</button>
            </div>
        </form>
    `);
}

// ============================================
// LOGIN SCREEN — CHARACTER REVEAL SEQUENCE
// ============================================

const LOGIN_REVEAL_MS = 650;

function resetLoginVisuals() {
    const charImg = document.getElementById('login-hero-char-img');
    const nameBadge = document.getElementById('login-name-badge');
    const pinGroup = document.getElementById('pin-group');
    const submitBtn = document.getElementById('login-submit-btn');
    const pinInput = document.getElementById('pin-input');

    if (charImg) charImg.classList.remove('is-visible');
    if (nameBadge) { nameBadge.classList.remove('is-visible'); nameBadge.textContent = ''; }
    if (pinGroup) pinGroup.classList.remove('is-visible');
    if (submitBtn) submitBtn.classList.remove('is-visible');
    if (pinInput) pinInput.value = '';

    document.documentElement.style.setProperty('--color-background', '#040404');
    document.documentElement.style.setProperty('--color-primary', '#3B82F6');
}

function revealLoginCharacter(userKey) {
    const character = window.Parallax && window.Parallax.getCharacter(userKey);
    const charImg = document.getElementById('login-hero-char-img');
    const nameBadge = document.getElementById('login-name-badge');
    const pinGroup = document.getElementById('pin-group');
    const submitBtn = document.getElementById('login-submit-btn');
    if (!character || !charImg) return;

    if (submitBtn) submitBtn.classList.remove('is-visible');
    if (pinGroup) pinGroup.classList.remove('is-visible');
    if (nameBadge) nameBadge.classList.remove('is-visible');

    window.Parallax.applyTheme(userKey);

    const wasVisible = charImg.classList.contains('is-visible');
    charImg.classList.remove('is-visible');

    const swapAndFadeIn = () => {
        charImg.src = character.image;
        charImg.alt = character.name;
        void charImg.offsetWidth;
        charImg.classList.add('is-visible');
    };

    if (wasVisible) {
        window.setTimeout(swapAndFadeIn, 250);
    } else {
        swapAndFadeIn();
    }

    window.setTimeout(() => {
        if (nameBadge) {
            nameBadge.textContent = character.name;
            nameBadge.classList.add('is-visible');
        }
        if (pinGroup) {
            pinGroup.classList.add('is-visible');
            const pinInput = document.getElementById('pin-input');
            if (pinInput) pinInput.focus();
        }
    }, LOGIN_REVEAL_MS);
}

function handleUserSelectChange(userKey) {
    if (!userKey) { resetLoginVisuals(); return; }
    revealLoginCharacter(userKey);
}

function handlePinInput(value) {
    const submitBtn = document.getElementById('login-submit-btn');
    if (!submitBtn) return;
    submitBtn.classList.toggle('is-visible', value.length === 4 && /^\d{4}$/.test(value));
}

function continueAsActiveCharacter() {
    const active = window.Parallax && window.Parallax.getActiveCharacter();
    if (active) {
        const select = document.getElementById('user-select');
        if (select) select.value = active.key;
        showScreen('login-screen');
        revealLoginCharacter(active.key);
    } else {
        showScreen('login-screen');
    }
}

// ============================================
// SCREEN NAVIGATION
// ============================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) targetScreen.classList.add('active');

    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        const isPreAuthScreen = screenId === 'landing-screen' || screenId === 'login-screen';
        bottomNav.classList.toggle('is-hidden', isPreAuthScreen);
    }

    if (screenId === 'login-screen') {
        const select = document.getElementById('user-select');
        if (select && !select.value) resetLoginVisuals();
    }

    // Lazily refresh screen content when navigating to it
    if (screenId === 'courses-screen') renderCourses();
    if (screenId === 'marks-screen') renderMarksOverview();
    if (screenId === 'leaderboard-screen') renderLeaderboardScreen();
    if (screenId === 'activities-screen') renderActivities();

    closeMenu();
}

function navigateTo(screenId, element) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');
    showScreen(screenId);
}

// ============================================
// AUTHENTICATION
// ============================================

async function handleLogin(event) {
    event.preventDefault();

    const userSelect = document.getElementById('user-select');
    const pinInput = document.getElementById('pin-input');
    const user = userSelect.value;
    const pin = pinInput.value;

    if (!user || !pin) { showAlertModal('Missing info', 'Please select a user and enter a PIN.'); return; }
    if (pin.length !== 4 || !/^\d+$/.test(pin)) { showAlertModal('Invalid PIN', 'PIN must be 4 digits.'); return; }

    const submitBtn = document.getElementById('login-submit-btn');
    if (submitBtn) submitBtn.textContent = 'Checking...';

    const result = await window.ParallaxDB.login(user, pin);

    if (submitBtn) submitBtn.textContent = 'Login';

    if (!result.ok) {
        if (result.reason === 'wrong-pin') {
            showAlertModal('Incorrect PIN', 'That PIN doesn\'t match this account.');
        } else {
            showAlertModal('Login Failed', 'Something went wrong. Please try again.');
        }
        return;
    }

    STATE.currentUser = user;
    STATE.isAuthenticated = true;
    window.Parallax.applyTheme(user);

    if (STATE.deviceCapabilities.hasLocalStorage) {
        localStorage.setItem(CONFIG.STORAGE_KEY_PREFIX + 'currentUser', user);
    }

    document.getElementById('user-greeting').textContent = `Welcome, ${user.charAt(0).toUpperCase() + user.slice(1)}`;

    if (result.firstTime) {
        showAlertModal('PIN Set', `This PIN is now saved for ${user.charAt(0).toUpperCase() + user.slice(1)}. Use it to log in from now on.`);
    }

    await loadUserData();
    showScreen('dashboard-screen');
    await maybeShowOnboarding();
    checkForReminders();

    pinInput.value = '';
    resetLoginVisuals();
    userSelect.value = '';
}

function handleLogout() {
    STATE.currentUser = null;
    STATE.isAuthenticated = false;
    STATE.courses = [];
    STATE.assessmentsByCourse = {};
    STATE.marksByCourse = {};
    STATE.semesterRecords = [];
    STATE.activityLog = [];

    if (STATE.deviceCapabilities.hasLocalStorage) {
        localStorage.removeItem(CONFIG.STORAGE_KEY_PREFIX + 'currentUser');
    }

    showScreen('landing-screen');
    closeMenu();
}

// ============================================
// DATA LOADING
// ============================================

async function loadUserData() {
    if (STATE.deviceCapabilities.hasLocalStorage) {
        const storedActivity = localStorage.getItem(CONFIG.STORAGE_KEY_PREFIX + 'activity_' + STATE.currentUser);
        STATE.activityLog = storedActivity ? JSON.parse(storedActivity) : [];
    }

    STATE.courses = await window.ParallaxDB.getCourses(CONFIG.CURRENT_SEMESTER);
    STATE.semesterRecords = await window.ParallaxDB.getSemesterRecords(STATE.currentUser);

    // Pull assessments + marks for every current course (needed for dashboard GPA + leaderboards)
    await Promise.all(STATE.courses.map(async course => {
        STATE.assessmentsByCourse[course.id] = await window.ParallaxDB.getAssessments(course.id);
        STATE.marksByCourse[course.id] = await window.ParallaxDB.getMarksForCourse(course.id);
    }));

    updateDashboard();
    renderCourses();
    renderMarksOverview();
    populateLeaderboardCourseOptions();
}

// ============================================
// DASHBOARD
// ============================================

function currentSemesterStandingsFor(username) {
    // Weighted across all of this semester's courses, weighted by credit hours
    let totalWeightedPoints = 0;
    let totalCredits = 0;
    let anyGraded = false;

    STATE.courses.forEach(course => {
        const marks = STATE.marksByCourse[course.id] || [];
        const { standings } = window.MathEngine.courseStandings(marks, course.weightage_config);
        const mine = standings.find(s => s.username === username);
        if (mine) {
            anyGraded = true;
            totalWeightedPoints += mine.gradePoints * course.credit_hours;
            totalCredits += course.credit_hours;
        }
    });

    return {
        gpa: anyGraded && totalCredits > 0 ? totalWeightedPoints / totalCredits : null,
        credits: totalCredits
    };
}

function updateDashboard() {
    const coursesCount = STATE.courses.length;
    const currentCredits = STATE.courses.reduce((sum, c) => sum + Number(c.credit_hours), 0);
    const completedCredits = STATE.semesterRecords.reduce((sum, r) => sum + Number(r.credit_hours), 0);

    const cgpa = STATE.semesterRecords.length > 0
        ? STATE.semesterRecords.reduce((sum, r) => sum + r.gpa * r.credit_hours, 0) / completedCredits
        : null;

    const latestSemester = STATE.semesterRecords[STATE.semesterRecords.length - 1];
    const { gpa: termGPA } = currentSemesterStandingsFor(STATE.currentUser);

    document.getElementById('courses-count').textContent = coursesCount;
    document.getElementById('current-credits-value').textContent = currentCredits;
    document.getElementById('completed-credits-value').textContent = completedCredits;
    document.getElementById('cgpa-value').textContent = cgpa !== null ? cgpa.toFixed(2) : '-';
    document.getElementById('term-gpa-value').textContent = termGPA !== null ? termGPA.toFixed(2) : '-';
    document.getElementById('prev-gpa-value').textContent = latestSemester ? latestSemester.gpa.toFixed(2) : '-';
    document.getElementById('prev-gpa-label').textContent = latestSemester ? latestSemester.semester : 'GPA';

    if (STATE.profile && STATE.profile.total_degree_credit_hours) {
        const totalTracked = completedCredits + currentCredits;
        const pct = (totalTracked / STATE.profile.total_degree_credit_hours) * 100;
        document.getElementById('degree-progress-value').textContent = `${Math.min(pct, 100).toFixed(0)}%`;
        document.getElementById('degree-progress-label').textContent = `${totalTracked} / ${STATE.profile.total_degree_credit_hours} hrs`;
    }

    updateActivityLog();
}

function updateActivityLog() {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;

    if (STATE.activityLog.length === 0) {
        activityList.innerHTML = '<p class="empty-state">No activity yet. Add your first course!</p>';
        return;
    }

    activityList.innerHTML = STATE.activityLog
        .slice(-5)
        .reverse()
        .map(activity => `
            <div class="activity-item">
                <div>${activity.action}</div>
                <div class="activity-time">${new Date(activity.timestamp).toLocaleString()}</div>
            </div>
        `)
        .join('');
}

// ============================================
// COURSES (shared catalog)
// ============================================

function showAddCourseModal() {
    showFormModal(
        'Add a Course',
        [
            { id: 'name', label: 'Course Name', placeholder: 'e.g. Data Structures' },
            { id: 'creditHours', label: 'Credit Hours', type: 'number', value: 3 }
        ],
        'Add Course',
        async (values) => {
            if (!values.name) { showAlertModal('Missing info', 'Please enter a course name.'); return; }
            if (!values.creditHours || values.creditHours <= 0) { showAlertModal('Missing info', 'Please enter valid credit hours.'); return; }

            const course = await window.ParallaxDB.addCourse(values.name, values.creditHours, CONFIG.CURRENT_SEMESTER, STATE.currentUser);
            closeAppModal();
            if (!course) { showAlertModal('Error', 'Could not add course. It may already exist this semester.'); return; }

            STATE.courses.push(course);
            STATE.assessmentsByCourse[course.id] = [];
            STATE.marksByCourse[course.id] = [];
            logActivity(`Added course: ${values.name}`);
            updateDashboard();
            renderCourses();
        }
    );
}

function renderCourses() {
    const coursesList = document.getElementById('courses-list');
    if (!coursesList) return;

    if (STATE.courses.length === 0) {
        coursesList.innerHTML = '<p class="empty-state">No courses yet. Add the first one for this semester!</p>';
        return;
    }

    coursesList.innerHTML = STATE.courses.map(course => `
        <div class="course-card" onclick="openCourseDetail('${course.id}')">
            <div class="course-title">${course.name}</div>
            <div class="course-info">
                <p>Credit Hours: ${course.credit_hours}</p>
                <p>Added by: ${course.created_by ? course.created_by.charAt(0).toUpperCase() + course.created_by.slice(1) : 'Unknown'}</p>
            </div>
            <button class="btn btn-secondary" onclick="event.stopPropagation(); deleteCourseConfirm('${course.id}')">Delete</button>
        </div>
    `).join('');
}

function deleteCourseConfirm(courseId) {
    showConfirmModal('Delete Course', 'This removes the course and all its assessments/marks for everyone. Continue?', async () => {
        const ok = await window.ParallaxDB.deleteCourse(courseId);
        if (!ok) { showAlertModal('Error', 'Could not delete this course.'); return; }
        STATE.courses = STATE.courses.filter(c => c.id !== courseId);
        delete STATE.assessmentsByCourse[courseId];
        delete STATE.marksByCourse[courseId];
        logActivity('Deleted a course');
        updateDashboard();
        renderCourses();
        renderMarksOverview();
    });
}

// ============================================
// MARKS OVERVIEW (personal summary across courses)
// ============================================

function renderMarksOverview() {
    const list = document.getElementById('marks-list');
    if (!list) return;

    if (STATE.courses.length === 0) {
        list.innerHTML = '<p class="empty-state">No courses yet. Add one from the Courses tab first!</p>';
        return;
    }

    list.innerHTML = STATE.courses.map(course => {
        const marks = STATE.marksByCourse[course.id] || [];
        const { standings, classAverage } = window.MathEngine.courseStandings(marks, course.weightage_config);
        const mine = standings.find(s => s.username === STATE.currentUser);

        return `
            <div class="course-card" onclick="openCourseDetail('${course.id}')">
                <div class="course-title">${course.name}</div>
                <div class="course-info">
                    <p>Your Grade: ${mine ? `${mine.letter} (${mine.percentage.toFixed(1)}%)` : 'Not graded yet'}</p>
                    <p>Class Average: ${classAverage !== null ? classAverage.toFixed(1) + '%' : '-'}</p>
                    <p>Your Rank: ${mine ? `#${mine.rank} of ${standings.length}` : '-'}</p>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// COURSE DETAIL (assessments, marks entry, leaderboard)
// ============================================

let activeCourseDetailId = null;

async function openCourseDetail(courseId) {
    activeCourseDetailId = courseId;
    const course = STATE.courses.find(c => c.id === courseId);
    if (!course) return;

    document.getElementById('course-detail-title').textContent = course.name;
    showScreen('course-detail-screen');

    // Refresh this course's data in case it changed
    STATE.assessmentsByCourse[courseId] = await window.ParallaxDB.getAssessments(courseId);
    STATE.marksByCourse[courseId] = await window.ParallaxDB.getMarksForCourse(courseId);

    renderCourseDetail(course);
}

function renderCourseDetail(course) {
    const assessments = STATE.assessmentsByCourse[course.id] || [];
    const marks = STATE.marksByCourse[course.id] || [];
    const { standings, classAverage } = window.MathEngine.courseStandings(marks, course.weightage_config);
    const mine = standings.find(s => s.username === STATE.currentUser);

    document.getElementById('course-detail-summary').innerHTML = `
        <div class="metrics-grid metrics-grid--compact">
            <div class="metric-card">
                <div class="metric-label">Your Grade</div>
                <div class="metric-value">${mine ? mine.letter : '-'}</div>
                <div class="metric-trend">${mine ? mine.percentage.toFixed(1) + '%' : 'Not graded yet'}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Class Average</div>
                <div class="metric-value">${classAverage !== null ? classAverage.toFixed(1) : '-'}</div>
                <div class="metric-trend">Percent</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Your Rank</div>
                <div class="metric-value">${mine ? '#' + mine.rank : '-'}</div>
                <div class="metric-trend">of ${standings.length || 0}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Credit Hours</div>
                <div class="metric-value">${course.credit_hours}</div>
                <div class="metric-trend">This Course</div>
            </div>
        </div>
        <p class="screen-subtext">Grades here are relative — your projected letter is based on how you compare to the class, not a fixed cutoff.</p>
    `;

    const weightageConfig = course.weightage_config || window.MathEngine.DEFAULT_WEIGHTAGE;
    document.getElementById('course-weightage-display').innerHTML = Object.entries(weightageConfig)
        .map(([cat, pct]) => `
            <div class="weightage-row">
                <span class="weightage-row-label">${cat}</span>
                <div class="weightage-bar"><div class="weightage-bar-fill" style="width:${pct}%"></div></div>
                <span class="weightage-row-value">${pct}%</span>
            </div>
        `).join('');

    const assessmentsList = document.getElementById('course-assessments-list');
    if (assessments.length === 0) {
        assessmentsList.innerHTML = '<p class="empty-state">No assessments yet. Add a quiz, assignment, or exam.</p>';
    } else {
        assessmentsList.innerHTML = assessments.map(a => {
            const myMark = marks.find(m => m.assessment_id === a.id && m.username === STATE.currentUser);
            return `
                <div class="course-card">
                    <div class="course-title">${a.title} <span class="assessment-type">${a.type}</span></div>
                    <div class="course-info">
                        <p>Total Marks: ${a.total_marks}${a.class_average != null ? ` · Announced Class Avg: ${a.class_average}` : ''}</p>
                        <p>Your Marks: ${myMark ? `${myMark.obtained_marks} / ${a.total_marks}` : 'Not entered yet'}</p>
                    </div>
                    <div class="course-card-actions">
                        <button class="btn btn-primary" onclick="showEnterMarksModal('${a.id}', ${a.total_marks}, '${a.title.replace(/'/g, "\\'")}')">${myMark ? 'Update' : 'Enter'} Marks</button>
                        <button class="btn btn-secondary" onclick="showAssessmentLeaderboard('${a.id}', '${a.title.replace(/'/g, "\\'")}', ${a.total_marks})">Leaderboard</button>
                        <button class="btn btn-secondary" onclick="deleteAssessmentConfirm('${a.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderAttendanceSummary(course.id);

    const leaderboardList = document.getElementById('course-leaderboard-list');
    if (standings.length === 0) {
        leaderboardList.innerHTML = '<p class="empty-state">No marks recorded yet.</p>';
    } else {
        leaderboardList.innerHTML = renderLeaderboardRows(standings.map(s => ({
            username: s.username,
            value: `${s.percentage.toFixed(1)}%`,
            sub: s.letter,
            rank: s.rank
        })));
    }
}

async function renderAttendanceSummary(courseId) {
    const el = document.getElementById('course-attendance-summary');
    if (!el) return;
    const mine = await window.ParallaxDB.getAttendance(courseId, STATE.currentUser);
    const rate = window.MathEngine.attendanceRate(mine);
    el.innerHTML = rate !== null
        ? `<p>Your Attendance: ${rate.toFixed(0)}% (${mine.filter(r => r.status === 'present').length}/${mine.length} classes)</p>`
        : '<p>No attendance marked yet.</p>';
}

function showWeightageModal() {
    const course = STATE.courses.find(c => c.id === activeCourseDetailId);
    const config = course.weightage_config || window.MathEngine.DEFAULT_WEIGHTAGE;

    showFormModal(
        `Weightage — ${course.name}`,
        [
            { id: 'quiz', label: 'Quiz (%)', type: 'number', value: config.quiz },
            { id: 'assignment', label: 'Assignment (%)', type: 'number', value: config.assignment },
            { id: 'presentation', label: 'Presentation (%)', type: 'number', value: config.presentation },
            { id: 'midterm', label: 'Midterm (%)', type: 'number', value: config.midterm },
            { id: 'final', label: 'Final (%)', type: 'number', value: config.final }
        ],
        'Save',
        async (values) => {
            const newConfig = {
                quiz: values.quiz, assignment: values.assignment, presentation: values.presentation,
                midterm: values.midterm, final: values.final
            };
            if (!window.MathEngine.validateWeightageConfig(newConfig)) {
                showAlertModal('Doesn\'t add up', 'These weightages must total exactly 100%.');
                return;
            }
            const updated = await window.ParallaxDB.updateWeightageConfig(activeCourseDetailId, newConfig);
            closeAppModal();
            if (!updated) { showAlertModal('Error', 'Could not save the weightage matrix.'); return; }

            const idx = STATE.courses.findIndex(c => c.id === activeCourseDetailId);
            STATE.courses[idx] = updated;
            window.Notifications.showToast('Weightage matrix updated');
            renderCourseDetail(updated);
            updateDashboard();
        }
    );
}

function showMarkAttendanceModal() {
    const todayStr = new Date().toISOString().slice(0, 10);
    showFormModal(
        'Mark Attendance — Today',
        [{ id: 'status', label: 'Status', type: 'select', value: 'present', options: [
            { value: 'present', label: 'Present' },
            { value: 'absent', label: 'Absent' },
            { value: 'leave', label: 'Leave' }
        ]}],
        'Save',
        async (values) => {
            const result = await window.ParallaxDB.markAttendance(activeCourseDetailId, STATE.currentUser, todayStr, values.status);
            closeAppModal();
            if (!result) { showAlertModal('Error', 'Could not save attendance.'); return; }
            window.Notifications.showToast('Attendance saved');
            renderAttendanceSummary(activeCourseDetailId);
        }
    );
}

function showAddAssessmentModal() {
    showFormModal(
        'Add Assessment',
        [
            { id: 'type', label: 'Category', type: 'select', value: 'quiz', options: [
                { value: 'quiz', label: 'Quiz' },
                { value: 'assignment', label: 'Assignment' },
                { value: 'presentation', label: 'Presentation' },
                { value: 'midterm', label: 'Midterm' },
                { value: 'final', label: 'Final' }
            ]},
            { id: 'title', label: 'Title', placeholder: 'e.g. Quiz 1' },
            { id: 'totalMarks', label: 'Total Marks', type: 'number', value: 10 },
            { id: 'classAverage', label: 'Class Average (optional, if announced)', type: 'number', placeholder: 'Leave blank to compute from logged marks' }
        ],
        'Add Assessment',
        async (values) => {
            if (!values.title || !values.totalMarks) {
                showAlertModal('Missing info', 'Please fill in the title and total marks.');
                return;
            }
            const assessment = await window.ParallaxDB.addAssessment(
                activeCourseDetailId, values.type, values.title, values.totalMarks, STATE.currentUser, values.classAverage
            );
            closeAppModal();
            if (!assessment) { showAlertModal('Error', 'Could not add this assessment.'); return; }

            STATE.assessmentsByCourse[activeCourseDetailId].push(assessment);
            logActivity(`Added ${values.type}: ${values.title}`);
            const course = STATE.courses.find(c => c.id === activeCourseDetailId);
            renderCourseDetail(course);
        }
    );
}

function deleteAssessmentConfirm(assessmentId) {
    showConfirmModal('Delete Assessment', 'This removes it and everyone\'s marks for it. Continue?', async () => {
        const ok = await window.ParallaxDB.deleteAssessment(assessmentId);
        if (!ok) { showAlertModal('Error', 'Could not delete this assessment.'); return; }
        STATE.assessmentsByCourse[activeCourseDetailId] = STATE.assessmentsByCourse[activeCourseDetailId].filter(a => a.id !== assessmentId);
        STATE.marksByCourse[activeCourseDetailId] = await window.ParallaxDB.getMarksForCourse(activeCourseDetailId);
        logActivity('Deleted an assessment');
        const course = STATE.courses.find(c => c.id === activeCourseDetailId);
        renderCourseDetail(course);
    });
}

function showEnterMarksModal(assessmentId, totalMarks, title) {
    showFormModal(
        `Marks — ${title}`,
        [{ id: 'obtained', label: `Obtained (out of ${totalMarks})`, type: 'number' }],
        'Save',
        async (values) => {
            if (values.obtained == null || isNaN(values.obtained)) { showAlertModal('Missing info', 'Please enter your marks.'); return; }
            if (values.obtained > totalMarks) { showAlertModal('Too high', `Marks can't exceed ${totalMarks}.`); return; }

            const result = await window.ParallaxDB.upsertMark(assessmentId, STATE.currentUser, values.obtained);
            closeAppModal();
            if (!result) { showAlertModal('Error', 'Could not save your marks.'); return; }

            STATE.marksByCourse[activeCourseDetailId] = await window.ParallaxDB.getMarksForCourse(activeCourseDetailId);
            logActivity(`Recorded marks for ${title}`);
            updateDashboard();
            const course = STATE.courses.find(c => c.id === activeCourseDetailId);
            renderCourseDetail(course);
        }
    );
}

function showAssessmentLeaderboard(assessmentId, title, totalMarks) {
    const marks = (STATE.marksByCourse[activeCourseDetailId] || []).filter(m => m.assessment_id === assessmentId);
    const board = window.MathEngine.assessmentLeaderboard(marks, totalMarks);

    const rowsHtml = board.length
        ? renderLeaderboardRows(board.map(b => ({ username: b.username, value: `${b.obtained}/${totalMarks}`, sub: `${b.percentage.toFixed(1)}%`, rank: b.rank })))
        : '<p class="empty-state">No marks recorded yet.</p>';

    openAppModal(`
        <h3>${title} — Leaderboard</h3>
        <div class="leaderboard-list">${rowsHtml}</div>
        <div class="app-modal__actions">
            <button class="btn btn-primary full-width" onclick="closeAppModal()">Close</button>
        </div>
    `);
}

// ============================================
// LEADERBOARD SCREEN
// ============================================

function populateLeaderboardCourseOptions() {
    const select = document.getElementById('leaderboard-course-select');
    if (!select) return;
    const current = select.value;
    select.innerHTML = `
        <option value="overall">Overall (Current Semester GPA)</option>
        <option value="clutch">Clutch Rating (Midterm → Final)</option>
        <option value="attendance">Attendance</option>
        ${STATE.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
    `;
    const validValues = ['overall', 'clutch', 'attendance', ...STATE.courses.map(c => c.id)];
    select.value = validValues.includes(current) ? current : 'overall';
}

function renderLeaderboardScreen() {
    populateLeaderboardCourseOptions();
    renderSelectedLeaderboard();
}

function renderSelectedLeaderboard() {
    const select = document.getElementById('leaderboard-course-select');
    const content = document.getElementById('leaderboard-content');
    if (!select || !content) return;

    if (select.value === 'overall') {
        const rows = CONFIG.USERS.map(username => {
            const { gpa, credits } = currentSemesterStandingsFor(username);
            return { username, gpa, credits };
        }).filter(r => r.gpa !== null).sort((a, b) => b.gpa - a.gpa);

        content.innerHTML = rows.length
            ? renderLeaderboardRows(rows.map((r, i) => ({ username: r.username, value: r.gpa.toFixed(2), sub: 'Projected GPA', rank: i + 1 })))
            : '<p class="empty-state">Add courses and marks to see rankings.</p>';
        return;
    }

    if (select.value === 'clutch') {
        const allMarks = STATE.courses.flatMap(c => STATE.marksByCourse[c.id] || []);
        const board = window.MathEngine.clutchRating(allMarks);
        content.innerHTML = board.length
            ? renderLeaderboardRows(board.map(b => ({
                username: b.username,
                value: `${b.improvement >= 0 ? '+' : ''}${b.improvement.toFixed(1)}%`,
                sub: `${b.midtermPct.toFixed(0)}% → ${b.finalPct.toFixed(0)}%`,
                rank: b.rank
            })))
            : '<p class="empty-state">Need both Midterm and Final marks logged to compute this.</p>';
        return;
    }

    if (select.value === 'attendance') {
        window.ParallaxDB.getAllAttendanceForCourses(STATE.courses.map(c => c.id)).then(allAttendance => {
            const rows = CONFIG.USERS.map(username => {
                const mine = allAttendance.filter(r => r.username === username);
                const rate = window.MathEngine.attendanceRate(mine);
                return { username, rate, count: mine.length };
            }).filter(r => r.rate !== null).sort((a, b) => b.rate - a.rate);

            content.innerHTML = rows.length
                ? renderLeaderboardRows(rows.map((r, i) => ({ username: r.username, value: `${r.rate.toFixed(0)}%`, sub: `${r.count} classes tracked`, rank: i + 1 })))
                : '<p class="empty-state">No attendance marked yet.</p>';
        });
        return;
    }

    const course = STATE.courses.find(c => c.id === select.value);
    const marks = STATE.marksByCourse[select.value] || [];
    const { standings } = window.MathEngine.courseStandings(marks, course ? course.weightage_config : undefined);

    content.innerHTML = standings.length
        ? renderLeaderboardRows(standings.map(s => ({ username: s.username, value: `${s.percentage.toFixed(1)}%`, sub: s.letter, rank: s.rank })))
        : `<p class="empty-state">No marks recorded yet for ${course ? course.name : 'this course'}.</p>`;
}

function renderLeaderboardRows(rows) {
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    return rows.map(r => `
        <div class="leaderboard-row ${r.username === STATE.currentUser ? 'leaderboard-row--me' : ''}">
            <div class="leaderboard-rank">${medals[r.rank] || '#' + r.rank}</div>
            <div class="leaderboard-name">${r.username.charAt(0).toUpperCase() + r.username.slice(1)}</div>
            <div class="leaderboard-value">
                <span>${r.value}</span>
                <span class="leaderboard-sub">${r.sub}</span>
            </div>
        </div>
    `).join('');
}

// ============================================
// SETTINGS
// ============================================

function showChangePINModal() {
    showFormModal(
        'Change PIN',
        [{ id: 'pin', label: 'New 4-digit PIN', type: 'password' }],
        'Save',
        async (values) => {
            if (!values.pin || values.pin.length !== 4 || !/^\d+$/.test(values.pin)) {
                showAlertModal('Invalid PIN', 'PIN must be exactly 4 digits.');
                return;
            }
            const ok = await window.ParallaxDB.changePin(STATE.currentUser, values.pin);
            closeAppModal();
            showAlertModal(ok ? 'PIN Updated' : 'Error', ok ? 'Your PIN has been changed.' : 'Could not update your PIN.');
        }
    );
}

function showAddSemesterModal() {
    showFormModal(
        'Add Previous Semester',
        [
            { id: 'semester', label: 'Semester', placeholder: 'e.g. Spring 2026' },
            { id: 'gpa', label: 'GPA', type: 'number', placeholder: 'e.g. 3.7' },
            { id: 'creditHours', label: 'Credit Hours', type: 'number', placeholder: 'e.g. 18' }
        ],
        'Save',
        async (values) => {
            if (!values.semester || !values.gpa || !values.creditHours) {
                showAlertModal('Missing info', 'Please fill in all fields.');
                return;
            }
            const record = await window.ParallaxDB.upsertSemesterRecord(STATE.currentUser, values.semester, values.gpa, values.creditHours);
            closeAppModal();
            if (!record) { showAlertModal('Error', 'Could not save this semester.'); return; }

            STATE.semesterRecords = STATE.semesterRecords.filter(r => r.semester !== values.semester);
            STATE.semesterRecords.push(record);
            logActivity(`Added semester record: ${values.semester}`);
            updateDashboard();
        }
    );
}

// ============================================
// ACTIVITIES / TASKS
// ============================================

async function renderActivities() {
    const list = document.getElementById('activities-list');
    if (!list) return;

    const activities = await window.ParallaxDB.getActivities(STATE.courses.map(c => c.id));
    STATE.activities = activities;

    if (activities.length === 0) {
        list.innerHTML = '<p class="empty-state">No upcoming tasks. Add a deadline to get reminders.</p>';
        return;
    }

    const now = Date.now();
    list.innerHTML = activities.map(a => {
        const due = new Date(a.due_at);
        const isOverdue = due.getTime() < now;
        const course = STATE.courses.find(c => c.id === a.course_id);
        return `
            <div class="course-card">
                <div class="course-title">${a.title} ${isOverdue ? '<span class="assessment-type assessment-type--overdue">overdue</span>' : ''}</div>
                <div class="course-info">
                    ${course ? `<p>Course: ${course.name}</p>` : '<p>General task</p>'}
                    <p>Due: ${due.toLocaleString()}</p>
                    ${a.description ? `<p>${a.description}</p>` : ''}
                </div>
                <button class="btn btn-secondary" onclick="deleteActivityConfirm('${a.id}')">Delete</button>
            </div>
        `;
    }).join('');
}

function showAddActivityModal() {
    const courseOptions = [{ value: '', label: 'General (no specific course)' }, ...STATE.courses.map(c => ({ value: c.id, label: c.name }))];

    showFormModal(
        'Add Task',
        [
            { id: 'title', label: 'Title', placeholder: 'e.g. Assignment 2 Submission' },
            { id: 'courseId', label: 'Course', type: 'select', value: '', options: courseOptions },
            { id: 'dueAt', label: 'Due Date & Time', type: 'datetime-local' },
            { id: 'description', label: 'Notes (optional)', placeholder: 'Any extra detail' }
        ],
        'Add Task',
        async (values) => {
            if (!values.title || !values.dueAt) { showAlertModal('Missing info', 'Please enter a title and due date.'); return; }

            const activity = await window.ParallaxDB.addActivity(values.courseId || null, values.title, values.description, new Date(values.dueAt).toISOString(), STATE.currentUser);
            closeAppModal();
            if (!activity) { showAlertModal('Error', 'Could not add this task.'); return; }

            window.Notifications.showToast('Task added');
            logActivity(`Added task: ${values.title}`);
            renderActivities();
        }
    );
}

function deleteActivityConfirm(activityId) {
    showConfirmModal('Delete Task', 'Remove this task for everyone?', async () => {
        const ok = await window.ParallaxDB.deleteActivity(activityId);
        if (!ok) { showAlertModal('Error', 'Could not delete this task.'); return; }
        window.Notifications.showToast('Task deleted');
        renderActivities();
    });
}

async function checkForReminders() {
    if (!STATE.currentUser) return;
    await window.Notifications.requestNotificationPermission();
    const activities = await window.ParallaxDB.getActivities(STATE.courses.map(c => c.id));
    await window.Notifications.checkDeadlineReminders(STATE.currentUser, activities);
}

// ============================================
// ONBOARDING WIZARD
// ============================================

async function maybeShowOnboarding() {
    const profile = await window.ParallaxDB.getProfile(STATE.currentUser);
    STATE.profile = profile;
    if (profile && profile.onboarded) return;
    showOnboardingStep1();
}

function showOnboardingStep1() {
    showFormModal(
        'Welcome — Quick Setup (1/2)',
        [{ id: 'totalCreditHours', label: 'Total credit hours for your full degree', type: 'number', placeholder: 'e.g. 130' }],
        'Next',
        (values) => {
            if (!values.totalCreditHours || values.totalCreditHours <= 0) {
                showAlertModal('Missing info', 'Please enter your degree\'s total credit hours.');
                return;
            }
            showOnboardingStep2(values.totalCreditHours);
        }
    );
}

function showOnboardingStep2(totalCreditHours) {
    showFormModal(
        'Welcome — Quick Setup (2/2)',
        [{ id: 'semesterNumber', label: 'Which semester are you in right now?', type: 'number', placeholder: 'e.g. 3' }],
        'Finish',
        async (values) => {
            if (!values.semesterNumber || values.semesterNumber <= 0) {
                showAlertModal('Missing info', 'Please enter your current semester number.');
                return;
            }
            const profile = await window.ParallaxDB.saveProfile(STATE.currentUser, totalCreditHours, values.semesterNumber);
            closeAppModal();
            if (!profile) { showAlertModal('Error', 'Could not save your setup.'); return; }
            STATE.profile = profile;

            if (values.semesterNumber > 1) {
                showAlertModal(
                    'One more thing',
                    'Since this isn\'t your first semester, add your past semester GPAs from Settings → "Add Previous Semester" so your CGPA is accurate.'
                );
            } else {
                window.Notifications.showToast('Setup complete — welcome to Parallax!');
            }
        }
    );
}

// ============================================
// MENU MANAGEMENT
// ============================================

function toggleMenu() {
    document.getElementById('menu-modal').classList.toggle('active');
}

function closeMenu() {
    document.getElementById('menu-modal').classList.remove('active');
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    detectDeviceCapabilities();
    resetLoginVisuals();

    if (STATE.deviceCapabilities.hasLocalStorage) {
        const savedUser = localStorage.getItem(CONFIG.STORAGE_KEY_PREFIX + 'currentUser');
        if (savedUser) {
            STATE.currentUser = savedUser;
            STATE.isAuthenticated = true;
            if (window.Parallax) window.Parallax.applyTheme(savedUser);
            document.getElementById('user-greeting').textContent = `Welcome, ${savedUser.charAt(0).toUpperCase() + savedUser.slice(1)}`;
            await loadUserData();
            showScreen('dashboard-screen');
            await maybeShowOnboarding();
            checkForReminders();
        }
    }

    document.addEventListener('click', (e) => {
        const modal = document.getElementById('menu-modal');
        if (modal.classList.contains('active') && !modal.contains(e.target) && !e.target.classList.contains('btn-icon')) {
            closeMenu();
        }
    });
});
