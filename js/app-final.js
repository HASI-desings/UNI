/**
 * PARALLAX PWA — MAIN APPLICATION
 * Standalone app with first-time PIN creation, real-time sync, offline support
 */

// ============================================================================
// GLOBAL STATE
// ============================================================================

const appState = {
  user: null,
  courses: [],
  grades: [],
  activityLog: [],
  notes: [],
  reminders: [],
  isOnline: navigator.onLine,
  currentScreen: 'dashboard',
  sessionToken: null,
};

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeApp() {
  console.log('🚀 Initializing Parallax PWA...');
  
  // Check if session exists in localStorage
  const savedSession = localStorage.getItem('parallax-session');
  
  if (savedSession) {
    try {
      const session = JSON.parse(savedSession);
      appState.user = session.user;
      appState.sessionToken = session.token;
      
      // Show app
      hideLoadingScreen();
      showScreen('app-container');
      loadAppData();
    } catch (err) {
      console.error('❌ Session restore error:', err);
      localStorage.removeItem('parallax-session');
      hideLoadingScreen();
      showScreen('screen-login');
    }
  } else {
    // Show login screen
    hideLoadingScreen();
    showScreen('screen-login');
  }
  
  // Setup event listeners
  setupEventListeners();
  setupOnlineOfflineListeners();
  setupVisibilityChangeListener();
}

function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
  }
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function handleLogin(e) {
  e.preventDefault();
  
  const userSelect = document.getElementById('user-select');
  const pinInput = document.getElementById('pin-input');
  const errorDiv = document.getElementById('login-error');
  
  const username = userSelect.value;
  const pin = pinInput.value;
  
  if (!username || !pin) {
    showError(errorDiv, 'Please select a user and enter your PIN');
    return;
  }
  
  // Simulate PIN verification (in production, call Edge Function)
  console.log('🔐 Verifying PIN for:', username);
  
  // For demo: accept any 4-digit PIN
  if (!/^\d{4}$/.test(pin)) {
    showError(errorDiv, 'PIN must be 4 digits');
    return;
  }
  
  try {
    // Create session
    appState.user = {
      id: username,
      user_metadata: {
        name: username.charAt(0).toUpperCase() + username.slice(1),
      },
    };
    appState.sessionToken = 'demo-token-' + Date.now();
    
    // Save session
    localStorage.setItem('parallax-session', JSON.stringify({
      user: appState.user,
      token: appState.sessionToken,
    }));
    
    // Load data
    loadAppData();
    
    // Show app
    showScreen('app-container');
    showToast(`Welcome, ${appState.user.user_metadata.name}!`, 'success');
  } catch (err) {
    console.error('❌ Login error:', err);
    showError(errorDiv, 'Login failed. Please try again.');
  }
}

async function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    // Clear session
    localStorage.removeItem('parallax-session');
    appState.user = null;
    appState.sessionToken = null;
    appState.courses = [];
    appState.grades = [];
    appState.activityLog = [];
    
    showScreen('screen-login');
    document.getElementById('login-form').reset();
    showToast('Logged out successfully', 'success');
  }
}

// ============================================================================
// DATA LOADING
// ============================================================================

function loadAppData() {
  console.log('📊 Loading app data...');
  
  // Load demo data
  appState.courses = [
    { id: 1, name: 'Physics 101', semester: 'Fall 2024', credit_hours: 4, is_lab: false },
    { id: 2, name: 'Chemistry Lab', semester: 'Fall 2024', credit_hours: 3, is_lab: true },
    { id: 3, name: 'Calculus II', semester: 'Fall 2024', credit_hours: 4, is_lab: false },
  ];
  
  appState.grades = [
    { id: 1, course_id: 1, raw_score: 92, letter_grade: 'A', grade_points: 4.0 },
    { id: 2, course_id: 2, raw_score: 88, letter_grade: 'B+', grade_points: 3.7 },
    { id: 3, course_id: 3, raw_score: 85, letter_grade: 'B', grade_points: 3.3 },
  ];
  
  appState.activityLog = [
    { id: 1, description: 'You updated Physics 101 grade to A', created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, description: 'Hussnain updated Chemistry Lab', created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: 3, description: 'You added Calculus II course', created_at: new Date(Date.now() - 86400000).toISOString() },
  ];
  
  // Update UI
  updateDashboard();
  updateCoursesList();
  updateActivityFeed();
  
  console.log('✅ App data loaded');
}

// ============================================================================
// UI UPDATES
// ============================================================================

function updateDashboard() {
  // Calculate GPA (simplified)
  let totalGradePoints = 0;
  let totalCredits = 0;
  
  appState.courses.forEach(course => {
    const grade = appState.grades.find(g => g.course_id === course.id);
    if (grade) {
      totalGradePoints += grade.grade_points * course.credit_hours;
      totalCredits += course.credit_hours;
    }
  });
  
  const cgpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
  
  // Update CGPA display
  const cgpaValue = document.querySelector('.cgpa-value');
  if (cgpaValue) {
    cgpaValue.textContent = cgpa;
  }
  
  // Update stats
  const stats = document.querySelectorAll('.stat-value');
  if (stats[0]) stats[0].textContent = cgpa;
  if (stats[1]) stats[1].textContent = appState.courses.length;
  if (stats[2]) stats[2].textContent = '3';
}

function updateCoursesList() {
  const coursesList = document.getElementById('courses-list');
  if (!coursesList) return;
  
  coursesList.innerHTML = appState.courses.map(course => {
    const grade = appState.grades.find(g => g.course_id === course.id);
    return `
      <div class="course-card">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <h3 style="margin: 0 0 8px 0;">${course.name}</h3>
            <p style="margin: 0; color: rgba(255, 255, 255, 0.6); font-size: 12px;">
              ${course.semester} • ${course.credit_hours} credits
            </p>
            ${grade ? `<p style="margin: 8px 0 0 0; color: #00C896; font-weight: bold;">${grade.letter_grade}</p>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function updateActivityFeed() {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;
  
  feed.innerHTML = appState.activityLog.slice(0, 5).map(item => `
    <div class="activity-item">
      <div style="color: rgba(255, 255, 255, 0.8); font-size: 14px;">${item.description}</div>
      <div style="color: rgba(255, 255, 255, 0.4); font-size: 12px;">${formatTime(item.created_at)}</div>
    </div>
  `).join('');
}

// ============================================================================
// SCREEN NAVIGATION
// ============================================================================

function showScreen(screenId) {
  // Hide all screens
  document.querySelectorAll('.screen, .app-container').forEach(el => {
    el.classList.add('hidden');
  });
  
  // Show target screen
  const screen = document.getElementById(screenId);
  if (screen) {
    screen.classList.remove('hidden');
  }
}

function navigateToScreen(screenName) {
  appState.currentScreen = screenName;
  
  // Hide all content screens
  document.querySelectorAll('.content-screen').forEach(el => {
    el.classList.remove('active');
  });
  
  // Show target screen
  const screen = document.getElementById(`${screenName}-screen`);
  if (screen) {
    screen.classList.add('active');
  }
  
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.screen === screenName) {
      item.classList.add('active');
    }
  });
  
  // Close mobile drawer
  const drawer = document.getElementById('mobile-drawer');
  if (drawer) {
    drawer.classList.add('hidden');
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Logout buttons
  document.querySelectorAll('#logout-btn, #logout-btn-mobile').forEach(btn => {
    btn.addEventListener('click', handleLogout);
  });
  
  // Navigation
  document.querySelectorAll('[data-screen]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToScreen(link.dataset.screen);
    });
  });
  
  // Mobile menu toggle
  const menuToggle = document.getElementById('menu-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const drawerOverlay = document.getElementById('drawer-overlay');
  
  if (menuToggle && mobileDrawer) {
    menuToggle.addEventListener('click', () => {
      mobileDrawer.classList.toggle('hidden');
    });
  }
  
  if (drawerOverlay && mobileDrawer) {
    drawerOverlay.addEventListener('click', () => {
      mobileDrawer.classList.add('hidden');
    });
  }
}

function setupOnlineOfflineListeners() {
  window.addEventListener('online', () => {
    appState.isOnline = true;
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) syncStatus.textContent = 'Online';
    showToast('Back online', 'success');
  });
  
  window.addEventListener('offline', () => {
    appState.isOnline = false;
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) syncStatus.textContent = 'Offline';
    showToast('You are offline', 'warning');
  });
}

function setupVisibilityChangeListener() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('App went to background');
    }
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) {
    // Create container if it doesn't exist
    const newContainer = document.createElement('div');
    newContainer.id = 'toast-container';
    newContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999;';
    document.body.appendChild(newContainer);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    background: ${type === 'success' ? '#00C896' : type === 'error' ? '#FF6B6B' : '#FFA500'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    margin-bottom: 10px;
    animation: slideIn 0.3s ease-out;
  `;
  
  const container = document.getElementById('toast-container');
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showError(element, message) {
  if (element) {
    element.textContent = message;
    element.classList.remove('hidden');
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return date.toLocaleDateString();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for external access
window.parallaxApp = {
  navigateToScreen,
  showToast,
  appState,
};
