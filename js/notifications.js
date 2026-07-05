// ============================================
// NOTIFICATIONS
// Two things live here:
// 1. A themed toast component (replaces jarring native alerts for
//    lightweight confirmations).
// 2. A deadline-reminder checker that runs while the app is open and
//    surfaces a toast + OS notification (if permitted) for any activity
//    due within 24 hours that this user hasn't been reminded about yet.
//
// IMPORTANT SCOPE NOTE: this is a static PWA with no server, so it cannot
// wake up and notify a user whose browser/phone is closed — that needs a
// real push server (Web Push + VAPID keys, e.g. a Supabase Edge Function
// on a cron schedule). What's here checks and notifies whenever the app
// is opened or already running, which is the honest ceiling for a
// client-only app.
// ============================================

(function () {
    function ensureToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    function showToast(message, variant = 'default') {
        const container = ensureToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast toast--${variant}`;
        toast.textContent = message;
        container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('is-visible'));

        window.setTimeout(() => {
            toast.classList.remove('is-visible');
            window.setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    async function requestNotificationPermission() {
        if (!('Notification' in window)) return 'unsupported';
        if (Notification.permission === 'default') {
            return await Notification.requestPermission();
        }
        return Notification.permission;
    }

    function fireNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/manifest.json' });
        } else {
            showToast(`${title} — ${body}`, 'reminder');
        }
    }

    // Checks activities due within the next 24h that haven't been reminded
    // for this user yet, fires a notification/toast, and records it so it
    // doesn't repeat.
    async function checkDeadlineReminders(username, activities) {
        const now = Date.now();
        const in24h = now + 24 * 60 * 60 * 1000;

        const dueSoon = activities.filter(a => {
            const due = new Date(a.due_at).getTime();
            return due > now && due <= in24h;
        });

        for (const activity of dueSoon) {
            const alreadySent = await window.ParallaxDB.hasReminderBeenSent(activity.id, username);
            if (alreadySent) continue;

            const hoursLeft = Math.round((new Date(activity.due_at).getTime() - now) / (60 * 60 * 1000));
            fireNotification('Deadline coming up', `"${activity.title}" is due in about ${hoursLeft}h.`);
            await window.ParallaxDB.markReminderSent(activity.id, username);
        }
    }

    window.Notifications = { showToast, requestNotificationPermission, checkDeadlineReminders };
})();
