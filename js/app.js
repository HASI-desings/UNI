/* ============================================
   PARALLAX PWA - MAIN APPLICATION
   Pure JavaScript - No Dependencies
   ============================================ */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    SUPABASE_URL: 'https://bgaplkwkdsydoyzypdyj.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYXBsa3drZHN5ZG95enlwZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDc5MjksImV4cCI6MjA5ODY4MzkyOX0.6GejkhL5abtYuyBFOn8Wqw_Ve8fhhHW',
    USERS: ['hussnain', 'faizan', 'alima', 'haroon', 'mahdiya'],
    STORAGE_KEY_PREFIX: 'parallax_'
};

// ============================================
// STATE MANAGEMENT
// ============================================

const STATE = {
    currentUser: null,
    isAuthenticated: false,
    courses: [],
    grades: [],
    activityLog: [],
    deviceCapabilities: {}
};

// ============================================
// DEVICE CAPABILITY DETECTION
// ============================================

function detectDeviceCapabilities() {
    STATE.deviceCapabilities = {
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isTablet: /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent),
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
        })(),
        hasIndexedDB: !!window.indexedDB,
        hasNotifications: 'Notification' in window,
        hasVibration: 'vibrate' in navigator,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1,
        touchSupport: () => {
            return (('ontouchstart' in window) ||
                    (navigator.maxTouchPoints > 0) ||
                    (navigator.msMaxTouchPoints > 0));
        }
    };

    console.log('Device Capabilities:', STATE.deviceCapabilities);
    return STATE.deviceCapabilities;
}

const LOGIN_REVEAL_MS = 650; // matches the character's move-in transition

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

    // Reset anything left over from a previous selection
    if (submitBtn) submitBtn.classList.remove('is-visible');
    if (pinGroup) pinGroup.classList.remove('is-visible');
    if (nameBadge) nameBadge.classList.remove('is-visible');

    // Background shifts to the selected user immediately
    window.Parallax.applyTheme(userKey);

    // Fade the current character out, swap the art, fade the new one in —
    // this way switching between two already-selected users still crossfades
    const wasVisible = charImg.classList.contains('is-visible');
    charImg.classList.remove('is-visible');

    const swapAndFadeIn = () => {
        charImg.src = character.image;
        charImg.alt = character.name;
        void charImg.offsetWidth; // restart the transition
        charImg.classList.add('is-visible');
    };

    if (wasVisible) {
        window.setTimeout(swapAndFadeIn, 250);
    } else {
        swapAndFadeIn();
    }

    // Once the character settles, reveal their name top-right, then the PIN field
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
    if (!userKey) {
        resetLoginVisuals();
        return;
    }
    revealLoginCharacter(userKey);
}

function handlePinInput(value) {
    const submitBtn = document.getElementById('login-submit-btn');
    if (!submitBtn) return;
    const isComplete = value.length === 4 && /^\d{4}$/.test(value);
    submitBtn.classList.toggle('is-visible', isComplete);
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
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }

    // Bottom nav only belongs to the authenticated app screens
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        const isPreAuthScreen = screenId === 'landing-screen' || screenId === 'login-screen';
        bottomNav.classList.toggle('is-hidden', isPreAuthScreen);
    }

    // Starting a fresh login attempt (not arriving with a character already chosen)
    if (screenId === 'login-screen') {
        const select = document.getElementById('user-select');
        if (select && !select.value) resetLoginVisuals();
    }

    // Close menu if open
    closeMenu();
}

function navigateTo(screenId, element) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');

    // Show screen
    showScreen(screenId);
}

// ============================================
// AUTHENTICATION
// ============================================

function handleLogin(event) {
    event.preventDefault();

    const userSelect = document.getElementById('user-select');
    const pinInput = document.getElementById('pin-input');
    const user = userSelect.value;
    const pin = pinInput.value;

    if (!user || !pin) {
        alert('Please select a user and enter a PIN');
        return;
    }

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
        alert('PIN must be 4 digits');
        return;
    }

    // Store authentication
    STATE.currentUser = user;
    STATE.isAuthenticated = true;

    // Lock in this user's character theme across the app
    if (window.Parallax) window.Parallax.applyTheme(user);

    // Save to localStorage
    if (STATE.deviceCapabilities.hasLocalStorage) {
        localStorage.setItem(CONFIG.STORAGE_KEY_PREFIX + 'currentUser', user);
        localStorage.setItem(CONFIG.STORAGE_KEY_PREFIX + 'pin_' + user, btoa(pin)); // Simple encoding
    }

    // Update greeting
    document.getElementById('user-greeting').textContent = `Welcome, ${user.charAt(0).toUpperCase() + user.slice(1)}`;

    // Load user data
    loadUserData();

    // Show dashboard
    showScreen('dashboard-screen');

    // Clear form + reset the login screen's staged reveal for next time
    pinInput.value = '';
    resetLoginVisuals();
    userSelect.value = '';
}

function handleLogout() {
    STATE.currentUser = null;
    STATE.isAuthenticated = false;
    STATE.courses = [];
    STATE.grades = [];
    STATE.activityLog = [];

    // Clear localStorage
    if (STATE.deviceCapabilities.hasLocalStorage) {
        localStorage.removeItem(CONFIG.STORAGE_KEY_PREFIX + 'currentUser');
    }

    showScreen('landing-screen');
}

// ============================================
// DATA MANAGEMENT
// ============================================

function loadUserData() {
    // Load from localStorage (no fake data)
    if (STATE.deviceCapabilities.hasLocalStorage) {
        const storedCourses = localStorage.getItem(CONFIG.STORAGE_KEY_PREFIX + 'courses_' + STATE.currentUser);
        const storedGrades = localStorage.getItem(CONFIG.STORAGE_KEY_PREFIX + 'grades_' + STATE.currentUser);

        STATE.courses = storedCourses ? JSON.parse(storedCourses) : [];
        STATE.grades = storedGrades ? JSON.parse(storedGrades) : [];
    }

    updateDashboard();
}

function updateDashboard() {
    // Update metrics
    updateMetrics();

    // Update activity log
    updateActivityLog();
}

function updateMetrics() {
    const coursesCount = STATE.courses.length;
    const cgpa = calculateCGPA();
    const termGPA = calculateTermGPA();
    const avgGrade = calculateAverageGrade();

    document.getElementById('courses-count').textContent = coursesCount;
    document.getElementById('cgpa-value').textContent = cgpa !== null ? cgpa.toFixed(2) : '-';
    document.getElementById('term-gpa-value').textContent = termGPA !== null ? termGPA.toFixed(2) : '-';
    document.getElementById('avg-grade').textContent = avgGrade !== null ? avgGrade.toFixed(1) : '-';
}

function calculateCGPA() {
    if (STATE.courses.length === 0) return null;

    let totalPoints = 0;
    let totalCredits = 0;

    STATE.courses.forEach(course => {
        const courseGrades = STATE.grades.filter(g => g.courseId === course.id);
        if (courseGrades.length > 0) {
            const avgGradePoints = courseGrades.reduce((sum, g) => sum + (g.gradePoints || 0), 0) / courseGrades.length;
            totalPoints += avgGradePoints * (course.creditHours || 1);
            totalCredits += course.creditHours || 1;
        }
    });

    return totalCredits > 0 ? totalPoints / totalCredits : null;
}

function calculateTermGPA() {
    if (STATE.courses.length === 0) return null;

    let totalPoints = 0;
    let totalCredits = 0;

    STATE.courses.forEach(course => {
        const courseGrades = STATE.grades.filter(g => g.courseId === course.id);
        if (courseGrades.length > 0) {
            const latestGrade = courseGrades[courseGrades.length - 1];
            totalPoints += (latestGrade.gradePoints || 0) * (course.creditHours || 1);
            totalCredits += course.creditHours || 1;
        }
    });

    return totalCredits > 0 ? totalPoints / totalCredits : null;
}

function calculateAverageGrade() {
    if (STATE.grades.length === 0) return null;

    const totalGradePoints = STATE.grades.reduce((sum, g) => sum + (g.gradePoints || 0), 0);
    return totalGradePoints / STATE.grades.length;
}

function updateActivityLog() {
    const activityList = document.getElementById('activity-list');

    if (STATE.activityLog.length === 0) {
        activityList.innerHTML = '<p class="empty-state">No activity yet. Add your first course!</p>';
        return;
    }

    activityList.innerHTML = STATE.activityLog
        .slice(-5) // Show last 5 activities
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
// COURSE MANAGEMENT
// ============================================

function showAddCourse() {
    const courseName = prompt('Enter course name:');
    if (!courseName) return;

    const creditHours = prompt('Enter credit hours (default 3):') || '3';

    const course = {
        id: Date.now().toString(),
        name: courseName,
        creditHours: parseFloat(creditHours),
        createdAt: new Date().toISOString()
    };

    STATE.courses.push(course);

    // Save to localStorage
    if (STATE.deviceCapabilities.hasLocalStorage) {
        localStorage.setItem(
            CONFIG.STORAGE_KEY_PREFIX + 'courses_' + STATE.currentUser,
            JSON.stringify(STATE.courses)
        );
    }

    // Add activity
    STATE.activityLog.push({
        action: `Added course: ${courseName}`,
        timestamp: new Date().toISOString()
    });

    updateDashboard();
    renderCourses();
}

function renderCourses() {
    const coursesList = document.getElementById('courses-list');

    if (STATE.courses.length === 0) {
        coursesList.innerHTML = '<p class="empty-state">No courses yet. Add your first course!</p>';
        return;
    }

    coursesList.innerHTML = STATE.courses
        .map(course => `
            <div class="course-card">
                <div class="course-title">${course.name}</div>
                <div class="course-info">
                    <p>Credit Hours: ${course.creditHours}</p>
                    <p>Added: ${new Date(course.createdAt).toLocaleDateString()}</p>
                </div>
                <button class="btn btn-secondary" onclick="deleteCourse('${course.id}')">Delete</button>
            </div>
        `)
        .join('');
}

function deleteCourse(courseId) {
    if (confirm('Delete this course?')) {
        STATE.courses = STATE.courses.filter(c => c.id !== courseId);

        // Save to localStorage
        if (STATE.deviceCapabilities.hasLocalStorage) {
            localStorage.setItem(
                CONFIG.STORAGE_KEY_PREFIX + 'courses_' + STATE.currentUser,
                JSON.stringify(STATE.courses)
            );
        }

        STATE.activityLog.push({
            action: 'Deleted a course',
            timestamp: new Date().toISOString()
        });

        updateDashboard();
        renderCourses();
    }
}

// ============================================
// MENU MANAGEMENT
// ============================================

function toggleMenu() {
    const modal = document.getElementById('menu-modal');
    modal.classList.toggle('active');
}

function closeMenu() {
    const modal = document.getElementById('menu-modal');
    modal.classList.remove('active');
}

// ============================================
// SETTINGS
// ============================================

function showChangePIN() {
    const newPin = prompt('Enter new PIN (4 digits):');
    if (!newPin) return;

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
        alert('PIN must be 4 digits');
        return;
    }

    if (STATE.deviceCapabilities.hasLocalStorage) {
        localStorage.setItem(CONFIG.STORAGE_KEY_PREFIX + 'pin_' + STATE.currentUser, btoa(newPin));
    }

    alert('PIN changed successfully!');
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Detect device capabilities
    detectDeviceCapabilities();

    // Login screen starts with no character revealed until a name is chosen
    resetLoginVisuals();

    // Check if user is already logged in
    if (STATE.deviceCapabilities.hasLocalStorage) {
        const savedUser = localStorage.getItem(CONFIG.STORAGE_KEY_PREFIX + 'currentUser');
        if (savedUser) {
            STATE.currentUser = savedUser;
            STATE.isAuthenticated = true;
            if (window.Parallax) window.Parallax.applyTheme(savedUser);
            document.getElementById('user-greeting').textContent = `Welcome, ${savedUser.charAt(0).toUpperCase() + savedUser.slice(1)}`;
            loadUserData();
            showScreen('dashboard-screen');
        }
    }

    // Handle window resize for responsive updates
    window.addEventListener('resize', () => {
        STATE.deviceCapabilities.screenWidth = window.innerWidth;
        STATE.deviceCapabilities.screenHeight = window.innerHeight;
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('menu-modal');
        if (modal.classList.contains('active') && !modal.contains(e.target) && !e.target.classList.contains('btn-icon')) {
            closeMenu();
        }
    });

    // Handle visibility change for re-lock
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // App is hidden
        } else {
            // App is visible - could re-lock here
            // For now, just log
            console.log('App resumed');
        }
    });

    // Render initial courses list
    renderCourses();
});

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================

if ('serviceWorker' in navigator && STATE.deviceCapabilities.hasServiceWorker) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}

// ============================================
// EXPORT FOR TESTING
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STATE,
        CONFIG,
        detectDeviceCapabilities,
        calculateCGPA,
        calculateTermGPA,
        calculateAverageGrade
    };
}
