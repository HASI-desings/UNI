/**
 * PARALLAX PWA — FINAL INTEGRATED APPLICATION
 * Complete app with first-time PIN creation, real-time sync, offline support, and 3D effects
 */

import { gpaEngine } from './gpa-engine.js';
import {
  createPin,
  verifyPin,
  fetchCourses,
  fetchGrades,
  fetchActivityLog,
  fetchPersonalNotes,
  fetchQuizReminders,
  subscribeToCoursesUpdates,
  subscribeToGradesUpdates,
  subscribeToActivityLog,
  unsubscribe,
  createCourse,
  updateCourse,
  deleteCourse,
  createGrade,
  updateGrade,
  deleteGrade,
  createPersonalNote,
  updatePersonalNote,
  deletePersonalNote,
  createQuizReminder,
  deleteQuizReminder,
} from './supabase-client-complete.js';

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
  subscriptions: [],
  offlineQueue: [],
  sessionToken: null,
};

// ============================================================================
// INITIALIZATION
// ============================================================================

async function initializeApp() {
  console.log('🚀 Initializing Parallax PWA...');
  
  // Check if session exists in localStorage
  const savedSession = localStorage.getItem('parallax-session');
  
  if (savedSession) {
    try {
      const session = JSON.parse(savedSession);
      appState.user = session.user;
      appState.sessionToken = session.token;
      
      // Show app
      showScreen('app-container');
      await loadAppData();
    } catch (err) {
      console.error('❌ Session restore error:', err);
      localStorage.removeItem('parallax-session');
      showScreen('screen-login');
    }
  } else {
    // Show login screen
    showScreen('screen-login');
  }
  
  // Setup event listeners
  setupEventListeners();
  setupOnlineOfflineListeners();
  setupVisibilityChangeListener();
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
  
  try {
    console.log('🔐 Verifying PIN...');
    const response = await verifyPin(username, pin);
    
    if (response.firstTime) {
      // Show first-time PIN creation screen
      showFirstTimeSetup(username);
      return;
    }
    
    if (response.success) {
      // Create session
      appState.user = response.user;
      appState.sessionToken = response.token;
      
      // Save session
      localStorage.setItem('parallax-session', JSON.stringify({
        user: response.user,
        token: response.token,
      }));
      
      // Load data
      await loadAppData();
      
      // Show app
      showScreen('app-container');
      showToast(`Welcome back, ${response.user.user_metadata?.name}!`, 'success');
    } else {
      showError(errorDiv, response.error || 'Invalid PIN. Please try again.');
    }
  } catch (err) {
    console.error('❌ Login error:', err);
    showError(errorDiv, 'Login failed. Please try again.');
  }
}

function showFirstTimeSetup(username) {
  // Hide login form, show PIN creation form
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('first-time-setup').style.display = 'block';
  document.getElementById('setup-username').textContent = username;
  document.getElementById('setup-username-input').value = username;
}

async function handleCreatePin(e) {
  e.preventDefault();
  
  const username = document.getElementById('setup-username-input').value;
  const newPin = document.getElementById('setup-pin-input').value;
  const confirmPin = document.getElementById('setup-confirm-pin-input').value;
  const errorDiv = document.getElementById('setup-error');
  
  if (!newPin || !confirmPin) {
    showError(errorDiv, 'Please enter and confirm your PIN');
    return;
  }
  
  if (!/^\d{4}$/.test(newPin)) {
    showError(errorDiv, 'PIN must be exactly 4 digits');
    return;
  }
  
  if (newPin !== confirmPin) {
    showError(errorDiv, 'PINs do not match');
    return;
  }
  
  try {
    console.log('🔐 Creating PIN...');
    const response = await createPin(username, newPin, confirmPin);
    
    if (response.success) {
      // Create session
      appState.user = response.user;
      appState.sessionToken = response.token;
      
      // Save session
      localStorage.setItem('parallax-session', JSON.stringify({
        user: response.user,
        token: response.token,
      }));
      
      // Reset forms
      document.getElementById('login-form').style.display = 'block';
      document.getElementById('first-time-setup').style.display = 'none';
      document.getElementById('login-form').reset();
      document.getElementById('first-time-setup').reset();
      
      // Load data
      await loadAppData();
      
      // Show app
      showScreen('app-container');
      showToast(`Welcome, ${response.user.user_metadata?.name}! PIN created successfully.`, 'success');
    } else {
      showError(errorDiv, response.error || 'Failed to create PIN');
    }
  } catch (err) {
    console.error('❌ Create PIN error:', err);
    showError(errorDiv, 'Failed to create PIN. Please try again.');
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
    
    // Unsubscribe from all
    appState.subscriptions.forEach(unsub => unsub?.());
    appState.subscriptions = [];
    
    // Reset forms
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('first-time-setup').style.display = 'none';
    document.getElementById('login-form').reset();
    document.getElementById('first-time-setup').reset();
    
    showScreen('screen-login');
    showToast('Logged out successfully', 'success');
  }
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadAppData() {
  console.log('📊 Loading app data...');
  
  try {
    // Fetch data
    appState.courses = await fetchCourses();
    appState.grades = await fetchGrades();
    appState.activityLog = await fetchActivityLog();
    appState.notes = await fetchPersonalNotes();
    appState.reminders = await fetchQuizReminders();
    
    // Subscribe to real-time updates
    setupRealtimeSubscriptions();
    
    // Update UI
    updateDashboard();
    updateCoursesList();
    updateActivityFeed();
    updateNotesList();
    updateRemindersList();
    
    console.log('✅ App data loaded');
  } catch (err) {
    console.error('❌ Data loading error:', err);
    showToast('Failed to load data', 'error');
  }
}

function setupRealtimeSubscriptions() {
  // Subscribe to courses
  const coursesSub = subscribeToCoursesUpdates((payload) => {
    console.log('📡 Courses update:', payload);
    
    if (payload.eventType === 'INSERT') {
      appState.courses.push(payload.new);
      showToast(`New course added: ${payload.new.name}`, 'info');
    } else if (payload.eventType === 'UPDATE') {
      const index = appState.courses.findIndex(c => c.id === payload.new.id);
      if (index !== -1) {
        appState.courses[index] = payload.new;
        showToast(`Course updated: ${payload.new.name}`, 'info');
      }
    } else if (payload.eventType === 'DELETE') {
      appState.courses = appState.courses.filter(c => c.id !== payload.old.id);
      showToast(`Course deleted: ${payload.old.name}`, 'warning');
    }
    
    updateCoursesList();
    updateDashboard();
  });
  
  // Subscribe to grades
  const gradesSub = subscribeToGradesUpdates((payload) => {
    console.log('📡 Grades update:', payload);
    
    if (payload.eventType === 'INSERT') {
      appState.grades.push(payload.new);
      showToast(`Grade recorded: ${payload.new.letter_grade}`, 'success');
    } else if (payload.eventType === 'UPDATE') {
      const index = appState.grades.findIndex(g => g.id === payload.new.id);
      if (index !== -1) {
        appState.grades[index] = payload.new;
        showToast(`Grade updated: ${payload.new.letter_grade}`, 'info');
      }
    }
    
    updateDashboard();
    updateCoursesList();
  });
  
  // Subscribe to activity log
  const activitySub = subscribeToActivityLog((payload) => {
    console.log('📡 Activity update:', payload);
    
    if (payload.eventType === 'INSERT') {
      appState.activityLog.unshift(payload.new);
      updateActivityFeed();
    }
  });
  
  appState.subscriptions = [coursesSub, gradesSub, activitySub];
}

// ============================================================================
// UI UPDATES
// ============================================================================

function updateDashboard() {
  // Calculate GPA
  const termGPA = gpaEngine.computeTermGPA(appState.courses, appState.grades);
  const cgpa = gpaEngine.computeCGPA(appState.courses, appState.grades);
  
  // Update CGPA display
  const cgpaValue = document.querySelector('.cgpa-value');
  if (cgpaValue) {
    cgpaValue.textContent = cgpa.toFixed(2);
  }
  
  // Update stats
  const stats = document.querySelectorAll('.stat-value');
  if (stats[0]) stats[0].textContent = termGPA.toFixed(2);
  if (stats[1]) stats[1].textContent = appState.courses.length;
  if (stats[2]) stats[2].textContent = appState.reminders.length;
}

function updateCoursesList() {
  const coursesList = document.getElementById('courses-list');
  if (!coursesList) return;
  
  coursesList.innerHTML = appState.courses.map(course => `
    <div class="course-card">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <h3 style="margin: 0 0 8px 0;">${course.name}</h3>
          <p style="margin: 0; color: rgba(255, 255, 255, 0.6); font-size: 12px;">
            ${course.semester} • ${course.credit_hours} credits
          </p>
        </div>
        <button class="btn-icon" onclick="editCourse(${course.id})">
          ✎
        </button>
      </div>
    </div>
  `).join('');
}

function updateActivityFeed() {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;
  
  feed.innerHTML = appState.activityLog.slice(0, 5).map(item => `
    <div class="activity-item">
      <div style="color: rgba(255, 255, 255, 0.6); font-size: 12px;">${item.description}</div>
      <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px;">${formatTime(item.created_at)}</div>
    </div>
  `).join('');
}

function updateNotesList() {
  const notesList = document.getElementById('notes-list');
  if (!notesList) return;
  
  notesList.innerHTML = appState.notes.map(note => `
    <div class="note-item">
      <div>${note.content}</div>
      <button onclick="deleteNote(${note.id})">Delete</button>
    </div>
  `).join('');
}

function updateRemindersList() {
  const remindersList = document.getElementById('reminders-list');
  if (!remindersList) return;
  
  remindersList.innerHTML = appState.reminders.map(reminder => `
    <div class="reminder-item">
      <div>${reminder.title}</div>
      <div>${new Date(reminder.due_date).toLocaleDateString()}</div>
      <button onclick="deleteReminder(${reminder.id})">Delete</button>
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
  
  // First-time setup form
  const setupForm = document.getElementById('first-time-setup');
  if (setupForm) {
    setupForm.addEventListener('submit', handleCreatePin);
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
      // App went to background
      showLockOverlay();
    }
  });
}

// ============================================================================
// LOCK OVERLAY
// ============================================================================

function showLockOverlay() {
  const overlay = document.getElementById('lock-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
  }
}

async function handleRelock(e) {
  e.preventDefault();
  
  const pinInput = document.getElementById('relock-pin');
  const errorDiv = document.getElementById('relock-error');
  
  const pin = pinInput.value;
  
  try {
    const response = await verifyPin(appState.user.user_metadata?.name, pin);
    
    if (response.success) {
      document.getElementById('lock-overlay').classList.add('hidden');
      pinInput.value = '';
      showToast('Session unlocked', 'success');
    } else {
      showError(errorDiv, 'Invalid PIN');
    }
  } catch (err) {
    showError(errorDiv, 'Unlock failed');
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 300ms ease-out forwards';
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
// CRUD OPERATIONS (exposed to window for onclick handlers)
// ============================================================================

window.editCourse = async (id) => {
  console.log('Edit course:', id);
  // TODO: Show edit modal
};

window.deleteNote = async (id) => {
  try {
    await deletePersonalNote(id);
    appState.notes = appState.notes.filter(n => n.id !== id);
    updateNotesList();
    showToast('Note deleted', 'success');
  } catch (err) {
    showToast('Failed to delete note', 'error');
  }
};

window.deleteReminder = async (id) => {
  try {
    await deleteQuizReminder(id);
    appState.reminders = appState.reminders.filter(r => r.id !== id);
    updateRemindersList();
    showToast('Reminder deleted', 'success');
  } catch (err) {
    showToast('Failed to delete reminder', 'error');
  }
};

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
